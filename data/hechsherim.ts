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
  /**
   * A picture of the mark, when one has been uploaded in the admin.
   *
   * Held as a data URI rather than a file path, because the site runs on a
   * filesystem that is thrown away on every deploy — a written file would not
   * survive the next one. Raster only; see lib/hechsher-store.ts for why an
   * uploaded SVG is refused.
   */
  logo?: string;
  /**
   * The agency's own website, where it is known.
   *
   * OPTIONAL AND OFTEN ABSENT, deliberately. A kashrus question belongs to the
   * certifying body, so the useful thing this site can do is point at them
   * rather than answer for them — and a wrong address does that worse than no
   * address. It is filled in only where it is certain; the rest are for the
   * owner to add in the admin as he confirms them, which is a minute's work
   * per agency and not a guess.
   */
  website?: string;
};

export const HECHSHERIM: Hechsher[] = [
  { id: "ou", name: "Orthodox Union", mark: "OU", region: "United States, international", aliases: ["ou", "orthodox union"] , website: "https://oukosher.org" },
  { id: "ok", name: "OK Kosher Certification", mark: "OK", region: "United States, international", aliases: ["ok kosher", "ok labs"] , website: "https://www.ok.org" },
  { id: "star-k", name: "Star-K Kosher Certification", mark: "★K", region: "United States, international", aliases: ["star-k", "star k"] , website: "https://www.star-k.org" },
  { id: "kof-k", name: "Kof-K Kosher Supervision", mark: "KK", region: "United States, international", aliases: ["kof-k", "kof k"] , website: "https://www.kof-k.org" },
  { id: "crc", name: "Chicago Rabbinical Council", mark: "cRc", region: "Chicago and the Midwest", aliases: ["crc", "chicago rabbinical"] , website: "https://www.crcweb.org" },
  { id: "kehillah-la", name: "Kehillah Kosher", mark: "KH", region: "Los Angeles", aliases: ["kehillah kosher", "kehilla kosher"] },
  { id: "rcc", name: "Rabbinical Council of California", mark: "RCC", region: "California", aliases: ["rcc", "rabbinical council of california"] },
  { id: "vaad-nj", name: "Vaad Harabonim of Greater New Jersey", mark: "VH", region: "New Jersey", aliases: ["vaad harabonim", "mk of new jersey"] },
  { id: "badatz-eda", name: "Badatz Eda HaChareidis", mark: "בד״ץ", region: "Yerushalayim", aliases: ["eda hachareidis", "edah hacharedis", "badatz eda"] },
  { id: "badatz-belz", name: "Badatz Machzikei Hadass — Belz", mark: "בד״ץ", region: "Eretz Yisrael", aliases: ["machzikei hadass", "belz badatz"] },
  { id: "rabbanut", name: "Rabbanut", mark: "רבנות", region: "Eretz Yisrael", aliases: ["rabbanut", "rabbinate", "rabbinut"] },
  { id: "kedassia", name: "Kedassia", mark: "KD", region: "United Kingdom", aliases: ["kedassia", "kedasia"] },
  { id: "klbd", name: "London Beth Din — KLBD", mark: "KLBD", region: "United Kingdom", aliases: ["klbd", "london beth din"] , website: "https://www.klbdkosher.org" },
  { id: "mk", name: "MK Kosher", mark: "MK", region: "Canada", aliases: ["mk kosher", "montreal kosher"] , website: "https://www.mk.ca" },
  { id: "cor", name: "COR — Kashruth Council of Canada", mark: "COR", region: "Canada", aliases: ["cor", "kashruth council of canada"] , website: "https://www.cor.ca" },
  { id: "beth-din-paris", name: "Beth Din de Paris", mark: "BDP", region: "France", aliases: ["beth din de paris", "consistoire"] },
  { id: "kosher-poland", name: "Kosher Poland — Chief Rabbi of Poland", mark: "KP", region: "Poland", aliases: ["kosher poland", "chief rabbi of poland"] },
  { id: "kashrus-ukraine", name: "Kashrus Ukraine", mark: "KU", region: "Ukraine", aliases: ["kashrus ukraine", "kosher ukraine"] },
  { id: "ort-hungary", name: "Orthodox Rabbinate of Hungary", mark: "OH", region: "Hungary", aliases: ["orthodox rabbinate of hungary", "kosher hungary"] },
  { id: "local-rov", name: "The local rov", mark: "רב", region: "Wherever the town's rov gives the hechsher", aliases: ["local rabbi", "local rov", "town rabbi"] },

  /* ---- United States ---------------------------------------------------- */
  { id: "triangle-k", name: "Triangle K", mark: "K", region: "United States", aliases: ["triangle k", "triangle-k"], website: "https://www.trianglek.org" },
  { id: "ksa", name: "Kosher Supervision of America", mark: "KSA", region: "Los Angeles and the west coast", aliases: ["ksa", "kosher supervision of america"], website: "https://www.ksakosher.com" },
  { id: "scroll-k", name: "Scroll K — Vaad Hakashrus of Denver", mark: "K", region: "Denver and the Mountain West", aliases: ["scroll k", "vaad hakashrus of denver"], website: "https://www.scrollk.org" },
  { id: "akc", name: "Atlanta Kashruth Commission", mark: "AK", region: "Atlanta", aliases: ["atlanta kashruth", "akc"] },
  { id: "dallas-kosher", name: "Dallas Kosher", mark: "DK", region: "Dallas", aliases: ["dallas kosher"] },
  { id: "kvh", name: "KVH Kosher — Rabbinical Council of New England", mark: "KVH", region: "New England", aliases: ["kvh", "rabbinical council of new england"] },
  { id: "vaad-detroit", name: "Council of Orthodox Rabbis of Greater Detroit", mark: "Council K", region: "Detroit", aliases: ["council k", "vaad of detroit"] },
  { id: "keystone-k", name: "Keystone K — Orthodox Vaad of Philadelphia", mark: "K", region: "Philadelphia", aliases: ["keystone k", "orthodox vaad of philadelphia"] },
  { id: "vaad-hoeir", name: "Vaad Hoeir of St. Louis", mark: "OV", region: "St. Louis", aliases: ["vaad hoeir", "ov kosher"] },
  { id: "earth-kosher", name: "EarthKosher", mark: "EK", region: "United States, international", aliases: ["earthkosher", "earth kosher"] },
  { id: "upper-midwest", name: "Upper Midwest Kashruth", mark: "MSP", region: "Minneapolis and St. Paul", aliases: ["upper midwest kashruth", "msp kosher"] },

  /* ---- Eretz Yisrael ---------------------------------------------------- */
  { id: "badatz-beit-yosef", name: "Badatz Beit Yosef", mark: "בד״ץ", region: "Eretz Yisrael — Sephardic", aliases: ["beit yosef", "bet yosef"] },
  { id: "badatz-agudas", name: "Badatz Agudas Yisroel", mark: "בד״ץ", region: "Eretz Yisrael", aliases: ["agudas yisroel badatz", "agudat yisrael badatz"] },
  { id: "rav-landau", name: "Badatz Harav Landau", mark: "לנדא", region: "Bnei Brak", aliases: ["rav landau", "harav landau"] },
  { id: "sheiris", name: "Sheiris Yisroel", mark: "שארית", region: "Eretz Yisrael", aliases: ["sheiris yisroel", "shearis yisroel"] },
  { id: "rav-rubin", name: "Badatz Harav Rubin", mark: "רובין", region: "Eretz Yisrael", aliases: ["rav rubin", "harav rubin"] },
  { id: "chug-chasam-sofer", name: "Chug Chasam Sofer", mark: "חת״ס", region: "Bnei Brak", aliases: ["chug chasam sofer", "chasam sofer bnei brak"] },

  /* ---- United Kingdom --------------------------------------------------- */
  { id: "kf", name: "Federation of Synagogues Kashrus Board", mark: "KF", region: "United Kingdom", aliases: ["kf kosher", "federation kashrus"] },
  { id: "mbd", name: "Manchester Beth Din", mark: "MBD", region: "Manchester", aliases: ["manchester beth din", "mbd"] },
  { id: "ska", name: "Sephardi Kashrut Authority", mark: "SKA", region: "United Kingdom — Sephardic", aliases: ["sephardi kashrut authority", "ska"] },

  /* ---- Europe ----------------------------------------------------------- */
  { id: "machsike-hadass-antwerp", name: "Machsike Hadass — Antwerp", mark: "MH", region: "Belgium", aliases: ["machsike hadass", "antwerp kashrus"] },

  /* ---- Rest of the world ------------------------------------------------ */
  { id: "kosher-australia", name: "Kosher Australia", mark: "KA", region: "Melbourne and Victoria", aliases: ["kosher australia"], website: "https://www.kosher.org.au" },
  { id: "ka-nsw", name: "The Kashrut Authority", mark: "KA", region: "Sydney and New South Wales", aliases: ["kashrut authority", "ka nsw"], website: "https://www.ka.org.au" },
  { id: "beth-din-johannesburg", name: "Beth Din of Johannesburg", mark: "BD", region: "South Africa", aliases: ["johannesburg beth din", "sa kosher"] },
];

