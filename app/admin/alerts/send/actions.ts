"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { emailConfigStatus, sendBlastEmail } from "@/lib/email";
import { listAlertSignups } from "@/lib/email-alerts-store";
import {
  audienceFor,
  BATCH_SIZE,
  becauseLine,
  blastProblem,
  blocksProblem,
  cleanBlocks,
  type EmailBlast,
  newBlast,
  readBlastTopics,
  SEND_SPACING_MS,
  senderProblem,
  sendProblem,
  TEST_UNSUB_TOKEN,
} from "@/lib/email-blast";
import { SITE_DOMAIN } from "@/lib/features";
import {
  alreadyHandled,
  blastStoreAvailable,
  deleteBlast,
  markFailed,
  markSent,
  readBlast,
  readBlastSettings,
  writeBlast,
  writeBlastSettings,
} from "@/lib/email-blast-store";
import { CANONICAL_ORIGIN, siteOrigin } from "@/lib/seo";

export type BlastActionResult = { ok: boolean; message: string; blastId?: string };

/**
 * Every action here checks the admin area first and the switch second.
 *
 * The switch is not only a thing the screen reads to decide what to draw. A
 * form is a URL, and the only check that counts is the one made at the moment
 * something is about to happen — which for this module means at the moment mail
 * is about to leave.
 */
async function guard(): Promise<{ ok: true; who: string } | { ok: false; message: string }> {
  const { areas, identity } = await currentAdmin();
  if (!mayUse(areas, "content")) return { ok: false, message: "Not allowed." };
  if (!blastStoreAvailable()) return { ok: false, message: "The private store is not connected, so nothing can be saved or sent." };
  return { ok: true, who: identity?.how === "account" ? identity.email : "the shared password" };
}

/* ---- the switch --------------------------------------------------------- */

export async function setBlastOpenAction(
  _prev: BlastActionResult | null,
  formData: FormData,
): Promise<BlastActionResult> {
  const check = await guard();
  if (!check.ok) return { ok: false, message: check.message };
  const open = String(formData.get("open") ?? "") === "on";
  // The switch alone. The sender is left exactly as it was, so turning sending
  // off and on again does not quietly move which address the mail comes from.
  const current = await readBlastSettings();
  if (!(await writeBlastSettings({ open, fromEmail: current.fromEmail }, check.who))) {
    return { ok: false, message: "That could not be saved." };
  }
  revalidatePath("/admin/alerts/send");
  return {
    ok: true,
    message: open
      ? "Sending is on. Nothing goes out until you press send on a message."
      : "Sending is off. Messages can still be written and saved; none can leave.",
  };
}

/**
 * Which address the updates come from.
 *
 * Refused here if it is not on the verified domain, because mail sent as
 * anything else is refused by Resend in the good case and silently binned by
 * the receiving server in the bad one.
 */
export async function setBlastSenderAction(
  _prev: BlastActionResult | null,
  formData: FormData,
): Promise<BlastActionResult> {
  const check = await guard();
  if (!check.ok) return { ok: false, message: check.message };
  const fromEmail = String(formData.get("fromEmail") ?? "").trim();
  const problem = senderProblem(fromEmail, SITE_DOMAIN);
  if (problem) return { ok: false, message: problem };
  const current = await readBlastSettings();
  if (!(await writeBlastSettings({ open: current.open, fromEmail }, check.who))) {
    return { ok: false, message: "That could not be saved." };
  }
  revalidatePath("/admin/alerts/send");
  return {
    ok: true,
    message: fromEmail
      ? `Updates will come from ${fromEmail}, and replies will go there too.`
      : "Updates will come from the site's usual sending address.",
  };
}

/* ---- writing one -------------------------------------------------------- */

export async function saveBlastAction(_prev: BlastActionResult | null, formData: FormData): Promise<BlastActionResult> {
  const check = await guard();
  if (!check.ok) return { ok: false, message: check.message };

  const subject = String(formData.get("subject") ?? "");
  const topics = readBlastTopics(formData.getAll("topics").map(String));
  // The blocks arrive as JSON in one hidden field. A stack of pieces with
  // pictures in it does not fit the flat name/value shape a form posts, and
  // inventing "block-3-caption" field names would be a second encoding to keep
  // in step with the first.
  let blocks: ReturnType<typeof cleanBlocks> = [];
  try {
    blocks = cleanBlocks(JSON.parse(String(formData.get("blocks") ?? "[]")));
  } catch {
    return { ok: false, message: "The message could not be read. Reload the page and try again." };
  }
  const problem = blastProblem({ subject, topics }) ?? blocksProblem(blocks);
  if (problem) return { ok: false, message: problem };

  const existingId = String(formData.get("blastId") ?? "").trim();
  const existing = existingId ? await readBlast(existingId) : null;

  // A message that has started going out is not edited. Half the list would
  // have the old words and half the new ones, and nothing on the screen could
  // tell you which was which.
  if (existing && existing.state !== "draft") {
    return { ok: false, message: "This one has already started going out, so it cannot be changed. Write a new one." };
  }

  const blast: EmailBlast = existing
    ? { ...existing, subject: subject.trim(), blocks, body: "", topics }
    : {
        ...newBlast({ id: `b-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`, subject, body: "", topics, by: check.who }),
        blocks,
      };

  if (!(await writeBlast(blast))) return { ok: false, message: "That could not be saved." };
  revalidatePath("/admin/alerts/send");
  return { ok: true, message: "Saved. Nothing has been sent.", blastId: blast.id };
}

