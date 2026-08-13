/**
 * Europe + Asia kosher food harvest: Chabad food directories and kitchens
 * (restaurants, stores, kitchens — not shul-only centers), plus European
 * certifier lists. Appends to _harvested.json.
 *
 * Run: node data/imports/kosher-food-batch/harvest-europe-asia.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const RAW = path.join(__dirname, "_raw");
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)";
const TIMEOUT_MS = 15000;
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|jewish[-\s]?style/i;
const SKIP_LISTING = /product list|kosher app\b|whatsapp|visitor info|^hotels$|^prayers$|^attractions$/i;
const SHUL_ONLY = /synagogue|shul|minyan|mikvah|services only/i;
const FOOD_OFFER = /restaurant|kitchen|bakery|grocery|store|market|meals|food|pizzeria|cafe|cafeteria|takeaway|take-out|makolet|supermarket|butcher|deli|cater|wine|ice cream/i;

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#038;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blocked(text, url) {
  const head = (text || "").slice(0, 1200);
  return /techloq|Just a moment|cf-mitigated|filter\.techloq/i.test(head) || /filter\.techloq/.test(url || "");
}

async function fetchT(url, timeout = TIMEOUT_MS) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/json" },
      signal: AbortSignal.timeout(timeout),
      redirect: "follow",
    });
    return { ok: r.ok, status: r.status, url: r.url, text: await r.text() };
  } catch (error) {
    console.log(`[fail] ${url} ${error.message || error}`);
    return null;
  }
}

function categoryFrom(text) {
  const t = (text || "").toLowerCase();
  if (/butcher|boucher/.test(t)) return "Butcher";
  if (/baker|patiss|ice cream/.test(t)) return "Bakery";
  if (/grocery|store|market|makolet|shoppe|supermarket|wine/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|dairy/.test(t)) return "Cafe";
  if (/take|cater|kitchen/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow({ sourceKey, agency, name, address, locality, country, region, type, listingUrl, website }) {
  const cleanName = decode(name);
  const cleanAddress = decode(address);
  if (!cleanName || SKIP_NAME.test(cleanName) || SKIP_LISTING.test(cleanName)) return null;
  if (SHUL_ONLY.test(cleanName) && !FOOD_OFFER.test(cleanName)) return null;
  if (!cleanAddress || cleanAddress.length < 8) return null;
  if (/type_text|color_link|<|>/.test(cleanAddress)) return null;
  if (!/\d/.test(cleanAddress) && !/(utca|street|str\.|road|rue |via |ul\.|carrer|platz|avenue)/i.test(cleanAddress)) return null;
  const category = categoryFrom(`${type} ${cleanName}`);
  return {
    sourceKey,
    name: cleanName,
    address: cleanAddress,
    locality,
    destination: locality,
    country,
    category,
    listingUrl,
    website: website || null,
    type: decode(type || category),
    region,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by ${agency}. Confirm current supervision on the cited page before relying on it.`,
  };
}

const FOOD_PAGES = [
  { url: "https://chabadhungary.com/en/food/", locality: "Budapest", country: "Hungary", region: "Europe" },
  { url: "https://chabadpoland.org/en/food/", locality: "Warsaw", country: "Poland", region: "Europe" },
  { url: "https://chabadbarcelona.org/en/food/", locality: "Barcelona", country: "Spain", region: "Europe" },
  { url: "https://chabadvienna.com/en/food/", locality: "Vienna", country: "Austria", region: "Europe" },
  { url: "https://chabadprague.cz/en/food/", locality: "Prague", country: "Czech Republic", region: "Europe" },
  { url: "https://chabadmadrid.org/en/food/", locality: "Madrid", country: "Spain", region: "Europe" },
  { url: "https://www.jewishmadrid.com/en/food/", locality: "Madrid", country: "Spain", region: "Europe" },
  { url: "https://chabadmalaga.org/en/food/", locality: "Malaga", country: "Spain", region: "Europe" },
  { url: "https://chabadmarbella.org/en/food/", locality: "Marbella", country: "Spain", region: "Europe" },
  { url: "https://chabadtenerife.org/en/food/", locality: "Tenerife", country: "Spain", region: "Europe" },
  { url: "https://chabadvalencia.org/en/food/", locality: "Valencia", country: "Spain", region: "Europe" },
  { url: "https://chabadibiza.org/en/food/", locality: "Ibiza", country: "Spain", region: "Europe" },
  { url: "https://chabadlisbon.org/en/food/", locality: "Lisbon", country: "Portugal", region: "Europe" },
  { url: "https://chabadporto.org/en/food/", locality: "Porto", country: "Portugal", region: "Europe" },
  { url: "https://jewishrome.com/en/food/", locality: "Rome", country: "Italy", region: "Europe" },
  { url: "https://jewishvenice.org/en/food/", locality: "Venice", country: "Italy", region: "Europe" },
  { url: "https://chabadmilan.org/en/food/", locality: "Milan", country: "Italy", region: "Europe" },
  { url: "https://chabadflorence.org/en/food/", locality: "Florence", country: "Italy", region: "Europe" },
  { url: "https://www.chabad.nl/en/food/", locality: "Amsterdam", country: "Netherlands", region: "Europe" },
  { url: "https://www.chabad.be/en/food/", locality: "Brussels", country: "Belgium", region: "Europe" },
  { url: "https://chabadantwerp.org/en/food/", locality: "Antwerp", country: "Belgium", region: "Europe" },
  { url: "https://chabadberlin.de/en/food/", locality: "Berlin", country: "Germany", region: "Europe" },
  { url: "https://chabadmunich.org/en/food/", locality: "Munich", country: "Germany", region: "Europe" },
  { url: "https://chabadfrankfurt.org/en/food/", locality: "Frankfurt", country: "Germany", region: "Europe" },
  { url: "https://www.chabad.fr/en/food/", locality: "Paris", country: "France", region: "Europe" },
  { url: "https://chabadlyon.org/en/food/", locality: "Lyon", country: "France", region: "Europe" },
  { url: "https://chabadmarseille.org/en/food/", locality: "Marseille", country: "France", region: "Europe" },
  { url: "https://chabadnice.org/en/food/", locality: "Nice", country: "France", region: "Europe" },
  { url: "https://chabadstrasbourg.org/en/food/", locality: "Strasbourg", country: "France", region: "Europe" },
  { url: "https://www.chabad.ch/en/food/", locality: "Zurich", country: "Switzerland", region: "Europe" },
  { url: "https://chabadgeneva.ch/en/food/", locality: "Geneva", country: "Switzerland", region: "Europe" },
  { url: "https://www.chabad.gr/en/food/", locality: "Athens", country: "Greece", region: "Europe" },
  { url: "https://chabadathens.org/en/food/", locality: "Athens", country: "Greece", region: "Europe" },
  { url: "https://www.chabad.se/en/food/", locality: "Stockholm", country: "Sweden", region: "Europe" },
  { url: "https://www.chabad.dk/en/food/", locality: "Copenhagen", country: "Denmark", region: "Europe" },
  { url: "https://www.chabad.ie/en/food/", locality: "Dublin", country: "Ireland", region: "Europe" },
  { url: "https://www.chabad.ro/en/food/", locality: "Bucharest", country: "Romania", region: "Europe" },
  { url: "https://chabadwroclaw.org/en/food/", locality: "Wrocław", country: "Poland", region: "Europe" },
  { url: "https://chabadkrakow.pl/en/food/", locality: "Kraków", country: "Poland", region: "Europe" },
  { url: "https://jewishkrakow.org/en/food/", locality: "Kraków", country: "Poland", region: "Europe" },
  { url: "https://chabadslovakia.com/en/food/", locality: "Bratislava", country: "Slovakia", region: "Europe" },
  { url: "https://www.jewishslovakia.com/en/food/", locality: "Bratislava", country: "Slovakia", region: "Europe" },
  { url: "https://www.consistoire.org/restaurants-ouverts-pendant-le-deuxieme-confinement-novembre-2020/", locality: "Paris", country: "France", region: "Europe" },
  { url: "https://www.hamszadebrecen.hu/en", locality: "Debrecen", country: "Hungary", region: "Europe" },
  { url: "https://thailandkosher.com/shop/", locality: "Bangkok", country: "Thailand", region: "Asia" },
  { url: "https://thailandkosher.com/product-tag/kosher-restaurants-in-bangkok/", locality: "Bangkok", country: "Thailand", region: "Asia" },
  { url: "https://thailandkosher.com/product-tag/kosher-restaurants-in-phuket/", locality: "Phuket", country: "Thailand", region: "Asia" },
  { url: "https://thailandkosher.com/product-tag/kosher-restaurants-in-koh-samui/", locality: "Koh Samui", country: "Thailand", region: "Asia" },
  { url: "https://thailandkosher.com/product-tag/kosher-restaurants-in-chiang-mai/", locality: "Chiang Mai", country: "Thailand", region: "Asia" },
  { url: "https://thailandkosher.com/product-tag/kosher-restaurants-in-pattaya/", locality: "Pattaya", country: "Thailand", region: "Asia" },
  { url: "https://chabadthailand.co.il/restaurant/", locality: "Bangkok", country: "Thailand", region: "Asia" },
  { url: "https://chabadbangkok.com/en/food/", locality: "Bangkok", country: "Thailand", region: "Asia" },
  { url: "https://chabadphuket.com/en/food/", locality: "Phuket", country: "Thailand", region: "Asia" },
  { url: "https://chabadchiangmai.com/en/food/", locality: "Chiang Mai", country: "Thailand", region: "Asia" },
  { url: "https://www.chabadjapan.com/en/food/", locality: "Tokyo", country: "Japan", region: "Asia" },
  { url: "https://www.jewishjapan.com/en/food/", locality: "Tokyo", country: "Japan", region: "Asia" },
  { url: "https://www.chabadsingapore.com/en/food/", locality: "Singapore", country: "Singapore", region: "Asia" },
  { url: "https://www.chabadhongkong.org/en/food/", locality: "Hong Kong", country: "China", region: "Asia" },
  { url: "https://www.chabadbeijing.com/en/food/", locality: "Beijing", country: "China", region: "Asia" },
  { url: "https://www.chabadshanghai.org/en/food/", locality: "Shanghai", country: "China", region: "Asia" },
  { url: "https://www.chabadkorea.com/en/food/", locality: "Seoul", country: "South Korea", region: "Asia" },
  { url: "https://www.chabadnepal.com/en/food/", locality: "Kathmandu", country: "Nepal", region: "Asia" },
  { url: "https://www.chabadvietnam.com/en/food/", locality: "Ho Chi Minh City", country: "Vietnam", region: "Asia" },
  { url: "https://www.chabadofindia.com/en/food/", locality: "Mumbai", country: "India", region: "Asia" },
  { url: "https://www.chabaddelhi.com/en/food/", locality: "Delhi", country: "India", region: "Asia" },
  { url: "https://www.jewishdubai.com/en/food/", locality: "Dubai", country: "United Arab Emirates", region: "Asia" },
  { url: "https://www.chabaduae.com/en/food/", locality: "Dubai", country: "United Arab Emirates", region: "Asia" },
  { url: "https://www.chabadistanbul.com/en/food/", locality: "Istanbul", country: "Turkey", region: "Asia" },
];

function parseFlowizFoodIndex(html, page) {
  const rows = [];
  const sourceKey = page.region === "Asia" ? "chabad-food-asia" : "chabad-food-europe";
  const agency = `Chabad of ${page.locality}`;
  const cards = [...html.matchAll(/<a href="([^"]+\/(?:en\/)?food\/\d+\/?)"[\s\S]{0,2500}?<\/a>/gi)];
  for (const m of cards) {
    const listingUrl = m[1];
    const block = m[0];
    const name = decode((block.match(/<h3 class="item-name">\s*([^<]+)/i) || [])[1] || "");
    const address = decode((block.match(/<span class="item-text">\s*([^<]+)/i) || [])[1] || "");
    const type = decode((block.match(/<div class="item-tag">[\s\S]*?<span>([^<]+)/i) || [])[1] || "");
    const row = makeRow({
      sourceKey,
      agency,
      name,
      address,
      locality: page.locality,
      country: page.country,
      region: page.region,
      type,
      listingUrl,
    });
    if (row) rows.push(row);
  }
  const houseAddr = decode((html.match(/<div class="address-box">([^<]+)/i) || [])[1] || "");
  const offersMeals = /shabbat and holidays meals|kosher kitchen|kosher food @ chabad|meals arranged|catering/i.test(html);
  if (rows.length === 0 && offersMeals && houseAddr) {
    const row = makeRow({
      sourceKey,
      agency,
      name: `Chabad of ${page.locality} — kosher kitchen`,
      address: houseAddr,
      locality: page.locality,
      country: page.country,
      region: page.region,
      type: "Takeaway",
      listingUrl: page.url,
    });
    if (row) rows.push(row);
  } else if (offersMeals && houseAddr && !rows.some((r) => /chabad of /i.test(r.name) && /kitchen|cater/i.test(r.name))) {
    const row = makeRow({
      sourceKey,
      agency,
      name: `Chabad of ${page.locality} — kosher kitchen`,
      address: houseAddr,
      locality: page.locality,
      country: page.country,
      region: page.region,
      type: "Takeaway",
      listingUrl: page.url,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseConsistoireHtml(html) {
  const rows = [];
  const listingUrl = "https://www.consistoire.org/restaurants-ouverts-pendant-le-deuxieme-confinement-novembre-2020/";
  for (const m of html.matchAll(/<(?:h[2-4]|strong|b)[^>]*>([^<]{2,80})<\/(?:h[2-4]|strong|b)>[\s\S]{0,300}?(\d[^<]{6,90}(?:Paris|Paris \d{1,2}e|France)[^<]{0,40})/gi)) {
    const row = makeRow({
      sourceKey: "beth-din-paris",
      agency: "Beth Din de Paris / Consistoire",
      name: m[1],
      address: `${decode(m[2])}, France`,
      locality: "Paris",
      country: "France",
      region: "Europe",
      type: "Restaurant",
      listingUrl,
    });
    if (row) rows.push(row);
  }
  for (const m of html.matchAll(/<li[^>]*>\s*<[^>]+>([^<]{2,80})<\/[^>]+>\s*[,–-]\s*([^<]{8,90})/gi)) {
    const row = makeRow({
      sourceKey: "beth-din-paris",
      agency: "Beth Din de Paris / Consistoire",
      name: m[1],
      address: `${decode(m[2])}, France`,
      locality: "Paris",
      country: "France",
      region: "Europe",
      type: "Restaurant",
      listingUrl,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseHamsza(html, page) {
  const addr =
    decode((html.match(/Piac(?:\s+utca|\s+street)[^<,]{0,40}/i) || [])[0] || "") ||
    "Piac street, Debrecen, Hungary";
  const row = makeRow({
    sourceKey: "chabad-food-europe",
    agency: "Chabad of Debrecen",
    name: "Hamsza Restaurant",
    address: /debrecen/i.test(addr) ? addr : `${addr}, Debrecen, Hungary`,
    locality: page.locality,
    country: page.country,
    region: page.region,
    type: "Restaurant",
    listingUrl: page.url,
    website: page.url,
  });
  return row ? [row] : [];
}

function parseThailandShop(html, page) {
  const rows = [];
  const cards = [...html.matchAll(/<li[^>]*class="[^"]*product[^"]*"[\s\S]{0,2000}?<\/li>/gi)].slice(0, 80);
  for (const m of cards) {
    const name = decode((m[0].match(/class="woocommerce-loop-product__title"[^>]*>([^<]+)/i) || m[0].match(/<h2[^>]*>([^<]+)/i) || [])[1] || "");
    const href = (m[0].match(/href="(https?:\/\/thailandkosher\.com\/product\/[^"]+)"/i) || [])[1];
    if (!name || /hotel|villa|apartment|tour|guide/i.test(name)) continue;
    if (!FOOD_OFFER.test(name) && !/kosher|chabad|jcafe|meat|dairy|pizza/i.test(name)) continue;
    const row = makeRow({
      sourceKey: "chabad-food-asia",
      agency: "Chabad of Thailand / Thailand Kosher",
      name,
      address: `${name}, ${page.locality}, ${page.country}`,
      locality: page.locality,
      country: page.country,
      region: page.region,
      type: "Restaurant",
      listingUrl: href || page.url,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parsePage(html, page) {
  if (blocked(html, page.url)) return [];
  if (/hamszadebrecen/.test(page.url)) return parseHamsza(html, page);
  if (/consistoire\.org/.test(page.url)) return parseConsistoireHtml(html);
  if (/thailandkosher\.com/.test(page.url)) {
    const shop = parseThailandShop(html, page);
    const flowiz = parseFlowizFoodIndex(html, page);
    return [...shop, ...flowiz];
  }
  return parseFlowizFoodIndex(html, page);
}

function loadSavedHtml(page) {
  const files = fs.readdirSync(RAW).filter((f) => f.endsWith(".html"));
  const host = page.url.replace(/https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  const pathHint = page.url.replace(/https?:\/\//, "").replace(/[^\w]+/g, "-").slice(0, 70);
  for (const file of files) {
    if (file.includes(pathHint) || (file.includes(host.replace(/\./g, "-")) && /food|restaurant|hamsza|consistoire|thailandkosher/.test(file))) {
      const text = fs.readFileSync(path.join(RAW, file), "utf8");
      if (text.length > 2000 && !blocked(text, file)) return text;
    }
  }
  return null;
}

async function main() {
  fs.mkdirSync(RAW, { recursive: true });
  const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
  console.log("before", harvested.length);
  const incoming = [];

  for (const page of FOOD_PAGES) {
    let html = loadSavedHtml(page);
    if (!html) {
      const r = await fetchT(page.url, TIMEOUT_MS);
      if (!r?.ok || blocked(r.text, r.url)) {
        console.log(`[miss] ${r?.status || "fail"} ${page.url}`);
        continue;
      }
      html = r.text;
      const slug = page.url.replace(/https?:\/\//, "").replace(/[^\w]+/g, "-").slice(0, 70);
      fs.writeFileSync(path.join(RAW, `ea-${slug}.html`), html.slice(0, 250000));
      console.log(`[ok] ${r.status} ${html.length}b ${page.locality}`);
    } else {
      console.log(`[saved] ${page.locality} ${page.url}`);
    }
    const rows = parsePage(html, page);
    console.log(`[rows] ${page.locality} ${rows.length}`);
    incoming.push(...rows);
  }

  const seen = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
  let added = 0;
  const europe = [];
  const asia = [];
  const chabad = [];
  for (const row of incoming) {
    const key = `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`;
    if (seen.has(key)) continue;
    seen.add(key);
    harvested.push(row);
    added += 1;
    if (row.region === "Europe") europe.push(row);
    if (row.region === "Asia") asia.push(row);
    if (/chabad/i.test(row.name) || /^chabad-food/.test(row.sourceKey)) chabad.push(row);
  }
  fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
  const bySource = {};
  for (const row of harvested) bySource[row.sourceKey] = (bySource[row.sourceKey] || 0) + 1;
  console.log(JSON.stringify({
    added,
    total: harvested.length,
    thisWaveEurope: europe.length,
    thisWaveAsia: asia.length,
    thisWaveChabad: chabad.length,
    bySource,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .then(() => process.exit(0));
