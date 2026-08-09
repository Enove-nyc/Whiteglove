/**
 * Turning the things visitors send in into cards on the owner's Trello board.
 *
 * WHY ONE WAY AND NOT TWO. The obvious idea is to sync: move a card to Done and
 * have the site mark the thing handled. Do not. The moment both sides can say
 * "done", they disagree — a picture published here and a card still sitting in
 * To Do, or a card dragged to Done by somebody who never opened the site — and
 * neither can be trusted afterwards. So the site stays the one place a thing is
 * really handled, and a card is a NOTICE with a link back to the screen that
 * handles it. Nothing read from Trello, ever.
 *
 * WHY IT MUST NEVER BREAK ANYTHING. A visitor sending a photograph does not
 * care whether the owner uses Trello. Every send is fire-and-forget: a wrong
 * key, an expired token, a deleted list or Trello being down costs a card and
 * nothing else. The queue on /admin is still the truth, and it is still there.
 *
 * WHAT GOES ON THE CARD is deliberately thin. A name, a line or two, and a link
 * — not the message, not the photograph, not somebody's email address. A Trello
 * board is shared with a team and often with people outside it, and things
 * visitors send this site in confidence should not be copied somewhere the
 * owner cannot take them back from.
 */

/** The queues that can raise a card. */
export type CardKind = "photo" | "suggestion" | "listing" | "plan" | "report" | "contact";

export type KindInfo = {
  kind: CardKind;
  /** What it is called on the card and on the settings screen. */
  label: string;
  /** Where in the admin it is actually dealt with. */
  href: string;
  /** Why somebody would want a card for it. */
  why: string;
};

export const CARD_KINDS: readonly KindInfo[] = [
  { kind: "photo", label: "A picture sent in", href: "/admin/photos", why: "It is on no page until you confirm it, and the sender is waiting." },
  { kind: "suggestion", label: "A suggested correction", href: "/admin/reports", why: "Somebody found something wrong and took the trouble to say so." },
  { kind: "listing", label: "A business asking to be listed", href: "/admin/directory-listings", why: "A directory entry nobody has looked at yet." },
  { kind: "plan", label: "A Pro or Business request", href: "/admin/accounts", why: "A person waiting on an answer from you. Nothing is charged either way." },
  { kind: "report", label: "Something reported as wrong", href: "/admin/reports", why: "The quickest signal that a page has gone stale." },
  { kind: "contact", label: "A message through the contact form", href: "/admin", why: "These already come by email; a card is for when you would rather work from the board." },
];

export function kindInfo(kind: CardKind): KindInfo {
  // Non-null by construction: CARD_KINDS covers the union.
  return CARD_KINDS.find((k) => k.kind === kind)!;
}

export type TrelloSettings = {
  /** From trello.com/power-ups/admin. */
  key: string;
  /** The token generated against that key. */
  token: string;
  /** The list new cards land in — usually "To do". */
  listId: string;
  /** Which queues raise a card. Empty means none, and the screen says so. */
  kinds: CardKind[];
};

export const NO_TRELLO: TrelloSettings = { key: "", token: "", listId: "", kinds: [] };

/* ---- what a usable setting looks like ----------------------------------- */

/** A Trello key, token and list id are all hex-ish ids. */
const ID = /^[A-Za-z0-9]{8,}$/;

export function keyProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:/i.test(v)) return "That is a link. The key is the short code on your Trello developer page.";
  if (!ID.test(v)) return "A Trello API key is letters and numbers only.";
  return null;
}

export function tokenProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:/i.test(v)) return "That is a link. Copy just the token out of it.";
  if (!ID.test(v)) return "A Trello token is letters and numbers only.";
  // A token is long. A key pasted into the token box is the likely mistake, and
  // it fails at Trello with an unhelpful message.
  if (v.length < 32) return "That looks like the API key rather than the token — a token is much longer.";
  return null;
}

export function listProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:/i.test(v)) {
    return "That is a board link, not a list ID. Open the list's menu in Trello and copy its ID, or add .json to the board address and find the list there.";
  }
  if (!ID.test(v)) return "A Trello list ID is letters and numbers only.";
  return null;
}