export async function deleteBlastAction(_prev: BlastActionResult | null, formData: FormData): Promise<BlastActionResult> {
  const check = await guard();
  if (!check.ok) return { ok: false, message: check.message };
  const id = String(formData.get("blastId") ?? "").trim();
  if (!id) return { ok: false, message: "Nothing to delete." };
  await deleteBlast(id);
  revalidatePath("/admin/alerts/send");
  return { ok: true, message: "Deleted." };
}

/* ---- trying it on yourself --------------------------------------------- */

/**
 * One copy, to the owner's own inbox, exactly as the list would get it.
 *
 * The same function that sends the real thing, with the same footer and the
 * same unsubscribe link — because a preview that renders differently from the
 * real message is a preview of nothing. It does not touch the sent list, so it
 * can be pressed as many times as it takes to get the wording right.
 */
export async function testBlastAction(_prev: BlastActionResult | null, formData: FormData): Promise<BlastActionResult> {
  const check = await guard();
  if (!check.ok) return { ok: false, message: check.message };

  const blast = await readBlast(String(formData.get("blastId") ?? "").trim());
  if (!blast) return { ok: false, message: "Save it first." };

  const status = await emailConfigStatus();
  if (!status.apiKeySet) return { ok: false, message: "Resend is not connected, so nothing can be sent." };

  const to = status.editsInbox;
  const origin = siteOrigin()?.origin || CANONICAL_ORIGIN;
  const result = await sendBlastEmail({
    to,
    subject: `[test] ${blast.subject}`,
    from: (await readBlastSettings()).fromEmail,
    blast,
    origin,
    // Harmless, and honest about being harmless. The route recognises this
    // sentinel and shows the real page with a line saying it was a test —
    // rather than the "not valid" error a made-up token produced, which reads
    // as a fault in the one part of the email that has to work.
    unsubscribeUrl: `${origin}/api/alerts/unsubscribe?token=${TEST_UNSUB_TOKEN}`,
    becauseLine: becauseLine(blast.topics),
  });
  return result.ok
    ? { ok: true, message: `Sent to ${to}. It may take a minute.` }
    : { ok: false, message: result.error || "That could not be sent." };
}

/* ---- sending it --------------------------------------------------------- */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One batch.
 *
 * READS THE LIST FRESH EVERY TIME. Somebody may have unsubscribed between the
 * owner reading the number on the screen and pressing the button, and the list
 * as it is at this instant is the only one that may be written to.
 *
 * RECORDS EACH ADDRESS THE MOMENT IT IS ACCEPTED. If this function is killed on
 * its timeout, everything it managed is already written down and the next press
 * carries on from there. Nobody gets it twice.
 */
export async function sendBlastAction(_prev: BlastActionResult | null, formData: FormData): Promise<BlastActionResult> {
  const check = await guard();
  if (!check.ok) return { ok: false, message: check.message };

  const id = String(formData.get("blastId") ?? "").trim();
  const blast = await readBlast(id);
  if (!blast) return { ok: false, message: "That message is not there any more." };

  const [settings, signups, status, handled] = await Promise.all([
    readBlastSettings(),
    listAlertSignups(5000),
    emailConfigStatus(),
    alreadyHandled(id),
  ]);

  const audience = audienceFor(signups, blast.topics);
  const stop = sendProblem({
    settings,
    blast,
    audienceSize: audience.length,
    deliveryReady: { apiKeySet: status.apiKeySet, usingTestSender: status.usingTestSender },
  });
  if (stop) return { ok: false, message: stop };

  const waiting = audience.filter((signup) => !handled.has(signup.email.toLowerCase()));
  if (waiting.length === 0) {
    if (blast.state !== "sent") {
      await writeBlast({ ...blast, state: "sent", lastSentAt: new Date().toISOString() });
      revalidatePath("/admin/alerts/send");
    }
    return { ok: true, message: `Everybody on this list has had it — ${blast.sentCount} sent.` };
  }

  const origin = siteOrigin()?.origin || CANONICAL_ORIGIN;
  const batch = waiting.slice(0, BATCH_SIZE);
  const line = becauseLine(blast.topics);
  let sent = 0;
  let failed = 0;
  let lastError = "";

  for (const [index, signup] of batch.entries()) {
    // Paced between messages, not before the first one — Resend's allowance is
    // a rate, and the owner is sitting waiting for this.
    if (index > 0) await wait(SEND_SPACING_MS);
    const result = await sendBlastEmail({
      to: signup.email,
      subject: blast.subject,
      from: settings.fromEmail,
      blast,
      origin,
      unsubscribeUrl: `${origin}/api/alerts/unsubscribe?token=${encodeURIComponent(signup.unsubToken)}`,
      becauseLine: line,
    });
    if (result.ok) {
      sent += 1;
      await markSent(id, signup.email);
    } else {
      failed += 1;
      lastError = result.error || "refused";
      // Recorded as handled so it is not retried on every press for ever. The
      // address stays on the alert list; it simply does not get this message.
      await markFailed(id, signup.email);
    }
  }

  const remaining = waiting.length - batch.length;
  const next: EmailBlast = {
    ...blast,
    state: remaining > 0 ? "sending" : "sent",
    sentCount: blast.sentCount + sent,
    failedCount: blast.failedCount + failed,
    lastSentAt: new Date().toISOString(),
    lastError: lastError || blast.lastError,
  };
  await writeBlast(next);
  revalidatePath("/admin/alerts/send");

  if (remaining > 0) {
    return {
      ok: true,
      message: `${next.sentCount} sent so far${failed > 0 ? `, ${failed} refused in this batch` : ""}. ${remaining} to go — press send again.`,
    };
  }
  return {
    ok: true,
    message: `Finished. ${next.sentCount} sent${next.failedCount > 0 ? `, ${next.failedCount} refused` : ""}.`,
  };
}
