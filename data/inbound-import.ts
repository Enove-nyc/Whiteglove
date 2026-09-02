/**
 * FORWARD A CONFIRMATION AND IT LANDS ON YOUR TRIP.
 *
 * The importer could already read a confirmation you PASTED or ATTACHED — the
 * airline's PDF, a screenshot, a photo of a printed voucher. What it could not
 * do is take one you simply forwarded, which is what everybody's confirmations
 * actually arrive as. This is that half.
 *
 * EACH ACCOUNT GETS ITS OWN ADDRESS, and that is the security design, not a
 * convenience. Routing on the From header would mean anybody who knows your
 * email address can put rows on your trip: From is trivially forged and is not
 * a credential. The address itself is the credential — a random token nobody
 * can guess, which the owner can rotate if it ever leaks.
 *
 * NOTHING IS ADDED WITHOUT REVIEW. A forwarded email becomes a PENDING import
 * waiting on the trip, opened in the same review screen a pasted confirmation
 * opens, and the planner keeps or discards each row. That rule is the owner's
 * own — "never automatically save imported information without review" — and it
 * matters more here than anywhere else, because this is the one path where
 * something arrives that nobody was looking at when it did.
 *
 * Pure: the address format and what may be read out of an inbound message can
 * be tested without a mail provider.
 */

/** The mailbox everything is forwarded to. The token after "+" is the account. */
export const INBOUND_MAILBOX = "trips";

/** Random, unguessable, and rotatable. Long enough not to be brute-forced. */
export const TOKEN_LENGTH = 16;

/** The address to give one account, on one brand's domain. */
export function inboundAddress(token: string, domain: string): string {
  return token ? `${INBOUND_MAILBOX}+${token}@${domain}` : "";
}

/**
 * The token out of whatever the provider says the message was sent to.
 *
 * Deliberately forgiving about the shape of the header — "To" can arrive as
 * `Name <trips+abc@domain>`, as a bare address, or as several separated by
 * commas when somebody forwarded to more than one place. It is deliberately
 * strict about the token: anything that is not the exact character set is not
 * a token, so a near-miss routes nowhere rather than to somebody else.
 */
export function tokenFromRecipients(recipients: readonly string[]): string {
  for (const raw of recipients) {
    for (const part of String(raw ?? "").split(",")) {
      const match = /(?:^|<|\s)trips\+([A-Za-z0-9_-]{8,64})@/.exec(part);
      if (match) return match[1];
    }
  }
  return "";
}

/** What one forwarded message turned into, before anybody has looked at it. */
export type PendingImport = {
  id: string;
  /** When it arrived, ISO. */
  at: string;
  /** The email's subject, so the planner knows what they are opening. */
  subject: string;
  /** Who it came from, shown only so a stranger's message is obvious. */
  from: string;
  /** The rows the extractor read out, awaiting review. */
  items: unknown[];
  /** Anything the extractor could not read confidently. */
  warnings: string[];
};

/** More than this waiting means something is wrong, not that somebody is busy. */
export const MAX_PENDING = 20;

/** Kept short: this is a queue to clear, not a mailbox to live in. */
export const PENDING_KEEP_DAYS = 30;

export function isStale(entry: PendingImport, now: string): boolean {
  const at = Date.parse(entry.at);
  const then = Date.parse(now);
  if (Number.isNaN(at) || Number.isNaN(then)) return false;
  return then - at > PENDING_KEEP_DAYS * 24 * 60 * 60 * 1000;
}

/** Newest first, stale ones dropped. What the planner is shown. */
export function pendingToShow(entries: readonly PendingImport[], now: string): PendingImport[] {
  return entries
    .filter((entry) => !isStale(entry, now))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_PENDING);
}

/** How the builder says there is something waiting. Never a number nobody asked for. */
export function waitingLine(count: number): string {
  if (count <= 0) return "";
  return count === 1 ? "1 forwarded confirmation is waiting to be checked" : `${count} forwarded confirmations are waiting to be checked`;
}