/** The first thing wrong with these settings, or null. */
export function settingsProblem(settings: TrelloSettings): string | null {
  for (const [value, check, name] of [
    [settings.key, keyProblem, "API key"],
    [settings.token, tokenProblem, "Token"],
    [settings.listId, listProblem, "List ID"],
  ] as const) {
    const problem = check(value);
    if (problem) return `${name}: ${problem}`;
  }
  // All three or none. Two out of three cannot send anything and would sit
  // there looking configured.
  const filled = [settings.key, settings.token, settings.listId].filter((v) => v.trim()).length;
  if (filled > 0 && filled < 3) {
    return "All three are needed before any card can be sent — the key, the token and the list ID.";
  }
  if (filled === 3 && settings.kinds.length === 0) {
    return "Nothing is chosen to send, so no card would ever be created. Tick at least one, or clear the three boxes above.";
  }
  return null;
}

/** Whether cards will actually be sent. */
export function trelloIsOn(settings: TrelloSettings | undefined): boolean {
  if (!settings) return false;
  if (settingsProblem(settings)) return false;
  return Boolean(settings.key.trim() && settings.token.trim() && settings.listId.trim() && settings.kinds.length > 0);
}

/** Whether this particular queue raises a card. */
export function sendsCardFor(settings: TrelloSettings | undefined, kind: CardKind): boolean {
  return trelloIsOn(settings) && (settings?.kinds ?? []).includes(kind);
}

/* ---- the card ----------------------------------------------------------- */

export type CardDraft = {
  name: string;
  desc: string;
};

/** The most a card's description should carry. Trello allows far more. */
const MAX_DESC = 600;

/**
 * What the card says.
 *
 * DELIBERATELY THIN. A name, a line, and a link to the screen that handles it.
 * Not the message, not the photograph, not somebody's email address — a board
 * is shared, often outside the team, and what a visitor sends this site in
 * confidence must not be copied somewhere the owner cannot take it back from.
 *
 * `about` is a short public-safe label — a town name, a business name — and the
 * caller is responsible for it holding nothing private.
 */
export function cardFor(input: { kind: CardKind; about?: string; siteUrl?: string }): CardDraft {
  const info = kindInfo(input.kind);
  const about = (input.about ?? "").trim().slice(0, 80);
  const where = input.siteUrl ? new URL(info.href, input.siteUrl).toString() : info.href;
  const desc = [
    info.why,
    "",
    `Handle it here: ${where}`,
    "",
    "Sent by the White Glove website. Marking this card done does not change anything on the site — the site is where it is really handled.",
  ]
    .join("\n")
    .slice(0, MAX_DESC);
  return { name: about ? `${info.label} — ${about}` : info.label, desc };
}

/** The address to POST a card to. Credentials go in the query string, per Trello. */
export function cardUrl(settings: TrelloSettings, card: CardDraft): string {
  const query = new URLSearchParams({
    idList: settings.listId.trim(),
    key: settings.key.trim(),
    token: settings.token.trim(),
    name: card.name,
    desc: card.desc,
    // Newest at the top: a queue is read from the top and the oldest thing
    // waiting is not the most useful one to see first.
    pos: "top",
  });
  return `https://api.trello.com/1/cards?${query.toString()}`;
}

/** What is happening right now, in one sentence. Never null. */
export function describeTrello(settings: TrelloSettings): string {
  const problem = settingsProblem(settings);
  if (problem) return `Not sending — ${problem}`;
  if (!trelloIsOn(settings)) {
    return "Not connected. Everything still arrives on the admin screens; nothing is being copied to a board.";
  }
  const names = settings.kinds.map((k) => kindInfo(k).label.toLowerCase());
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `A card is created for ${list}. Cards are a notice only — nothing is ever read back from Trello.`;
}

/**
 * What to say about a send that failed.
 *
 * Trello's own messages are short and unhelpful ("invalid id"), so the common
 * causes are named instead. Nothing here ever reaches a visitor — a failed card
 * is the owner's problem, not theirs.
 */
export function describeSendFailure(status: number): string {
  if (status === 401) return "Trello refused the key or the token. Generate a new token and paste it again.";
  if (status === 400 || status === 404) return "Trello could not find that list. Check the list ID — a board ID will not work.";
  if (status === 429) return "Trello is rate-limiting this site. The card was not created; the item is still on the admin screen.";
  return `Trello answered ${status}. The card was not created; the item is still on the admin screen.`;
}
