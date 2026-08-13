import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "_raw");
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0; +https://whitegloveitineraries.com)";

const urls = [
  "https://chabadhungary.com/wp-json/wp/v2/types",
  "https://chabadhungary.com/wp-json/wp/v2/food?per_page=100",
  "https://chabadhungary.com/en/food/feed/",
  "https://chabadpoland.org/wp-json/wp/v2/food?per_page=100",
  "https://chabadprague.cz/en/food/",
  "https://www.chabad.cz/en/food/",
  "https://chabadberlin.de/en/food/",
  "https://www.jewishberlin.de/en/food/",
  "https://www.chabad.fr/en/food/",
  "https://www.chabad.nl/en/food/",
  "https://www.chabad.be/en/food/",
  "https://jewishrome.com/en/food/",
  "https://chabadbarcelona.org/en/food/",
  "https://chabadmadrid.com/en/food/",
  "https://www.chabad.ch/en/food/",
  "https://chabadkrakow.org/en/food/",
  "https://chabadthailand.co.il/restaurant/",
  "https://thailandkosher.com/shop/",
  "https://www.chabadjapan.com/en/food/",
  "https://www.chabadsingapore.com/en/food/",
  "https://www.chabadhongkong.org/en/food/",
  "https://www.chabadshanghai.org/en/food/",
  "https://www.chabadbeijing.com/en/food/",
  "https://www.chabadkorea.com/en/food/",
  "https://www.chabadnepal.com/en/food/",
  "https://www.chabadvietnam.com/en/food/",
  "https://www.jewishdubai.com/en/food/",
  "https://www.chabaduae.com/en/food/",
  "https://www.chabadistanbul.com/en/food/",
  "https://www.chabadofindia.com/en/food/",
  "https://www.kedassia.org/eating-out/",
  "https://www.ikg-muenchen.de/koscher/",
  "https://www.consistoire.org/restaurants-ouverts-pendant-le-deuxieme-confinement-novembre-2020/",
  "https://www.hamszadebrecen.hu/en",
  "https://chabadslovakia.com/en/food/",
  "https://www.jewishslovakia.com/en/food/",
];

fs.mkdirSync(RAW, { recursive: true });

for (const url of urls) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/json" },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    const t = await r.text();
    const blocked = /techloq|Just a moment|cf-mitigated|Forbidden/i.test(t.slice(0, 800));
    const flowiz = /inner-item food-type|item-name|themes\/flowiz/i.test(t);
    const names = [...t.matchAll(/<h3 class="item-name">\s*([^<]{2,80})\s*<\/h3>/gi)].map((m) => m[1].trim());
    console.log(
      JSON.stringify({
        status: r.status,
        bytes: t.length,
        blocked,
        flowiz,
        names: names.slice(0, 8),
        final: r.url.slice(0, 120),
        asked: url.slice(0, 90),
      }),
    );
    if (r.ok && !blocked && t.length > 500) {
      const slug = url.replace(/https?:\/\//, "").replace(/[^\w]+/g, "-").slice(0, 70);
      fs.writeFileSync(path.join(RAW, `ea2-${slug}.html`), t.slice(0, 250000));
    }
  } catch (error) {
    console.log(JSON.stringify({ asked: url.slice(0, 90), fail: String(error.message || error).slice(0, 80) }));
  }
}
