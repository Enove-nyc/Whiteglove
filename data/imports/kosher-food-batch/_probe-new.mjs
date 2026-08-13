/** One-shot probes for directories not already in the pack. 15s timeout. */
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)";
const T = 15000;
async function get(url, opts = {}) {
  try {
    const r = await fetch(url, {
      ...opts,
      headers: { "user-agent": UA, accept: "text/html,application/json,*/*", ...(opts.headers || {}) },
      signal: AbortSignal.timeout(T),
      redirect: "follow",
    });
    const text = await r.text();
    const blocked = /techloq|Just a moment|cf-mitigated/i.test(text.slice(0, 1500));
    let json = null;
    try {
      if (text.trim().startsWith("{") || text.trim().startsWith("[")) json = JSON.parse(text);
    } catch { /* not json */ }
    const n = Array.isArray(json)
      ? json.length
      : json?.result?.records?.length
        || json?.elements?.length
        || (json && typeof json === "object" ? Object.keys(json).length : null);
    console.log(JSON.stringify({
      url: url.slice(0, 100),
      status: r.status,
      blocked,
      len: text.length,
      n,
      keys: json && !Array.isArray(json) ? Object.keys(json).slice(0, 10) : null,
      hint: text.slice(0, 140).replace(/\s+/g, " "),
    }));
    return { status: r.status, blocked, text, json };
  } catch (e) {
    console.log(JSON.stringify({ url: url.slice(0, 100), fail: String(e.message || e).slice(0, 90) }));
    return null;
  }
}

const urls = [
  "https://ka.org.au/establishments",
  "https://www.ka.org.au/establishments",
  "https://www.kosher.org.au/consumers/eating-out/",
  "https://www.uos.co.za/kosher/eating-out",
  "https://www.kosherquest.org/wp-json/wp/v2/types",
  "https://www.seattlevaad.org/wp-json/wp/v2/types",
  "https://www.trianglek.org/wp-json/wp/v2/types",
  "https://www.rabc.org/wp-json/wp/v2/types",
  "https://capitolk.org/wp-json/wp/v2/types",
  "https://www.kosherphoenix.org/wp-json/wp/v2/types",
  "https://www.nik.nl/wp-json/wp/v2/types",
  "https://www.consistoire.org/wp-json/wp/v2/types",
  "https://data.gov.il/api/3/action/package_search?q=%D7%94%D7%A8%D7%91%D7%A0%D7%95%D7%AA&rows=15",
];
await Promise.all(urls.map((u) => get(u)));

const osm = `[out:json][timeout:12];nwr["diet:kosher"="yes"]["website"]["addr:street"](29.4,34.2,33.4,35.9);out tags 300;`;
await get("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: `data=${encodeURIComponent(osm)}`,
});
