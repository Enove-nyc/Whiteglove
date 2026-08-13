import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "_raw");
const UA = "WhiteGloveKosherResearch/1.0";

const urls = [
  "https://chabadhungary.com/en/food/",
  "https://chabadhungary.com/en/food/92/",
  "https://chabadpoland.org/en/food/",
  "https://chabadvienna.com/en/food/",
  "https://www.jewishthailand.com/templates/articlecco_cdo/aid/3202590/jewish/Kosher-Food-in-Thailand.htm",
  "https://www.chabad.org/centers/default_cdo/country/France/jewish/Chabad-Lubavitch.htm",
  "https://www.consistoire.org/wp-json/wp/v2/types",
  "https://www.chabad.org/centers/default_cdo/country/Thailand/jewish/Chabad-Lubavitch.htm",
];

fs.mkdirSync(RAW, { recursive: true });

for (const url of urls) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(18000),
      redirect: "follow",
    });
    const t = await r.text();
    const slug = url.replace(/https?:\/\//, "").replace(/[^\w]+/g, "-").slice(0, 80);
    fs.writeFileSync(path.join(RAW, `probe-${slug}.html`), t.slice(0, 250000));
    console.log("---", r.status, t.length, r.url);
    console.log(t.slice(0, 350).replace(/\s+/g, " "));
    const foodLinks = [...t.matchAll(/href="([^"]*\/en\/food\/[^"]+)"/gi)].map((m) => m[1]);
    const unique = [...new Set(foodLinks)].slice(0, 20);
    if (unique.length) console.log("foodLinks", unique.length, unique.slice(0, 15));
    const articleLinks = [...t.matchAll(/href="([^"]*articlecco[^"]*Kosher[^"]*)"/gi)].map((m) => m[1]).slice(0, 8);
    if (articleLinks.length) console.log("articleLinks", articleLinks);
    const centerLinks = [...t.matchAll(/href="([^"]*jewish-centers\/[^"]+)"/gi)].map((m) => m[1]).slice(0, 8);
    if (centerLinks.length) console.log("centerLinks", centerLinks);
    if (t.trim().startsWith("{") || t.trim().startsWith("[")) console.log("json", t.slice(0, 600));
  } catch (error) {
    console.log("FAIL", url, error.message || error);
  }
}