/**
 * Every agency: the ones that ship with the site, plus the ones the owner has
 * added or changed in the admin.
 *
 * A stored entry sharing an id with a built-in one overlays it rather than
 * replacing it, which is how a logo gets attached to an agency that already
 * exists without restating its name and region.
 */
export function allHechsherim(stored?: Array<Partial<Hechsher> & { id: string }>): Hechsher[] {
  if (!stored?.length) return HECHSHERIM;
  const byId = new Map(stored.map((h) => [h.id, h]));
  const merged: Hechsher[] = HECHSHERIM.map((builtIn) => {
    const overlay = byId.get(builtIn.id);
    byId.delete(builtIn.id);
    return overlay ? { ...builtIn, ...stripEmpty(overlay) } : builtIn;
  });
  for (const added of byId.values()) {
    if (!added.name?.trim()) continue; // an overlay for an agency that no longer ships
    merged.push({
      id: added.id,
      name: added.name,
      mark: added.mark?.trim() || added.name.trim().slice(0, 3).toUpperCase(),
      region: added.region?.trim() || "Added by the owner",
      aliases: added.aliases ?? [],
      logo: added.logo,
    });
  }
  return merged;
}

/** Drop blank fields so an overlay never wipes a built-in name with "". */
function stripEmpty<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== "")) as Partial<T>;
}

