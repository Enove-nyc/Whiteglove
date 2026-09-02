import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { tokenFromRecipients, type PendingImport } from "@/data/inbound-import";
import { readImportDataUrl } from "@/data/smart-import-files";
import { accountForToken, addPending, inboundStoreAvailable } from "@/lib/inbound-import-store";
import { extractSmartImport } from "@/lib/smart-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * A FORWARDED CONFIRMATION, ARRIVING BY EMAIL.
 *
 * The mail provider parses the message and posts it here. What happens next is
 * exactly what happens when somebody pastes a confirmation into the planner —
 * the same extractor, the same rules, the same review screen — except that it
 * lands on a queue instead of on the screen, because nobody was looking when
 * it arrived.
 *
 * NOTHING IS EVER WRITTEN TO A TRIP HERE. This route cannot add a row: it
 * reads, and it queues. That is the owner's standing rule — never save an
 * imported detail without review — and it matters most on this path, since a
 * forged or mistaken message would otherwise edit somebody's itinerary while
 * they slept.
 *
 * IT TRUSTS THE ADDRESS, NEVER THE SENDER. Routing on From would let anybody
 * who knows an email address put rows on that account's trip; From is not a
 * credential and is trivial to forge. The unguessable token in the recipient
 * address is the credential, and the owner can rotate it.
 *
 * AND IT VERIFIES THE PROVIDER'S SIGNATURE FIRST. Without that, this URL is an
 * open door: anybody who learns a token could post to it directly. An
 * unsigned deployment refuses everything rather than accepting anything, so a
 * missing secret fails closed.
 */

const MAX_BODY_BYTES = 2 * 1024 * 1024;
/** A confirmation, not a photo album. Extra attachments are ignored, not read. */
const MAX_ATTACHMENTS = 3;

function signatureOk(raw: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  // Compare every candidate in constant time — the header may carry more than
  // one signature during a secret rotation.
  return header
    .split(",")
    .map((part) => part.split("=").pop()?.trim() ?? "")
    .some((candidate) => {
      if (candidate.length !== expected.length) return false;
      try {
        return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
      } catch {
        return false;
      }
    });
}

type InboundMessage = {
  to?: unknown;
  subject?: unknown;
  from?: unknown;
  text?: unknown;
  attachments?: unknown;
};

export async function POST(request: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET?.trim();
  if (!secret) {
    // Not configured is not the same as forged, and it is the owner's problem
    // rather than the sender's — so it is loud in the log and closed to the world.
    console.error("[inbound] a message arrived but INBOUND_EMAIL_SECRET is not set.");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }
  if (!inboundStoreAvailable()) {
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "That message is too large." }, { status: 413 });
  }
  if (!signatureOk(raw, request.headers.get("webhook-signature") ?? request.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  let message: InboundMessage;
  try {
    message = JSON.parse(raw) as InboundMessage;
  } catch {
    return NextResponse.json({ error: "Unreadable message." }, { status: 400 });
  }

  const recipients = Array.isArray(message.to) ? message.to.map(String) : [String(message.to ?? "")];
  const token = tokenFromRecipients(recipients);
  const account = token ? await accountForToken(token) : "";
  if (!account) {
    // Answered 200 on purpose: a provider retries anything else for days, and
    // a message to an address nobody owns is not a failure to retry.
    console.warn("[inbound] a message arrived for an address with no account behind it.");
    return NextResponse.json({ received: true });
  }

  const text = typeof message.text === "string" ? message.text.slice(0, 12_000) : "";
  const attachments = Array.isArray(message.attachments) ? message.attachments.slice(0, MAX_ATTACHMENTS) : [];

  // The attachment first when there is one — a forwarded confirmation's PDF is
  // the document itself, and the email body around it is usually "FYI".
  let file;
  for (const item of attachments) {
    const dataUrl = (item as { dataUrl?: unknown })?.dataUrl;
    if (typeof dataUrl !== "string") continue;
    const read = readImportDataUrl(dataUrl);
    if ("file" in read) {
      file = read.file;
      break;
    }
  }

  if (!text && !file) return NextResponse.json({ received: true });

  const result = await extractSmartImport({ text: text || undefined, file });
  if (result.items.length === 0 && result.warnings.length === 0) {
    // Nothing readable in it. Queuing an empty row would only be something for
    // the planner to dismiss.
    return NextResponse.json({ received: true });
  }

  const entry: PendingImport = {
    id: randomBytes(9).toString("base64url"),
    at: new Date().toISOString(),
    subject: typeof message.subject === "string" ? message.subject.slice(0, 200) : "",
    from: typeof message.from === "string" ? message.from.slice(0, 200) : "",
    items: result.items,
    warnings: result.warnings,
  };
  await addPending(account, entry);
  return NextResponse.json({ received: true });
}
