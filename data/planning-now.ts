/**
 * WHAT PEOPLE ARE PLANNING RIGHT NOW — three chips, and then it is gone.
 *
 * A traveller arriving in October is thinking about Pesach; one arriving in
 * May is thinking about the summer. The site knew none of that: it opened on a
 * search box and six category cards that read the same on every day of the
 * year. This is the smallest thing that fixes it — a row of at most three
 * short labels, each opening a destination list the site ALREADY HAS.
 *
 * IT CREATES NOTHING. A chip is a label and an existing URL. There is no
 * programme, no price, no availability, no article, no separate seasonal
 * database, and no result count — a count that is wrong once is worse than no
 * count at all, and these lists change underneath. If a chip has nowhere real
 * to point, it should not exist.
 *
 * EVERY CHIP EXPIRES, and that is not optional. The failure this exists to
 * prevent is "Pesach 2027" still sitting on the homepage in June 2027, which
 * teaches a reader that nothing here is current. So `endsOn` is required, a
 * chip stops showing the moment it passes, and nobody has to remember to tidy
 * it. Nothing is deleted when it lapses — the owner will want the same chip
 * back next winter.
 *
 * THREE, NOT A CAROUSEL. The row is secondary to the search above it. Past
 * three, it stops being a hint about the season and becomes a menu competing
 * with the one below it, and on a phone it would scroll sideways — which is
 * how a homepage acquires a carousel nobody asked for.
 *
 * A data file: lib/ may read data/ and data/ never reads lib/. Everything here
 * is pure, so what a visitor sees can be tested without a store or a clock.
 */

/** At most this many show. The rest wait for their turn or their season. */
export const MAX_CHIPS = 3;

/** Long enough for "Pesach 2027", short enough to stay on one line on a phone. */
export const MAX_LABEL_CHARS = 24;

/**
 * A small icon, chosen from the set the site already draws rather than typed
 * in. Optional — most chips read better as words alone, and an icon that has
 * to be explained is worse than none.
 */
export const CHIP_ICONS = ["sun", "snow", "plane", "bed", "map-pin", "star", "suitcase"] as const;
export type ChipIcon = (typeof CHIP_ICONS)[number];

export function isChipIcon(value: unknown): value is ChipIcon {
  return typeof value === "string" && (CHIP_ICONS as readonly string[]).includes(value);
}

export type PlanningChip = {
  id: string;
  /** "Winter sun", "Pesach 2027", "Summer Alps". */
  label: string;
  /** An existing destination list, directory or filtered search on this site. */
  href: string;
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD, inclusive
  /** Higher shows first. Ties fall back to whichever ends soonest. */
  priority: number;
  /** Off means it never shows, whatever the dates say. */
  enabled: boolean;
  icon?: ChipIcon;
  updatedAt: string;
};

export type PlanningChipDraft = Omit<PlanningChip, "id" | "updatedAt">;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * WHERE A CHIP MAY POINT.
 *
 * Somewhere on this site that already lists things, and nowhere else. Not an
 * external site — a chip on the homepage reads as the site's own shelf, and
 * sending somebody off it under that promise is a different thing from an
 * outbound link they chose. Not a protocol-relative "//host" either, which
 * looks internal and is not.
 */
export function chipHrefProblem(href: string): string | null {
  const value = href.trim();
  if (!value) return "Say where the chip goes — an existing list on this site.";
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "Point it at a page on this site, starting with a slash — not another website.";
  }
  return null;
}

/** The first problem, not a list of them — the owner fixes one thing at a time. */
export function chipProblem(chip: PlanningChipDraft): string | null {
  const label = chip.label.trim();
  if (!label) return "Give it a label — two or three words a traveller would recognise.";
  if (label.length > MAX_LABEL_CHARS) return `Keep the label under ${MAX_LABEL_CHARS} characters so it fits on a phone.`;
  const href = chipHrefProblem(chip.href);
  if (href) return href;
  if (!DATE.test(chip.startsOn)) return "Set the date it starts showing.";
  if (!DATE.test(chip.endsOn)) return "Set the date it stops showing. Every chip needs one.";
  if (chip.endsOn < chip.startsOn) return "It cannot stop before it starts.";
  return null;
}

/** True while today falls inside the window. YYYY-MM-DD sorts correctly as a string. */
export function isShowing(chip: PlanningChip, today: string): boolean {
  return chip.enabled && chip.startsOn <= today && today <= chip.endsOn;
}

/** True once it has lapsed — shown to the owner, never to a visitor. */
export function hasLapsed(chip: PlanningChip, today: string): boolean {
  return chip.endsOn < today;
}

/**
 * What the homepage shows, right now.
 *
 * Two gates and a cap: switched on, inside its own window, and no more than
 * three. A chip whose season has passed drops out here with nobody tidying
 * anything. An empty result means the row is not rendered at all — see
 * components/PlanningNowRow.tsx, which must leave no gap behind.
 */
export function planningNow(chips: readonly PlanningChip[], today: string): PlanningChip[] {
  return [...chips]
    .filter((chip) => isShowing(chip, today))
    .sort((a, b) => b.priority - a.priority || a.endsOn.localeCompare(b.endsOn) || a.label.localeCompare(b.label))
    .slice(0, MAX_CHIPS);
}

/** Showing first, then waiting for their season, then lapsed. */
export function sortForAdmin(chips: readonly PlanningChip[], today: string): PlanningChip[] {
  const rank = (c: PlanningChip) => (isShowing(c, today) ? 0 : hasLapsed(c, today) ? 2 : 1);
  return [...chips].sort(
    (a, b) => rank(a) - rank(b) || b.priority - a.priority || a.endsOn.localeCompare(b.endsOn),
  );
}

/** What the owner is told about a chip's state, in words rather than a colour. */
export function chipState(chip: PlanningChip, today: string): "Showing" | "Off" | "Waiting" | "Finished" {
  if (!chip.enabled) return "Off";
  if (hasLapsed(chip, today)) return "Finished";
  return isShowing(chip, today) ? "Showing" : "Waiting";
}
