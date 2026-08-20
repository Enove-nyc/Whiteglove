// Builds data/sources-index.generated.ts — every outbound source link the
// site cites, deduplicated to one entry per website and grouped by kind.
//
// WHY THIS EXISTS. White Glove compiles its listings from other people's
// directories and public pages. That credit belongs somewhere honest, but not
// sitting on a listing beside a kever where it reads as an endorsement. So the
// credit is collected here and shown once, on /sources.
//
// WHAT IT SCANS. Every `source:`, `sourceUrl:` and `url:` link written into a
// file under data/. One entry per host (a site cited on forty listings is one
// source, not forty), with a count of how many listings lean on it and a
// best-guess grouping. It says who we drew on; it says nothing about who
// certifies what or whose hashkafah anything carries.
//
// REBUILD: node scripts/build-sources-index.mjs

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".ts") && !name.endsWith(".generated.ts")) out.push(p);
  }
  return out;
}

const URL_RE = /(?:source|sourceUrl|url)\s*:\s*"(https?:\/\/[^"]+)"/g;

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function categorize(host) {
  const h = host.toLowerCase();
  const has = (...frags) => frags.some((f) => h.includes(f));
  if (has("nesiyatova", "rebshayele", "kerestir", "lizansk", "lizhensk", "nertzaddik", "rashbi", "kevarim", "gederavos", "footstepsofwonderrabbis", "meronmap"))
    return "Kevarim & kivrei tzaddikim";
  if (has("wikipedia", "wikimedia")) return "General reference";
  if (has("chabad", "lubavitch", "anash", "aleksanderhoif", "myascent")) return "Chabad";
  if (has("orbkosher", "oukosher", "ok.org", "star-k", "crckosher", "cor.ca", "mk.ca", "kosher.org", "queensvaad", "vaadhakashrus", "rccvaad", "kosherquest", "dallaskosher", "clevelandkosher", "kosherhouston", "scrollk", "capitolk", "kvhkosher", "vaadofmemphis", "kosherphoenix", "klbd", "bene-emeth", "data.gov.il") || (has("kosher") && has("vaad", "kashrus", "kashrut", "cert")))
    return "Kashrus certifiers";
  if (has("koshertravel", "kosherica", "gourmetkosher", "bespokekosher", "easykosher", "gokosher", "mykosherhotel", "koshertirol", "totallyjewishtravel", "yeahthatskosher", "worldjewishtravel", "zissil", "koshervacation", "koshertravelers", "koshertravelinfo", "kosherplease"))
    return "Kosher travel & tours";
  if (has("sztetl", "jewishgen", "esjf", "jguide", "shtetl", "yadvashem", "findagrave", "billiongraves", "iajgs", "kehilalinks", "jewish-heritage", "litvak-cemetery", "rohatyn", "lvivcenter", "slovak-jewish", "zidovsky", "zsido", "museoebraico", "cja.huji", "jewishvirtuallibrary", "jewishheritage", "myshtetl", "willesdenjewishcemetery", "cemetery", "hrbitov", "matzev"))
    return "Jewish heritage & cemeteries";
  if (has("visit", "tourism", "goisrael", "incredibleindia", "parks.org.il", "nps.gov", "travel.state.gov", "booking.com", "rome2rio", "travelmath", "seat61", "flightconnections", "flypgs", "unesco", ".travel", "turismo", "salzburg.info", "inyourpocket", "tripadvisor", "expedia", "prague.eu", "praguego"))
    return "Tourism, travel & booking";
  if (has("kosher") || has("hechsher")) return "Kashrus certifiers";
  if (has("jewish", "jfed", "jcc", "shul", "synagog", "chevra", "hatzolah", "godaven", "mikv", "eruv", "bethdin", "beisdin", "consistoire"))
    return "Jewish community & institutions";
  return "Other sites cited";
}

const counts = new Map();
for (const file of walk(DATA)) {
  const txt = readFileSync(file, "utf8");
  let m;
  while ((m = URL_RE.exec(txt))) {
    const host = hostOf(m[1]);
    if (!host) continue;
    counts.set(host, (counts.get(host) ?? 0) + 1);
  }
}

const entries = [...counts.entries()]
  .map(([host, count]) => ({ host, url: `https://${host}/`, category: categorize(host), count }))
  .sort((a, b) => a.category.localeCompare(b.category) || a.host.localeCompare(b.host));

const CATEGORY_ORDER = [
  "Kashrus certifiers",
  "Kevarim & kivrei tzaddikim",
  "Jewish heritage & cemeteries",
  "Jewish community & institutions",
  "Chabad",
  "Kosher travel & tours",
  "Tourism, travel & booking",
  "General reference",
  "Other sites cited",
];

const banner = `// GENERATED FILE — do not edit by hand.
// Rebuilt by scripts/build-sources-index.mjs from every source link under data/.
// Run: node scripts/build-sources-index.mjs
`;

const body =
  banner +
  `\nexport type SourceIndexEntry = {\n  /** Website host, e.g. "orbkosher.com". */\n  host: string;\n  /** A link to the site itself. */\n  url: string;\n  /** Best-guess grouping for display only. */\n  category: string;\n  /** How many listings on the site cite this source. */\n  count: number;\n};\n\n` +
  `/** The order categories are shown in on /sources. */\nexport const SOURCE_CATEGORY_ORDER = ${JSON.stringify(CATEGORY_ORDER, null, 2)} as const;\n\n` +
  `/** Every distinct source website the site cites, one entry each. */\nexport const sourceIndex: SourceIndexEntry[] = ${JSON.stringify(entries, null, 2)};\n`;

writeFileSync(join(DATA, "sources-index.generated.ts"), body);
console.log(`Wrote data/sources-index.generated.ts — ${entries.length} sources.`);
