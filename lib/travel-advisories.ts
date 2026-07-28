// Live U.S. State Department travel advisories.
//
// Source: the official public RSS feed at travel.state.gov. Fetched on the
// server (Vercel) and cached, so we are not hammering a government feed and the
// browser is not blocked by CORS.
//
// IMPORTANT: this is republished government data, never our own judgement. If
// the feed cannot be read we say so and link travelers to the official page —
// we never fall back to a stale or invented safety level, because people plan
// travel to Ukraine, Belarus and Israel from these pages.

const FEED_URL = "https://travel.state.gov/_res/rss/TAsTWs.xml";
export const ADVISORY_SOURCE_URL = "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html";

export type Advisory = {
  country: string;
  level: number | null; // 1..4, or null when the title has no level
  levelLabel: string; // "Level 2: Exercise Increased Caution"
  summary?: string;
  link?: string;
  updated?: string; // ISO date
};

export const ADVISORY_LEVELS: Record<number, { label: string; tone: "ok" | "caution" | "warn" | "danger" }> = {
  1: { label: "Exercise Normal Precautions", tone: "ok" },
  2: { label: "Exercise Increased Caution", tone: "caution" },
  3: { label: "Reconsider Travel", tone: "warn" },
  4: { label: "Do Not Travel", tone: "danger" },
};

// The feed titles read "Ukraine - Level 4: Do Not Travel".
const TITLE = /^\s*(.+?)\s*-\s*Level\s*(\d)\s*:\s*(.+?)\s*$/i;

function tag(block: string, name: string): string | undefined {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  if (!m) return undefined;
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseAdvisoryFeed(xml: string): Advisory[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const out: Advisory[] = [];
  for (const item of items) {
    const title = tag(item, "title");
    if (!title) continue;
    const m = TITLE.exec(title);
    const country = (m?.[1] ?? title).trim();
    const level = m ? Number(m[2]) : null;
    const pub = tag(item, "pubDate");
    let updated: string | undefined;
    if (pub) {
      const t = Date.parse(pub);
      if (!Number.isNaN(t)) updated = new Date(t).toISOString();
    }
    out.push({
      country,
      level: level && level >= 1 && level <= 4 ? level : null,
      levelLabel: m ? `Level ${m[2]}: ${m[3]}` : title,
      summary: tag(item, "description"),
      link: tag(item, "link"),
      updated,
    });
  }
  return out;
}

// Our country labels vs the State Department's wording.
const ALIASES: Record<string, string[]> = {
  ukraine: ["ukraine"],
  poland: ["poland"],
  israel: ["israel", "israel, the west bank and gaza", "israel the west bank and gaza"],
  "israel / judea": ["israel", "israel, the west bank and gaza", "israel the west bank and gaza"],
  belarus: ["belarus"],
  czechia: ["czechia", "czech republic"],
  slovakia: ["slovakia"],
  hungary: ["hungary"],
  romania: ["romania"],
  moldova: ["moldova"],
  lithuania: ["lithuania"],
  austria: ["austria"],
  usa: ["united states"],
  uk: ["united kingdom"],
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** The advisory for one country label, or null when the feed has no entry. */
export function advisoryFor(list: Advisory[], country: string): Advisory | null {
  const key = norm(country);
  const wanted = ALIASES[key] ?? ALIASES[key.split(" ")[0]] ?? [key];
  const targets = wanted.map(norm);
  // Exact match first, then a contains match ("Israel, the West Bank and Gaza").
  return (
    list.find((a) => targets.includes(norm(a.country))) ??
    list.find((a) => targets.some((t) => norm(a.country).includes(t) || t.includes(norm(a.country)))) ??
    null
  );
}

export type AdvisoryFetch = { available: true; advisories: Advisory[]; fetchedAt: string } | { available: false; reason: string };

/** Read the live feed. Never throws; reports failure instead of guessing. */
export async function fetchAdvisories(): Promise<AdvisoryFetch> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { "user-agent": "WhiteGloveItineraries/1.0 (+https://www.whitegloveitineraries.com)" },
      // Re-read at most hourly; advisories change rarely and the feed is public.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { available: false, reason: `The State Department feed returned HTTP ${res.status}.` };
    const xml = await res.text();
    const advisories = parseAdvisoryFeed(xml);
    if (!advisories.length) return { available: false, reason: "The State Department feed could not be read." };
    return { available: true, advisories, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : "Could not reach the State Department feed." };
  }
}
