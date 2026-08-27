import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-proxy-server"] });
for (const [w,h] of [[320,568],[375,667],[390,844],[430,932],[768,1024],[1280,720]]) {
  const page = await b.newPage({ viewport: { width: w, height: h } });
  await page.goto("http://127.0.0.1:3130/destinations/rome", { waitUntil: "networkidle", timeout: 90000 });
  const r = await page.evaluate(() => {
    const insideFixed = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === "fixed") return true; return false; };
    const items = [...document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    const out = []; let prev = null, prevEl = null;
    for (const el of items.slice(0, 40)) {
      if (insideFixed(el)) continue;
      const t = Math.round(el.getBoundingClientRect().top + window.scrollY);
      if (prev !== null && t < prev - 200) out.push(`${(prevEl.textContent||"").trim().slice(0,26)} (${prev}) -> ${(el.textContent||el.getAttribute("aria-label")||"").trim().slice(0,26)} (${t})`);
      prev = t; prevEl = el;
    }
    return out;
  });
  console.log(String(w).padStart(4), r.length ? r.join(" | ") : "clean");
  await page.close();
}
await b.close();
