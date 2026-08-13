/**
 * Shared harvest engine for the kosher food review pack.
 *
 * A row is kept only when a real venue name sits next to a street address.
 * Everything else — headings, kashrus labels, descriptions, agency contact
 * blocks — is rejected. Rows are NEEDS_REVIEW leads, never publishable claims.
 */

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const STREET_RES = [
  /\d{1,6}[A-Za-z]?[,\s]+[^,;|]{1,70}?\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|blvd\.?|boulevard|lane|ln\.?|way|court|ct\.?|place|pl\.?|parkway|pkwy|highway|hwy|terrace|circle|crescent|close|square|sq\.?|row|walk|gardens|broadway|turnpike|pike)\b/i,
  /\b(?:rua|avenida|alameda|calle|carrera|paseo|avda|rue|via|viale|corso|piazza|strasse|straße|gasse|weg|platz|allee|straat|laan|plein|ulica|ulice|utca|rechov|sokak|caddesi|odos|leoforos)\s+[^,;|]{2,55}?\d{1,5}\b/i,
  /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}\b/,
];
const CITY_STATE_ZIP = /^([A-Za-z .'\-]{2,32}),\s*([A-Z]{2})\.?\s+(\d{5})(?:-\d{4})?$/;
const INLINE_CSZ = /,\s*([A-Za-z .'\-]{2,32}),\s*([A-Z]{2})\.?\s+\d{5}/;

export function streetMatch(line) {
  for (const re of STREET_RES) {
    const m = re.exec(line);
    if (m) return m;
  }
  return null;
}

const BAD_NAME =
  /^(address|phone|hours|tel|fax|website|email|e-mail|map|home|menu|copyright|contact|directions|open|closed|click|read more|view|search|about|donate|location|hechsher|supervision|status|updated|note|please|order|delivery|see |all |the following|certified|kashrus|kosher status|our |more info|learn more|share|follow|subscribe|sign up|login|next|previous|back to|posted|published|by |photo|image|download|print|español|english|deutsch|français)/i;
const JUNK =
  /copyright|compliance status|screen-reader|keyboard navigation|wcag|{{|cookie|privacy policy|all rights reserved|top of page|bottom of page|skip to|©|lorem ipsum/i;
const KASHRUS_WORDS =
  /^(dairy|meat|pareve|parve|milchig|fleishig|cholov yisroel|chalav yisrael|pas yisroel|pat yisrael|yoshon|bishul yisroel|glatt|mehadrin|kashrus type|kashrus details|additional hidurim|view certificate|certificate|restaurants?|bakeries|bakery|groceries|grocery|caterers?|eateries|markets?|butchers?|supermarkets?|delis?|cafes?|takeaway|hotels?|pizza|fish|synagogues?|shuls?|mikvah|kosher food|kosher|food|coming soon|n\/a|yes|no|available|more|less)$/i;
export const BLOCKED =
  /techloq|Just a moment|cf-mitigated|_Incapsula_Resource|Attention Required!|sorry, you have been blocked|enable javascript and cookies/i;

export async function get(url, timeout = 15000) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(timeout),
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

export function firstMatchingLink(html, pageUrl, re) {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!re.test(href)) continue;
    if (/\.(css|js|png|jpg|jpeg|gif|svg|pdf|json|xml)(\?|$)/i.test(href)) continue;
    if (/wp-json|wp-admin|mailto:|javascript:|\/feed|\/page\/\d/i.test(href)) continue;
    try {
      const abs = new URL(href, pageUrl).href;
      if (abs !== pageUrl) return abs;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function decode(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;|&#39;|&apos;/g, "'")
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/g, "-")
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

export function toLines(html) {
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

export function headingSet(html) {
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

export function tidyAddress(raw) {
  let a = decode(raw).split("|")[0];
  a = a.replace(/\b(tel|telephone|phone|ph|fax|call|whatsapp)\b\.?\s*:?.*$/i, "");
  a = a.replace(/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b.*$/, "");
  a = a.replace(/\s*[-–,;:]\s*$/, "");
  return a.replace(/\s+/g, " ").trim();
}

export function tidyName(raw) {
  return decode(raw)
    .replace(/^[-–—•*·\s]+/, "")
    .replace(/[:•\-–—,]+$/, "")
    .replace(/\s*\((?:located|inside|in the)[^)]*\)\s*$/i, "")
    .trim();
}

export function categoryFor(name, hint) {
  const t = `${name} ${hint || ""}`.toLowerCase();
  if (/baker|panader|padaria|confiter|patisser|cake|bagel|donut|cookie|challah|boulanger/.test(t)) return "Bakery";
  if (/butcher|carnicer|frigorif|meat market|boucher|metzger/.test(t)) return "Butcher";
  if (/market|grocer|supermerc|supermarket|mini-market|superette|kosher center|autoservicio|almac|epicerie|épicerie/.test(t)) return "Grocery";
  if (/cater|kitchen|takeaway|take-out|takeout|traiteur/.test(t)) return "Takeaway";
  if (/cafe|café|coffee|espresso|helader|ice cream|yogurt|gelat/.test(t)) return "Cafe";
  return "Restaurant";
}

export function nameIsUsable(name) {
  if (!name || name.length < 3 || name.length > 70) return false;
  if (!/[A-Za-zÀ-ÿ]{3}/.test(name)) return false;
  if (BAD_NAME.test(name) || JUNK.test(name) || KASHRUS_WORDS.test(name)) return false;
  if (/^https?:|@|^www\./i.test(name)) return false;
  if (/[.:!?]$/.test(name) && name.split(" ").length > 4) return false;
  if (streetMatch(name)) return false;
  if (/^\d/.test(name)) return false;
  if (
    /^(chabad|synagogue|shul|gemeinde|community|congregation|beth din|kehilla|vaad|va'ad|jewish)\b/i.test(name) &&
    !/restaurant|kitchen|dining|bakery|cafe|café|deli|food|grill|market|canteen/i.test(name)
  ) {
    return false;
  }
  return true;
}

function findName(lines, i, cfg, headings) {
  for (let j = i - 1; j >= Math.max(0, i - 8); j -= 1) {
    const line = lines[j];
    if (!line) continue;
    if (cfg.sectionRe && cfg.sectionRe.test(line)) return null;
    if (streetMatch(line)) continue;
    if (KASHRUS_WORDS.test(line)) continue;
    if (JUNK.test(line)) continue;
    if (/^https?:|^www\.|@/i.test(line)) continue;
    if (/^\(?\d[\d\s().+-]{6,}$/.test(line)) continue;
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

export function parseGeneric(html, cfg, listingUrl) {
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
    if (!/\b\d/.test(address)) continue;

    const category = categoryFor(name, cfg.hint);
    const key = `${name.toLowerCase()}::${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      sourceKey: cfg.sourceKey,
      name,
      address: /,/.test(address) ? address : `${address}, ${locality}`,
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

/** Probe a candidate's URLs in order, allowing at most one follow from a landing page. */
export async function fetchCandidate(cfg) {
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
  if (
    page &&
    cfg.follow &&
    !/restaurant|establishment|licensee|kosher|casher|cacher|koscher|kashrut|food|client|portfolio|location|store/i.test(page.url)
  ) {
    const next = firstMatchingLink(page.text, page.url, cfg.follow);
    if (next) {
      const res = await get(next);
      tried.push(`${next} -> ${res.kind} (one follow)`);
      if (res.kind === "ok") page = res;
    }
  }
  return { page, tried };
}
