// The hechsherim a place can carry, and what is known about each place.
//
// This list is of certifying agencies — public, well-known organisations — and
// nothing more. It says who exists; it never says who certifies what. Attaching
// a hechsher to a particular restaurant is a claim about kashrus, and the site
// makes that claim on its own authority only when the owner has confirmed it.
//
// So there are two different "we think it has one":
//
//   reported  — something says so (OpenStreetMap's own tag, usually) and the
//               source is named. Shown, because the traveler is better off
//               knowing, but never presented as confirmed.
//   certified — the owner checked it against a teudah, the rov, or the
//               agency's own list, and said so.
//
// Anything else is unverified, which is the honest answer until somebody looks.
//
// A logo is shown when one has been added at public/hechsherim/<id>.svg.
// Otherwise the mark is the agency's own short form set in a circle, which is
// how these are written on a package anyway.

export type Hechsher = {
  id: string;
  /** The full name of the certifying body. */
  name: string;
  /** What is written inside the circle when there is no logo file. */
  mark: string;
  /** Where it mostly certifies, to tell similar names apart. */
  region: string;
  /** Lower-case fragments that identify this agency in free text. */
  aliases: string[];
};

export const HECHSHERIM: Hechsher[] = [
  { id: "ou", name: "Orthodox Union", mark: "OU", region: "United States, international", aliases: ["ou", "orthodox union"] },
  { id: "ok", name: "OK Kosher Certification", mark: "OK", region: "United States, international", aliases: ["ok kosher", "ok labs"] },
  { id: "star-k", name: "Star-K Kosher Certification", mark: "★K", region: "United States, international", aliases: ["star-k", "star k"] },
  { id: "kof-k", name: "Kof-K Kosher Supervision", mark: "KK", region: "United States, international", aliases: ["kof-k", "kof k"] },
  { id: "crc", name: "Chicago Rabbinical Council", mark: "cRc", region: "Chicago and the Midwest", aliases: ["crc", "chicago rabbinical"] },
  { id: "kehillah-la", name: "Kehillah Kosher", mark: "KH", region: "Los Angeles", aliases: ["kehillah kosher", "kehilla kosher"] },
  { id: "rcc", name: "Rabbinical Council of California", mark: "RCC", region: "California", aliases: ["rcc", "rabbinical council of california"] },
  { id: "vaad-nj", name: "Vaad Harabonim of Greater New Jersey", mark: "VH", region: "New Jersey", aliases: ["vaad harabonim", "mk of new jersey"] },
  { id: "badatz-eda", name: "Badatz Eda HaChareidis", mark: "בד״ץ", region: "Yerushalayim", aliases: ["eda hachareidis", "edah hacharedis", "badatz eda"] },
  { id: "badatz-belz", name: "Badatz Machzikei Hadass — Belz", mark: "בד״ץ", region: "Eretz Yisrael", aliases: ["machzikei hadass", "belz badatz"] },
  { id: "rabbanut", name: "Rabbanut", mark: "רבנות", region: "Eretz Yisrael", aliases: ["rabbanut", "rabbinate", "rabbinut"] },
  { id: "kedassia", name: "Kedassia", mark: "KD", region: "United Kingdom", aliases: ["kedassia", "kedasia"] },
  { id: "klbd", name: "London Beth Din — KLBD", mark: "KLBD", region: "United Kingdom", aliases: ["klbd", "london beth din"] },
  { id: "mk", name: "MK Kosher", mark: "MK", region: "Canada", aliases: ["mk kosher", "montreal kosher"] },
  { id: "cor", name: "COR — Kashruth Council of Canada", mark: "COR", region: "Canada", aliases: ["cor", "kashruth council of canada"] },
  { id: "beth-din-paris", name: "Beth Din de Paris", mark: "BDP", region: "France", aliases: ["beth din de paris", "consistoire"] },
  { id: "kosher-poland", name: "Kosher Poland — Chief Rabbi of Poland", mark: "KP", region: "Poland", aliases: ["kosher poland", "chief rabbi of poland"] },
  { id: "kashrus-ukraine", name: "Kashrus Ukraine", mark: "KU", region: "Ukraine", aliases: ["kashrus ukraine", "kosher ukraine"] },
  { id: "ort-hungary", name: "Orthodox Rabbinate of Hungary", mark: "OH", region: "Hungary", aliases: ["orthodox rabbinate of hungary", "kosher hungary"] },
  { id: "local-rov", name: "The local rov", mark: "רב", region: "Wherever the town's rov gives the hechsher", aliases: ["local rabbi", "local rov", "town rabbi"] },
];

export function getHechsher(id?: string | null): Hechsher | undefined {
  if (!id) return undefined;
  return HECHSHERIM.find((h) => h.id === id);
}

/**
 * Which agency a piece of free text is naming, if any.
 *
 * Used on OpenStreetMap's own certification tags, so "OU" or "Badatz Eda
 * HaChareidis" in someone's map edit lands on the right circle. A miss is
 * fine — the text is still shown as written.
 */
export function matchHechsher(text?: string | null): Hechsher | undefined {
  const value = text?.trim().toLowerCase();
  if (!value) return undefined;
  const exact = HECHSHERIM.find((h) => h.aliases.includes(value) || h.id === value);
  if (exact) return exact;
  return HECHSHERIM.find((h) => h.aliases.some((a) => a.length > 3 && value.includes(a)));
}

/**
 * What is known about one place's hechsher.
 *
 * `state` is the whole point of this type:
 *   • "certified"  — the owner has confirmed which hechsher it holds
 *   • "reported"   — a named source says so; nobody here has confirmed it
 *   • "none"       — the owner has confirmed it carries no hechsher
 *   • "unverified" — nobody has checked yet. The default, and the honest one.
 */
export type HechsherState = "certified" | "reported" | "none" | "unverified";

export type HechsherStatus = {
  state: HechsherState;
  hechsherId?: string;
  /** Free text for a hechsher not on the list, or a note about this one. */
  note?: string;
  /** Where it comes from. Required for anything other than "unverified". */
  source?: string;
  confirmedAt?: string;
};

export const UNVERIFIED: HechsherStatus = { state: "unverified" };

/** The name to write beside the circle. */
export function hechsherLabel(status: HechsherStatus): string {
  const named = getHechsher(status.hechsherId)?.name ?? status.note?.trim();
  if (status.state === "none") return "No hechsher";
  if (status.state === "unverified") return "Unverified";
  if (status.state === "reported") return named ? `${named} — unverified` : "Unverified";
  return named || "Certified";
}

/** A short line for the badge's tooltip and for a screen reader. */
export function describeHechsher(status: HechsherStatus): string {
  const named = getHechsher(status.hechsherId)?.name ?? status.note?.trim();
  switch (status.state) {
    case "none":
      return "Confirmed as carrying no hechsher.";
    case "reported":
      return `Reported as ${named ?? "certified"}${status.source ? ` by ${status.source}` : ""} — nobody here has confirmed it. Check before you eat.`;
    case "certified":
      return `Confirmed: ${named ?? "a hechsher"}${status.source ? ` (${status.source})` : ""}.`;
    default:
      return "Nobody has confirmed this one's hechsher yet — check before you eat.";
  }
}
