import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-proxy-server"] });
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:3130/destinations/rome", { waitUntil: "networkidle", timeout: 90000 });
const snap = async (when) => console.log(when, JSON.stringify(await page.evaluate(() =>
  ["overview","where-to-stay","things-to-do","kosher-food","shabbos","getting-around","reviews"].map((id) => {
    const el = document.getElementById(id);
    if (!el) return [id, "missing"];
    return [id, Math.round(el.getBoundingClientRect().top + window.scrollY), el.tagName, el.tagName === "DETAILS" ? el.open : ""];
  }))));
await snap("at networkidle:");
await page.waitForTimeout(3000);
await snap("3s later:    ");
await b.close();
