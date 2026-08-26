/**
 * What was said to the assistant, kept for the person who said it.
 *
 * ONLY FOR SIGNED-IN TRAVELERS, AND ONLY ON THE SERVER. The rule everywhere
 * else on this site is that nothing personal is kept in the browser — an
 * itinerary belongs to an account or to nobody — and a conversation is more
 * personal than an itinerary, not less. Somebody asks the assistant where
 * their family is going, when, and what they can eat. Signed out, that is
 * answered and forgotten; there is no local copy and nothing to leak from a
 * shared machine.
 *
 * ONE CONVERSATION, NOT A HISTORY. This is a panel in the corner of a page,
 * not an inbox. What it needs to do is survive a reload and still be there
 * tomorrow, which one running thread does. A list of past conversations would
 * be a screen to manage, name and delete, and nobody asked for one.
 *
 * IT IS TRIMMED, AND THAT IS THE FEATURE. Twenty turns is more than anybody
 * scrolls back through, and an unbounded thread is an unbounded thing to store
 * about a person for as long as they hold an account.
 */

export type AssistantTurn = {
  /** Who said it. */
  role: "traveler" | "assistant";
  text: string;
  /** ISO. Stamped by the server, never by the browser. */
  at: string;
  /** Pages the answer was drawn from. Only ever on an assistant turn. */
  sources?: Array<{ title: string; href: string }>;
  /** True when the site had nothing and the traveler was handed over. */
  notCovered?: boolean;
  /**
   * The place the answer was read in the light of — the page they were on when
   * they asked, when the site knows that place. Shown so a Vienna-flavoured
   * answer explains itself rather than looking like a guess about where they
   * are. Only ever on an assistant turn.
   */
  about?: string;
};

export type AssistantConversation = { turns: AssistantTurn[]; updatedAt: string };

/** How many turns are kept. Older ones fall off the front. */
export const MAX_TURNS = 20;
const MAX_TEXT = 4000;

export function emptyConversation(): AssistantConversation {
  return { turns: [], updatedAt: new Date(0).toISOString() };
}

/**
 * Read whatever was stored into a shape the page can trust.
 *
 * Written defensively because this comes back out of a store: a turn with no
 * text, a role nobody recognises, or a sources array full of junk must not
 * reach a page, and none of them is worth throwing away the conversation for.
 */
export function readConversation(value: unknown): AssistantConversation {
  const raw = (value ?? {}) as { turns?: unknown; updatedAt?: unknown };
  const turns = Array.isArray(raw.turns) ? raw.turns : [];
  const clean: AssistantTurn[] = [];
  for (const item of turns) {
    const turn = (item ?? {}) as Partial<AssistantTurn>;
    const text = typeof turn.text === "string" ? turn.text.slice(0, MAX_TEXT).trim() : "";
    if (!text) continue;
    if (turn.role !== "traveler" && turn.role !== "assistant") continue;
    const sources = Array.isArray(turn.sources)
      ? turn.sources
          .filter(
            (s): s is { title: string; href: string } =>
              Boolean(s) && typeof s === "object" &&
              typeof (s as { href?: unknown }).href === "string" &&
              (s as { href: string }).href.startsWith("/") &&
              typeof (s as { title?: unknown }).title === "string",
          )
          .slice(0, 8)
      : undefined;
    clean.push({
      role: turn.role,
      text,
      at: typeof turn.at === "string" ? turn.at : new Date().toISOString(),
      ...(sources?.length ? { sources } : {}),
      ...(turn.notCovered === true ? { notCovered: true as const } : {}),
      // Trimmed like the text: a stored conversation is read back onto a page,
      // and a place name of unbounded length is a place name nobody wrote.
      ...(typeof turn.about === "string" && turn.about.trim()
        ? { about: turn.about.trim().slice(0, 120) }
        : {}),
    });
  }
  return {
    turns: clean.slice(-MAX_TURNS),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
  };
}

/** Add turns to a conversation, trimming the front. */
export function withTurns(
  conversation: AssistantConversation,
  added: AssistantTurn[],
  now = new Date().toISOString(),
): AssistantConversation {
  return { turns: [...conversation.turns, ...added].slice(-MAX_TURNS), updatedAt: now };
}
