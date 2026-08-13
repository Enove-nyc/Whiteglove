const r = await fetch("https://rccvaad.org/kosher-directory/", {
  headers: { "user-agent": "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)" },
  signal: AbortSignal.timeout(15000),
});
const t = await r.text();
const i = t.indexOf("Angel Bakery");
console.log("idx", i, "len", t.length);
console.log(t.slice(i, i + 1800));
