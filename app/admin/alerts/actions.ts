"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { followupProblem, recipientsFor } from "@/lib/alert-followups";
import { isAlertTopic } from "@/lib/email-alerts";
import { listAlertSignups, unsubscribeByEmail } from "@/lib/email-alerts-store";
import { sendAlertFollowup } from "@/lib/email";

export type AlertActionResult = { ok: boolean; message: string };

export async function adminUnsubscribeAlert(
  _prev: AlertActionResult | null,
  formData: FormData,
): Promise<AlertActionResult> {
  const { areas } = await currentAdmin();
  if (!mayUse(areas, "content")) return { ok: false, message: "Not allowed." };
  const email = String(formData.get("email") ?? "");
  const result = await unsubscribeByEmail(email);
  revalidatePath("/admin/alerts");
  return result.ok
    ? { ok: true, message: "Unsubscribed." }
    : { ok: false, message: result.error || "Could not unsubscribe." };
}

export async function adminSendFollowup(
  _prev: AlertActionResult | null,
  formData: FormData,
): Promise<AlertActionResult> {
  const { areas } = await currentAdmin();
  if (!mayUse(areas, "content")) return { ok: false, message: "Not allowed." };

  const topicRaw = String(formData.get("topic") ?? "");
  const input = {
    topic: topicRaw,
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    href: String(formData.get("href") ?? "").trim() || undefined,
    destinationSlug: String(formData.get("destinationSlug") ?? "").trim() || undefined,
  };
  const problem = followupProblem(input);
  if (problem) return { ok: false, message: problem };
  if (!isAlertTopic(topicRaw)) return { ok: false, message: "Choose a topic people actually signed up for." };

  const signups = await listAlertSignups(5000);
  const recipients = recipientsFor(signups, { topic: topicRaw, destinationSlug: input.destinationSlug });
  if (recipients.length === 0) {
    return { ok: false, message: "Nobody asked for that topic." };
  }

  let sent = 0;
  for (const row of recipients) {
    const ok = await sendAlertFollowup(row.email, {
      subject: input.subject,
      body: input.body,
      href: input.href,
      unsubToken: row.unsubToken,
    });
    if (ok) sent += 1;
  }
  revalidatePath("/admin/alerts");
  return {
    ok: sent > 0,
    message:
      sent === recipients.length
        ? `Sent to ${sent}.`
        : `Sent to ${sent} of ${recipients.length}. The rest could not be delivered.`,
  };
}
