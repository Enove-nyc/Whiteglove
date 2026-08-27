import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-proxy-server"] });
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:3130/destinations/rome", { waitUntil: "networkidle", timeout: 90000 });
console.log(JSON.stringify(await page.evaluate(() => {
  const items = [...document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
  const idx = items.findIndex((el) => (el.textContent||"").trim().startsWith("Compare every place to stay"));
  return items.slice(Math.max(0, idx - 3), idx + 4).map((el) => ({
    text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 34),
    top: Math.round(el.getBoundingClientRect().top + window.scrollY),
    section: (() => { let n = el; while (n && n !== document.body) { if (n.tagName === "SECTION" || n.id) return (n.id ? "#" + n.id : "SECTION") + " " + String(n.className).slice(0, 40); n = n.parentElement; } return "?"; })(),
  }));
}), null, 1));
await b.close();
