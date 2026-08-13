import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "WhiteGloveKosherResearch/1.0";

function decode(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function makeRow(name, address, city) {
  const cleanName = decode(name);
  const locality = decode(city) || "Israel";
  const cleanAddress = decode(address) || locality;
  if (!cleanName || cleanName.length < 2) return null;
  if (/kosher[-\s]?style|israeli[-\s]?style/i.test(cleanName)) return null;
  return {
    sourceKey: "israel-kashrut-opendata",
    name: cleanName,
    address: `${cleanAddress}, ${locality}, Israel`,
    locality,
    destination: locality,
    country: "Israel",
    category: "Restaurant",
    listingUrl: "https://data.gov.il/dataset/kosherbusiness",
    website: null,
    type: "Restaurant",
    summary: `${cleanName} is listed as holding a kashrut certificate in Israel government open data. Confirm current supervision before relying on it.`,
  };
}

async function fetchT(url) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    return { ok: r.ok, status: r.status, text: await r.text() };
  } catch (error) {
    console.log("[fail]", url, error.message);
    return null;
  }
}

async function main() {
  const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const incoming = [];
  const resourceId = "c54032cb-5306-4be9-a20d-a0be0ba49cc1";
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&limit=32000`;
  const r = await fetchT(url);
  if (!r?.ok) {
    console.log("datastore fail", r?.status);
  } else if (r.text.trim().startsWith("<")) {
    console.log("datastore html", r.text.slice(0, 120));
  } else {
    const json = JSON.parse(r.text);
    const records = json.result?.records || [];
    const fields = (json.result?.fields || []).map((f) => f.id);
    console.log("records", records.length, "fields", fields);
    if (records[0]) console.log("sample", records[0]);
    const nameKeys = fields.filter((f) => /שם|name|esek|business|mosad/i.test(f));
    const addrKeys = fields.filter((f) => /כתובת|address|רחוב|street/i.test(f));
    const cityKeys = fields.filter((f) => /ישוב|city|עיר|yishuv/i.test(f));
    const nameKey = nameKeys[0] || fields.find((f) => f !== "_id") || "name";
    const addrKey = addrKeys[0];
    const cityKey = cityKeys[0];
    for (const rec of records) {
      const row = makeRow(rec[nameKey], addrKey ? rec[addrKey] : "", cityKey ? rec[cityKey] : "");
      if (row) incoming.push(row);
    }
  }

  const extra = await fetchT("https://data.gov.il/api/3/action/package_search?q=%D7%9B%D7%A9%D7%A8&rows=50");
  if (extra?.ok && extra.text.trim().startsWith("{")) {
    const json = JSON.parse(extra.text);
    const packages = json.result?.results || [];
    console.log("more packages", packages.map((p) => `${p.name}:${p.num_resources}`));
  }

  const seen = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${row.address.toLowerCase()}`));
  let added = 0;
  for (const row of incoming) {
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    harvested.push(row);
    added += 1;
  }
  fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
  console.log(JSON.stringify({ added, total: harvested.length, incoming: incoming.length }));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
