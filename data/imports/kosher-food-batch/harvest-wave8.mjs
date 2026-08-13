import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/* ---------- address detection ---------- */

const STREET_RES = [
  /\d{1,6}[A-Za-z]?[,\s]+[^,;|]{1,70}?\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|blvd\.?|boulevard|lane|ln\.?|way|court|ct\.?|place|pl\.?|parkway|pkwy|highway|hwy|terrace|circle|crescent|close|square|sq\.?|row|walk|gardens|broadway|turnpike|pike)\b/i,
  /\b(?:rua|avenida|alameda|calle|carrera|paseo|avda|rue|via|viale|corso|piazza|strasse|straße|gasse|weg|platz|allee|straat|laan|plein|ulica|ulice|utca|rechov)\s+[^,;|]{2,55}?\d{1,5}\b/i,
  /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}\b/,
];
const CITY_STATE_ZIP = /^([A-Za-z .'\-]{2,32}),\s*([A-Z]{2})\.?\s+(\d{5})(?:-\d{4})?$/;
const INLINE_CSZ = /,\s*([A-Za-z .'\-]{2,32}),\s*([A-Z]{2})\.?\s+\d{5}/;

function streetMatch(line) {
  for (const re of STREET_RES) {
    const m = re.exec(line);
    if (m) return m;
  }
  return null;
}

/* ---------- rejection vocabulary ---------- */

const BAD_NAME =
  /^(address|phone|hours|tel|fax|website|email|e-mail|map|home|menu|copyright|contact|directions|open|closed|click|read more|view|search|about|donate|location|hechsher|supervision|status|updated|note|please|order|delivery|catering only|see |all |the following|certified|kashrus|kosher status|our |more info|learn more|share|follow|subscribe|sign up|login|next|previous|back to)/i;
const JUNK =
  /copyright|compliance status|screen-reader|keyboard navigation|wcag|{{|cookie|privacy policy|all rights reserved|top of page|bottom of page|skip to|©|lorem ipsum|©/i;
const KASHRUS_WORDS =
  /^(dairy|meat|pareve|parve|milchig|fleishig|cholov yisroel|chalav yisrael|pas yisroel|pat yisrael|yoshon|bishul yisroel|glatt|mehadrin|kashrus type|kashrus details|additional hidurim|view certificate|certificate|restaurants?|bakeries|bakery|groceries|grocery|caterers?|eateries|markets?|butchers?|supermarkets?|delis?|cafes?|takeaway|hotels?|pizza|fish|meat markets?|coming soon|n\/a|yes|no|available)$/i;
const BLOCKED =
  /techloq|Just a moment|cf-mitigated|_Incapsula_Resource|Attention Required!|sorry, you have been blocked|enable javascript and cookies/i;

/* ---------- fetch ---------- */

async function get(url) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    const text = await r.text();
    if (BLOCKED.test(`${r.url}\n${text.slice(0, 2500)}`)) return { kind: "blocked", url: r.url };
    if (r.status === 404) return { kind: "fail", url: r.url, status: 404 };
    if (!text || text.length < 1500) return { kind: "stub", url: r.url };
    return { kind: "ok", url: r.url, text };
  } catch (e) {
    return { kind: "fail", url, error: String(e.message || e).slice(0, 50) };
  }
}

function absUrl(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function firstMatchingLink(html, pageUrl, re) {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!re.test(href)) continue;
    if (/\.(css|js|png|jpg|jpeg|gif|svg|pdf|json|xml)(\?|$)/i.test(href)) continue;
    if (/wp-json|wp-admin|mailto:|javascript:|\/feed|\/page\/\d/i.test(href)) continue;
    const abs = absUrl(pageUrl, href);
    if (abs && abs !== pageUrl) return abs;
  }
  return null;
}

/* ---------- text extraction ---------- */

function decode(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;|&#39;|&apos;/g, "'")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8212;|&mdash;/g, "-")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&auml;/g, "ä")
    .replace(/&lt;|&gt;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]{2,8};/gi, " ")
    .replace(/[\uFEFF\u200b\u200e\u200f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toLines(html) {
  return html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th|article|section|strong|b|span|a|em|i)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map(decode)
    .filter(Boolean);
}

/* ---------- row building ---------- */

function tidyAddress(raw) {
  let a = decode(raw).split("|")[0];
  a = a.replace(/\b(tel|telephone|phone|ph|fax|call)\b\.?\s*:?.*$/i, "");
  a = a.replace(/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b.*$/, "");
  a = a.replace(/\s*[-–,;:]\s*$/, "");
  return a.replace(/\s+/g, " ").trim();
}

function tidyName(raw) {
  return decode(raw)
    .replace(/^[-–—•*·\s]+/, "")
    .replace(/[:•\-–—,]+$/, "")
    .replace(/\s*\((?:located|inside|in the)[^)]*\)\s*$/i, "")
    .trim();
}

function categoryFor(name, hint) {
  const t = `${name} ${hint || ""}`.toLowerCase();
  if (/baker|panader|padaria|confiter|patisser|cake|bagel|donut|cookie|challah/.test(t)) return "Bakery";
  if (/butcher|carnicer|frigorif|meat market|shechita|glatt mart/.test(t)) return "Butcher";
  if (/market|grocer|supermerc|supermarket|mini-market|superette|store|kosher center|autoservicio|almac/.test(t)) return "Grocery";
  if (/cater|kitchen|takeaway|take-out|takeout/.test(t)) return "Takeaway";
  if (/cafe|café|coffee|espresso|helader|ice cream|yogurt|gelat/.test(t)) return "Cafe";
  return "Restaurant";
}

function nameIsUsable(name) {
  if (!name || name.length < 3 || name.length > 70) return false;
  if (!/[A-Za-zÀ-ÿ]{3}/.test(name)) return false;
  if (BAD_NAME.test(name) || JUNK.test(name) || KASHRUS_WORDS.test(name)) return false;
  if (/^https?:|@|^www\./i.test(name)) return false;
  if (/[.:!?]$/.test(name) && name.split(" ").length > 4) return false;
  if (streetMatch(name)) return false;
  if (/^\d/.test(name)) return false;
  if (/^(chabad|synagogue|shul|gemeinde|community|congregation|beth din|kehilla|vaad|va'ad)\b/i.test(name) && !/restaurant|kitchen|dining|bakery|cafe|café|deli|food|grill|market/i.test(name)) return false;
  return true;
}

/* Text of every heading / bolded label on the page: a venue name is almost always one. */
function headingSet(html) {
  const set = new Set();
  for (const m of html.matchAll(/<h[1-6][^>]*>([\s\S]{0,4000}?)<\/h[1-6]>/gi)) {
    const t = decode(m[1]);
    if (t && t.length <= 80) set.add(t.toLowerCase());
  }
  for (const m of html.matchAll(/<(strong|b)[^>]*>([\s\S]{0,2000}?)<\/\1>/gi)) {
    const t = decode(m[2]);
    if (t && t.length <= 80) set.add(t.toLowerCase());
  }
  return set;
}

/* Walk backwards from the address line to the nearest plausible venue name. */
function findName(lines, i, cfg, headings) {
  for (let j = i - 1; j >= Math.max(0, i - 8); j -= 1) {
    const line = lines[j];
    if (!line) continue;
    if (cfg.sectionRe && cfg.sectionRe.test(line)) return null;
    if (streetMatch(line)) continue;
    if (KASHRUS_WORDS.test(line)) continue;
    if (JUNK.test(line)) continue;
    if (/^https?:|^www\.|@/i.test(line)) continue;
    if (/^\(?\d[\d\s().-]{6,}$/.test(line)) continue;
    if (/[.:]$/.test(line)) continue;
    if (line.length > 70) continue;
    const name = tidyName(line);
    if (!nameIsUsable(name)) continue;
    if (cfg.rejectName && cfg.rejectName.test(name)) continue;
    if (cfg.namesFromHeadings && !headings.has(name.toLowerCase())) continue;
    return name;
  }
  return null;
}

function parseGeneric(html, cfg, listingUrl) {
  const lines = toLines(html);
  const headings = headingSet(html);
  const rows = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (JUNK.test(line)) continue;
    const m = streetMatch(line);
    if (!m) continue;
    if (line.length > 130) continue;

    let address = tidyAddress(line.slice(m.index));
    let locality = cfg.locality;

    const next = lines[i + 1] || "";
    const csz = CITY_STATE_ZIP.exec(next);
    if (csz && !CITY_STATE_ZIP.test(line)) {
      address = `${address}, ${next}`;
      locality = csz[1].trim();
    } else {
      const inline = INLINE_CSZ.exec(line);
      if (inline) locality = inline[1].trim();
    }

    if (cfg.expectRegion && !cfg.expectRegion.test(address)) continue;
    if (cfg.selfAddress && cfg.selfAddress.test(address)) continue;

    const name = findName(lines, i, cfg, headings);
    if (!name) continue;
    if (cfg.selfName && cfg.selfName.test(name)) continue;

    address = tidyAddress(address);
    if (address.length < 8 || address.length > 140) continue;

    const category = categoryFor(name, cfg.hint);
    const key = `${name.toLowerCase()}::${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      sourceKey: cfg.sourceKey,
      name,
      address,
      locality,
      destination: locality,
      country: cfg.country,
      category,
      listingUrl,
      website: null,
      type: category,
      summary: `${name} is listed as a kosher ${category.toLowerCase()} by ${cfg.agency}. Confirm current supervision on the cited page before relying on it.`,
    });
  }
  return rows;
}

/* Name / address / phone triplets ending in a marker line (Bene Emeth Buenos Aires). */
function parseTriplet(html, cfg, listingUrl) {
  const lines = toLines(html);
  const rows = [];
  const seen = new Set();
  let section = "";
  for (let i = 0; i < lines.length; i += 1) {
    if (cfg.sectionRe && cfg.sectionRe.test(lines[i])) {
      section = lines[i];
      continue;
    }
    if (lines[i] !== cfg.anchor) continue;
    const buf = [];
    for (let j = i - 1; j >= Math.max(0, i - 6) && buf.length < 2; j -= 1) {
      const l = lines[j];
      if (!l || l === cfg.anchor || cfg.dropRe.test(l)) continue;
      buf.unshift(l);
    }
    if (buf.length < 2) continue;
    const name = tidyName(buf[buf.length - 2]);
    const street = tidyAddress(buf[buf.length - 1]);
    if (!nameIsUsable(name)) continue;
    if (!cfg.addressRe.test(street)) continue;
    if (cfg.sectionRe && cfg.sectionRe.test(name)) continue;
    const address = `${street}, ${cfg.locality}`;
    const category = categoryFor(name, section);
    const key = `${name.toLowerCase()}::${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      sourceKey: cfg.sourceKey,
      name,
      address,
      locality: cfg.locality,
      destination: cfg.locality,
      country: cfg.country,
      category,
      listingUrl,
      website: null,
      type: category,
      summary: `${name} is listed as a kosher ${category.toLowerCase()} by ${cfg.agency}. Confirm current supervision on the cited page before relying on it.`,
    });
  }
  return rows;
}

/* ---------- candidates ---------- */

const candidates = [
  {
    key: "phoenix-vaad",
    sourceKey: "phoenix-vaad",
    agency: "Greater Phoenix Vaad Hakashrus",
    locality: "Phoenix",
    country: "United States",
    urls: ["https://www.kosherphoenix.org/our-establishments"],
    expectRegion: /\bAZ\b/,
    selfAddress: /515 E Bethany Home/i,
    selfName: /vaad/i,
    namesFromHeadings: true,
    rejectName: /^(restaurants,|stores|eateries|our establishments)/i,
  },
  {
    key: "bene-emeth",
    mode: "triplet",
    sourceKey: "bene-emeth-buenos-aires",
    agency: "Bene Emeth Buenos Aires",
    locality: "Buenos Aires",
    country: "Argentina",
    urls: ["https://www.bene-emeth.org/kosher.html"],
    anchor: "Mapa",
    dropRe: /^(Llamar|Mapa|Web|Ver|Tel|Cargando.*|No se encontraron.*)$|^[\d\s()+-]{6,}$/i,
    addressRe: /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'\-]{2,45}\s+\d{1,5}\b/,
    sectionRe: /^(Carnicerías|Supermercados y Almacenes|Restaurantes y Comidas|Panaderías y Heladerías|Vinos y Otros)$/i,
  },
  {
    key: "oregon-kosher",
    sourceKey: "oregon-kosher",
    agency: "Oregon Kosher",
    locality: "Portland",
    country: "United States",
    urls: ["https://oregonkosher.org/restaurant-guide/", "https://oregonkosher.org/local-establishments/", "https://oregonkosher.org/"],
    follow: /restaurant|establishment|local/i,
    expectRegion: /\bOR\b|\bWA\b|Portland/i,
  },
  {
    key: "badatz-toronto",
    sourceKey: "badatz-toronto",
    agency: "BADATZ Toronto",
    locality: "Toronto",
    country: "Canada",
    urls: ["https://www.badatz.ca/certified-establishments/", "https://www.badatz.ca/restaurants/", "https://www.badatz.ca/"],
    follow: /establishment|restaurant|certified/i,
  },
  // --- new probes: North America ---
  { key: "louisiana-kashrut", sourceKey: "louisiana-kashrut", agency: "Louisiana Kashrut", locality: "New Orleans", country: "United States", urls: ["https://www.louisianakashrut.com/", "https://nolakosher.org/"], follow: /restaurant|establishment|certif/i },
  { key: "vaad-rochester", sourceKey: "vaad-rochester", agency: "Vaad Hakashrus of Rochester", locality: "Rochester", country: "United States", urls: ["https://www.vaadofrochester.org/", "https://rochesterkosher.org/"], follow: /restaurant|establishment|certif/i },
  { key: "vaad-ri", sourceKey: "vaad-rhode-island", agency: "Vaad Hakashrut of Rhode Island", locality: "Providence", country: "United States", urls: ["https://www.vaadri.org/", "https://www.rikosher.com/"], follow: /restaurant|establishment|certif/i },
  { key: "indy-kosher", sourceKey: "indianapolis-kosher", agency: "Indianapolis Beth Din", locality: "Indianapolis", country: "United States", urls: ["https://www.indykosher.org/", "https://indianapoliskosher.org/"], follow: /restaurant|establishment|certif/i },
  { key: "tucson-vaad", sourceKey: "tucson-vaad", agency: "Southern Arizona Kashrut", locality: "Tucson", country: "United States", urls: ["https://www.tucsonkosher.org/", "https://www.sakvaad.org/"], follow: /restaurant|establishment|certif/i },
  { key: "sacramento-vaad", sourceKey: "sacramento-vaad", agency: "Sacramento Kosher", locality: "Sacramento", country: "United States", urls: ["https://www.sacramentokosher.com/", "https://www.sackosher.org/"], follow: /restaurant|establishment|certif/i },
  { key: "kosher-winnipeg", sourceKey: "winnipeg-vaad", agency: "Winnipeg Kashruth Authority", locality: "Winnipeg", country: "Canada", urls: ["https://www.kosherwinnipeg.com/", "https://winnipegkosher.ca/"], follow: /restaurant|establishment|certif/i },
  { key: "calgary-kosher", sourceKey: "calgary-kosher", agency: "Calgary Kosher", locality: "Calgary", country: "Canada", urls: ["https://www.calgarykosher.ca/", "https://www.calgarykosher.com/"], follow: /restaurant|establishment|certif/i },
  // --- new probes: Europe ---
  { key: "geneva-cig", sourceKey: "geneva-cig", agency: "Communauté Israélite de Genève", locality: "Geneva", country: "Switzerland", urls: ["https://www.comisra.ch/cacherout/", "https://www.comisra.ch/"], follow: /cacher|kasher|kosher/i },
  { key: "basel-igb", sourceKey: "basel-igb", agency: "Israelitische Gemeinde Basel", locality: "Basel", country: "Switzerland", urls: ["https://www.igb.ch/koscher/", "https://www.igb.ch/"], follow: /koscher|kosher|kashrut/i },
  { key: "frankfurt-jg", sourceKey: "frankfurt-jg", agency: "Jüdische Gemeinde Frankfurt", locality: "Frankfurt", country: "Germany", urls: ["https://www.jg-ffm.de/koscher/", "https://www.jg-ffm.de/"], follow: /koscher|kosher/i },
  { key: "munich-ikg", sourceKey: "munich-ikg", agency: "IKG München", locality: "Munich", country: "Germany", urls: ["https://www.ikg-m.de/koscher/", "https://www.ikg-m.de/"], follow: /koscher|kosher/i },
  { key: "stockholm-jf", sourceKey: "stockholm-jf", agency: "Judiska Församlingen i Stockholm", locality: "Stockholm", country: "Sweden", urls: ["https://judiskaforsamlingen.se/kosher/", "https://judiskaforsamlingen.se/"], follow: /kosher|koscher/i },
  { key: "copenhagen-mt", sourceKey: "copenhagen-mt", agency: "Det Jødiske Samfund i Danmark", locality: "Copenhagen", country: "Denmark", urls: ["https://mosaiske.dk/kosher/", "https://mosaiske.dk/"], follow: /kosher|kosjer/i },
  { key: "madrid-cjm", sourceKey: "madrid-cjm", agency: "Comunidad Judía de Madrid", locality: "Madrid", country: "Spain", urls: ["https://www.cjmadrid.org/kosher/", "https://www.cjmadrid.org/"], follow: /kosher|casher|kashrut/i },
  { key: "barcelona-cib", sourceKey: "barcelona-cib", agency: "Comunitat Israelita de Barcelona", locality: "Barcelona", country: "Spain", urls: ["https://cibonline.org/kosher/", "https://cibonline.org/"], follow: /kosher|caixer|casher/i },
  { key: "athens-kis", sourceKey: "athens-kis", agency: "Central Board of Jewish Communities in Greece", locality: "Athens", country: "Greece", urls: ["https://kis.gr/en/kosher/", "https://kis.gr/"], follow: /kosher/i },
  { key: "istanbul-tky", sourceKey: "istanbul-turkyahudileri", agency: "Turkish Jewish Community", locality: "Istanbul", country: "Turkey", urls: ["https://www.turkyahudileri.com/kosher", "https://www.turkyahudileri.com/"], follow: /kosher|kaser/i },
  { key: "strasbourg-consistoire", sourceKey: "strasbourg-consistoire", agency: "Consistoire de Strasbourg", locality: "Strasbourg", country: "France", urls: ["https://www.consistoire-strasbourg.fr/cacherout/", "https://www.consistoire-strasbourg.fr/"], follow: /cacher|commerce|restaurant/i },
  { key: "lyon-consistoire", sourceKey: "lyon-consistoire", agency: "Consistoire de Lyon", locality: "Lyon", country: "France", urls: ["https://www.consistoirelyon.fr/cacherout/", "https://www.consistoirelyon.fr/"], follow: /cacher|commerce|restaurant/i },
  { key: "marseille-consistoire", sourceKey: "marseille-consistoire", agency: "Consistoire de Marseille", locality: "Marseille", country: "France", urls: ["https://www.consistoiredemarseille.fr/cacherout/", "https://www.consistoiredemarseille.fr/"], follow: /cacher|commerce|restaurant/i },
  // --- new probes: Latin America / Oceania ---
  { key: "santiago-cis", sourceKey: "santiago-cis", agency: "Comunidad Israelita de Santiago", locality: "Santiago", country: "Chile", urls: ["https://www.cis.cl/kosher/", "https://www.cis.cl/"], follow: /kosher|casher/i },
  { key: "montevideo-kehila", sourceKey: "montevideo-kehila", agency: "Kehilá Uruguay", locality: "Montevideo", country: "Uruguay", urls: ["https://www.kehila.org.uy/kosher/", "https://www.kehila.org.uy/"], follow: /kosher|casher/i },
  { key: "bogota-cih", sourceKey: "bogota-cih", agency: "Centro Israelita de Bogotá", locality: "Bogotá", country: "Colombia", urls: ["https://www.cih.org.co/kosher/", "https://www.cih.org.co/"], follow: /kosher|casher/i },
  { key: "auckland-ahc", sourceKey: "auckland-ahc", agency: "Auckland Hebrew Congregation", locality: "Auckland", country: "New Zealand", urls: ["https://www.ahc.org.nz/kosher", "https://www.ahc.org.nz/"], follow: /kosher|kashrut/i },
  { key: "brisbane-bhc", sourceKey: "brisbane-bhc", agency: "Brisbane Hebrew Congregation", locality: "Brisbane", country: "Australia", urls: ["https://www.brisbanehebrewcongregation.com/kosher", "https://www.brisbanehebrewcongregation.com/"], follow: /kosher|kashrut/i },
  // --- kosher operators with multiple branches ---
  { key: "gourmet-glatt", sourceKey: "kosher-operator-branches", agency: "Gourmet Glatt", locality: "New York", country: "United States", urls: ["https://www.gourmetglatt.com/locations/", "https://www.gourmetglatt.com/"], follow: /location|store/i, hint: "kosher supermarket" },
  { key: "seasons-kosher", sourceKey: "kosher-operator-branches", agency: "Seasons Kosher Supermarket", locality: "New York", country: "United States", urls: ["https://seasonskosher.com/pages/store-locations", "https://seasonskosher.com/"], follow: /location|store/i, hint: "kosher supermarket" },
  { key: "holy-schnitzel", sourceKey: "kosher-operator-branches", agency: "Holy Schnitzel", locality: "New York", country: "United States", urls: ["https://holyschnitzel.com/locations/", "https://holyschnitzel.com/"], follow: /location/i, hint: "kosher restaurant" },
];

/* ---------- run ---------- */

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const have = new Set(
  harvested.map((r) => `${r.name.toLowerCase()}::${(r.address || "").toLowerCase()}::${String(r.locality).toLowerCase()}`),
);
const results = [];
const newRows = [];

async function run(cfg) {
  const tried = [];
  let page = null;
  for (const url of cfg.urls) {
    const res = await get(url);
    tried.push(`${url} -> ${res.kind}${res.error ? ` (${res.error})` : ""}`);
    if (res.kind === "ok") {
      page = res;
      break;
    }
  }
  if (page && cfg.follow && !/restaurant|establishment|licensee|kosher|casher|cacher|koscher|kashrut|food|client|portfolio|location|store/i.test(page.url)) {
    const next = firstMatchingLink(page.text, page.url, cfg.follow);
    if (next) {
      const res = await get(next);
      tried.push(`${next} -> ${res.kind} (one follow)`);
      if (res.kind === "ok") page = res;
    }
  }
  if (!page) return { key: cfg.key, status: "blocked/failed", tried, rows: [] };
  const rows = cfg.mode === "triplet" ? parseTriplet(page.text, cfg, page.url) : parseGeneric(page.text, cfg, page.url);
  return { key: cfg.key, status: rows.length ? "parsed" : "parsed-0", url: page.url, tried, rows };
}

const chunkSize = 6;
for (let i = 0; i < candidates.length; i += chunkSize) {
  const chunk = candidates.slice(i, i + chunkSize);
  const settled = await Promise.all(
    chunk.map((cfg) => run(cfg).catch((e) => ({ key: cfg.key, status: "error", error: String(e).slice(0, 100), rows: [] }))),
  );
  for (const r of settled) {
    let kept = 0;
    for (const row of r.rows || []) {
      const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${String(row.locality).toLowerCase()}`;
      if (have.has(key)) continue;
      have.add(key);
      newRows.push(row);
      kept += 1;
    }
    results.push({
      key: r.key,
      status: r.status,
      url: r.url,
      parsed: (r.rows || []).length,
      kept,
      tried: r.tried,
      sample: (r.rows || []).slice(0, 6).map((x) => `${x.name} :: ${x.address} :: ${x.locality}`),
    });
    console.log(`[${r.key}] ${r.status} parsed=${(r.rows || []).length} kept=${kept} ${r.url || ""}`);
  }
}

if (!process.env.DRY_RUN) {
  fs.writeFileSync(OUT, JSON.stringify([...harvested, ...newRows], null, 2));
}
fs.writeFileSync(path.join(__dirname, "_raw", "wave8-report.json"), JSON.stringify({ added: newRows.length, results }, null, 2));
console.log(JSON.stringify({ added: newRows.length, total: harvested.length + newRows.length }, null, 2));
