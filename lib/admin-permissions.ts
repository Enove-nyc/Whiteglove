/**
 * Which parts of the admin somebody may open.
 *
 * Being an administrator was all or nothing. A helper who should only be
 * entering kevarim got the finances, the passwords, the visitor accounts with
 * everybody's email and phone number, and the switch that closes the site to
 * the public. There was no smaller thing to grant, so the owner's real choice
 * was between handing over everything and doing it himself.
 *
 * This is the smaller thing. Five areas, chosen to match the way the admin is
 * already laid out rather than invented on top of it, so what somebody is
 * granted matches what they see down the left-hand side.
 *
 * MONEY AND ACCESS ARE SEPARATE from everything else on purpose. They are the
 * two that are not about content at all: what the business earns, and who can
 * get in. Somebody helping with kevarim has no reason to hold either, and
 * bundling them into "admin" is what made the grant unusable.
 *
 * NOTHING GRANTED MEANS EVERYTHING, deliberately. Every administrator who
 * exists today was granted before areas did, and a deploy that silently locked
 * them out of the screens they use would be a worse bug than the one this
 * fixes. Restriction has to be chosen.
 */

export const ADMIN_AREAS = ["content", "directory", "advertisements", "money", "access"] as const;
export type AdminArea = (typeof ADMIN_AREAS)[number];

export const AREA_LABELS: Record<AdminArea, { label: string; blurb: string }> = {
  content: { label: "Words and pictures", blurb: "Pages, photographs, and corrections people send in." },
  directory: { label: "Places and kevarim", blurb: "Towns, batei hachaim, shomer numbers, listings, businesses." },
  advertisements: { label: "Advertisements", blurb: "Banners, popups and who they are for." },
  money: { label: "Money", blurb: "What the business earns and spends." },
  access: { label: "Access and settings", blurb: "Who can get in, passwords, the site lock, visitor accounts." },
};

/**
 * Which area a screen belongs to.
 *
 * Longest prefix first, so `/admin/directory/businesses` is matched by the
 * directory rule rather than by a shorter one that happens to also match.
 * A screen listed nowhere belongs to no area and only somebody unrestricted
 * can open it — the safe direction for anything added later and forgotten.
 *
 * Every folder under `app/admin` has to appear here. A test walks the folder
 * list and fails when one does not, because a screen nobody remembered to put
 * in an area is exactly the screen a restriction is supposed to cover.
 */
const AREA_PATHS: Array<[string, AdminArea]> = [
  ["/admin/settings", "access"],
  ["/admin/team", "access"],
  ["/admin/accounts", "access"],
  ["/admin/finances", "money"],
  ["/admin/advertisements", "advertisements"],
  ["/admin/pages", "content"],
  ["/admin/photos", "content"],
  ["/admin/content", "content"],
  ["/admin/inventory", "content"],
  ["/admin/reports", "content"],
  ["/admin/borders", "directory"],
  ["/admin/recycle", "directory"],
  ["/admin/directory", "directory"],
  ["/admin/directory-listings", "directory"],
  ["/admin/kevarim", "directory"],
  ["/admin/shomrim", "directory"],
  ["/admin/destinations", "directory"],
  ["/admin/hechsherim", "directory"],
  ["/admin/add", "directory"],
];

export function areaForPath(pathname: string): AdminArea | null {
  const path = pathname.replace(/\/+$/, "") || "/admin";
  let best: { length: number; area: AdminArea } | null = null;
  for (const [prefix, area] of AREA_PATHS) {
    if ((path === prefix || path.startsWith(`${prefix}/`)) && (!best || prefix.length > best.length)) {
      best = { length: prefix.length, area };
    }
  }
  return best?.area ?? null;
}

/**
 * Somebody's granted areas, as every check below wants them: a list, or `null`
 * meaning unrestricted.
 *
 * Three things become `null`, and they are the same thing said three ways —
 * nothing was chosen, so nothing is restricted:
 *
 *   • nothing stored at all, which is every administrator granted before this
 *     existed (see the note at the top);
 *   • an empty list;
 *   • all five ticked, because a person who may use every area is not
 *     restricted, and treating them as restricted would refuse them any screen
 *     that has not been filed under an area yet.
 *
 * Anything that is not one of the five is dropped rather than trusted. The
 * list comes out of storage, and a value nobody recognises must not become a
 * grant by accident.
 */
export function grantedAreas(areas: readonly string[] | undefined | null): AdminArea[] | null {
  if (!areas?.length) return null;
  const known = ADMIN_AREAS.filter((area) => areas.includes(area));
  if (!known.length || known.length === ADMIN_AREAS.length) return null;
  return known;
}

/** May this person use this area at all? `null` areas means unrestricted. */
export function mayUse(areas: AdminArea[] | null, area: AdminArea): boolean {
  return !areas || areas.includes(area);
}

/**
 * May this person open this screen?
 *
 * Used for the navigation, the "go to" box and the dashboard's links — so that
 * a restricted helper is not shown a door that refuses them. The refusal
 * itself lives on the screens, not here; this only decides what to draw.
 *
 * The dashboard and the sign-in screen are open to every administrator: one is
 * where they land, and refusing the other would mean somebody could not sign
 * in at all.
 */
export function canOpen(areas: AdminArea[] | null, pathname: string): boolean {
  if (!areas) return true;
  const path = pathname.replace(/\/+$/, "") || "/admin";
  if (path === "/admin" || path === "/admin/login") return true;
  const area = areaForPath(path);
  return area !== null && areas.includes(area);
}

/** What to say to somebody who cannot open a screen. Never "not found". */
export function refusalFor(area: AdminArea | null): string {
  if (!area) return "This screen is not part of what you have been given access to.";
  return `${AREA_LABELS[area].label} is not part of what you have been given access to.`;
}

/**
 * The grant in words, for the team screen.
 *
 * "Everything" rather than a list of five, because the list of five is how the
 * owner ticked it and not how they think about it.
 */
export function describeAreas(areas: AdminArea[] | null): string {
  if (!areas) return "Everything in the admin";
  return areas.map((area) => AREA_LABELS[area].label).join(" · ");
}
