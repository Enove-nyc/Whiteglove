/**
 * Wave 9 — sweep official Chabad community "kosher food" directory pages.
 *
 * The Chabad site template exposes a /en/food/ (or /food/) section that names
 * restaurants, kitchens, bakeries and kosher stores with street addresses.
 * Shul-only pages produce no rows because a name must sit beside an address.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchCandidate, parseGeneric } from "./_engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");

function chabad(city, country, domains, region = "europe") {
  const urls = [];
  for (const d of domains) {
    urls.push(`https://${d}/en/food/`, `https://${d}/food/`);
  }
  return {
    key: `chabad-${city.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    sourceKey: region === "asia" ? "chabad-food-asia" : region === "americas" ? "chabad-food-americas" : "chabad-food-europe",
    agency: `Chabad of ${city}`,
    locality: city,
    country,
    urls,
  };
}

const candidates = [
  // --- Europe ---
  chabad("Milan", "Italy", ["www.chabadmilano.org", "chabaditalia.com"]),
  chabad("Venice", "Italy", ["www.chabadvenezia.it", "chabadvenice.com"]),
  chabad("Florence", "Italy", ["www.chabadflorence.com"]),
  chabad("Munich", "Germany", ["www.chabadmunich.com", "chabadmuenchen.de"]),
  chabad("Frankfurt", "Germany", ["www.chabadfrankfurt.de", "chabadfrankfurt.com"]),
  chabad("Hamburg", "Germany", ["www.chabadhamburg.de"]),
  chabad("Dusseldorf", "Germany", ["www.chabad-duesseldorf.de"]),
  chabad("Geneva", "Switzerland", ["www.chabadgeneve.ch", "chabadgeneva.com"]),
  chabad("Lisbon", "Portugal", ["www.chabadportugal.com", "chabadlisbon.com"]),
  chabad("Porto", "Portugal", ["www.chabadporto.com"]),
  chabad("Athens", "Greece", ["www.chabadgreece.com", "chabadathens.com"]),
  chabad("Dublin", "Ireland", ["www.chabadireland.com", "chabaddublin.com"]),
  chabad("Edinburgh", "United Kingdom", ["www.chabadedinburgh.com", "chabadscotland.com"]),
  chabad("Stockholm", "Sweden", ["www.chabadstockholm.se", "chabadsweden.com"]),
  chabad("Copenhagen", "Denmark", ["www.chabaddenmark.com", "chabadcopenhagen.com"]),
  chabad("Oslo", "Norway", ["www.chabadnorway.com", "chabadoslo.com"]),
  chabad("Helsinki", "Finland", ["www.chabadfinland.com", "chabadhelsinki.com"]),
  chabad("Riga", "Latvia", ["www.chabadlatvia.org", "chabadriga.com"]),
  chabad("Vilnius", "Lithuania", ["www.chabadlithuania.com", "chabadvilnius.com"]),
  chabad("Tallinn", "Estonia", ["www.chabadestonia.com"]),
  chabad("Zagreb", "Croatia", ["www.chabadcroatia.com"]),
  chabad("Belgrade", "Serbia", ["www.chabadserbia.org", "chabadbelgrade.com"]),
  chabad("Sofia", "Bulgaria", ["www.chabadbulgaria.org", "chabadsofia.com"]),
  chabad("Nice", "France", ["www.chabadnice.com", "chabadcotedazur.com"]),
  chabad("Marbella", "Spain", ["www.chabadmarbella.com"]),
  chabad("Mallorca", "Spain", ["www.chabadmallorca.com"]),
  chabad("Luxembourg", "Luxembourg", ["www.chabadluxembourg.com"]),
  chabad("Malta", "Malta", ["www.chabadmalta.com"]),
  chabad("Larnaca", "Cyprus", ["www.chabadcyprus.org", "jewishcyprus.com"]),
  // --- Asia / Middle East ---
  chabad("Dubai", "United Arab Emirates", ["www.chabaduae.com", "jewishuae.com"], "asia"),
  chabad("Tokyo", "Japan", ["www.chabadjapan.org", "chabadtokyo.com"], "asia"),
  chabad("Seoul", "South Korea", ["www.chabadkorea.com"], "asia"),
  chabad("Singapore", "Singapore", ["www.chabadsingapore.com", "singaporejews.org"], "asia"),
  chabad("Taipei", "Taiwan", ["www.chabadtaiwan.org"], "asia"),
  chabad("Manila", "Philippines", ["www.chabadphilippines.com"], "asia"),
  chabad("Ho Chi Minh City", "Vietnam", ["www.chabadvietnam.org"], "asia"),
  chabad("Phnom Penh", "Cambodia", ["www.chabadcambodia.com"], "asia"),
  chabad("Bali", "Indonesia", ["www.chabadbali.com", "chabadindonesia.com"], "asia"),
  chabad("Kuala Lumpur", "Malaysia", ["www.chabadmalaysia.com"], "asia"),
  chabad("Tbilisi", "Georgia", ["www.chabadgeorgia.org"], "asia"),
  chabad("Baku", "Azerbaijan", ["www.chabadbaku.com"], "asia"),
  chabad("Almaty", "Kazakhstan", ["www.chabadkazakhstan.com"], "asia"),
  chabad("Tashkent", "Uzbekistan", ["www.chabaduzbekistan.com"], "asia"),
  chabad("Istanbul", "Turkey", ["www.chabadturkey.com", "chabadistanbul.com"], "asia"),
  // --- Americas / Africa / Oceania ---
  chabad("San Jose", "Costa Rica", ["www.chabadcostarica.com"], "americas"),
  chabad("Lima", "Peru", ["www.chabadperu.com"], "americas"),
  chabad("Santiago", "Chile", ["www.chabadchile.com"], "americas"),
  chabad("Montevideo", "Uruguay", ["www.chabaduruguay.com"], "americas"),
  chabad("Bogota", "Colombia", ["www.chabadcolombia.org", "chabadbogota.com"], "americas"),
  chabad("Quito", "Ecuador", ["www.chabadecuador.com"], "americas"),
  chabad("San Juan", "Puerto Rico", ["www.chabadpr.com"], "americas"),
  chabad("Santo Domingo", "Dominican Republic", ["www.chabaddr.com"], "americas"),
  chabad("Willemstad", "Curacao", ["www.chabadcuracao.com"], "americas"),
  chabad("Cancun", "Mexico", ["www.chabadcancun.com"], "americas"),
  chabad("Nairobi", "Kenya", ["www.chabadkenya.com"], "americas"),
  chabad("Casablanca", "Morocco", ["www.chabadmorocco.com"], "americas"),
  chabad("Cape Town", "South Africa", ["www.chabadcapetown.co.za"], "americas"),
  chabad("Auckland", "New Zealand", ["www.chabad.org.nz", "chabadauckland.com"], "americas"),
  chabad("Gold Coast", "Australia", ["www.chabadgoldcoast.com"], "americas"),
];

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const have = new Set(
  harvested.map((r) => `${r.name.toLowerCase()}::${(r.address || "").toLowerCase()}::${String(r.locality).toLowerCase()}`),
);
const results = [];
const newRows = [];

async function run(cfg) {
  const { page, tried } = await fetchCandidate(cfg);
  if (!page) return { key: cfg.key, status: "blocked/failed", tried, rows: [] };
  const rows = parseGeneric(page.text, cfg, page.url);
  return { key: cfg.key, status: rows.length ? "parsed" : "parsed-0", url: page.url, tried, rows };
}

const chunkSize = 8;
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
      sample: (r.rows || []).slice(0, 5).map((x) => `${x.name} :: ${x.address} :: ${x.locality}`),
    });
    if ((r.rows || []).length) console.log(`[${r.key}] ${r.status} parsed=${(r.rows || []).length} kept=${kept} ${r.url || ""}`);
  }
}

if (!process.env.DRY_RUN) fs.writeFileSync(OUT, JSON.stringify([...harvested, ...newRows], null, 2));
fs.writeFileSync(path.join(__dirname, "_raw", "wave9-report.json"), JSON.stringify({ added: newRows.length, results }, null, 2));
console.log(JSON.stringify({ added: newRows.length, total: harvested.length + newRows.length }, null, 2));
