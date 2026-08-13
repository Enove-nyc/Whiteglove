const r = await fetch("https://queensvaad.org/kashrus/certified-establishments/", {
  headers: { "user-agent": "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)" },
  signal: AbortSignal.timeout(15000),
});
const t = await r.text();
const needle = "data-title=\"Elisha\"";
const i = t.indexOf(needle);
console.log("idx", i);
console.log(t.slice(i, i + 2500));
const pizza = t.indexOf("data-title=\"Pizza Palace\"");
console.log("\n--- pizza ---\n");
console.log(t.slice(pizza, pizza + 2500));