export function getHechsher(id?: string | null, agencies: Hechsher[] = HECHSHERIM): Hechsher | undefined {
  if (!id) return undefined;
  return agencies.find((h) => h.id === id);
}

/**
 * Which agency a piece of free text is naming, if any.
 *
 * Used on OpenStreetMap's own certification tags, so "OU" or "Badatz Eda
 * HaChareidis" in someone's map edit lands on the right circle. A miss is
 * fine — the text is still shown as written.
 */
export function matchHechsher(text?: string | null, agencies: Hechsher[] = HECHSHERIM): Hechsher | undefined {
  const value = text?.trim().toLowerCase();
  if (!value) return undefined;
  const exact = agencies.find((h) => h.aliases.includes(value) || h.id === value);
  if (exact) return exact;
  return agencies.find((h) => h.aliases.some((a) => a.length > 3 && value.includes(a)));
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
export function hechsherLabel(status: HechsherStatus, agencies: Hechsher[] = HECHSHERIM): string {
  const named = getHechsher(status.hechsherId, agencies)?.name ?? status.note?.trim();
  if (status.state === "none") return "No hechsher";
  if (status.state === "unverified") return "Unverified";
  if (status.state === "reported") return named ? `${named} — unverified` : "Unverified";
  return named || "Certified";
}

/** A short line for the badge's tooltip and for a screen reader. */
export function describeHechsher(status: HechsherStatus, agencies: Hechsher[] = HECHSHERIM): string {
  const named = getHechsher(status.hechsherId, agencies)?.name ?? status.note?.trim();
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
