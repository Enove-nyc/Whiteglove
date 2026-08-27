import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-proxy-server"] });
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:3130/destinations/rome", { waitUntil: "networkidle", timeout: 90000 });
console.log(JSON.stringify(await page.evaluate(() => {
  const all = [...document.querySelectorAll('a[href], button:not([disabled])')];
  const visibleByOffset = all.filter((el) => el.offsetParent !== null);
  const inClosed = visibleByOffset.filter((el) => el.closest("details:not([open])"));
  const byCheck = visibleByOffset.filter((el) => typeof el.checkVisibility === "function" && !el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }));
  return {
    all: all.length,
    offsetParentVisible: visibleByOffset.length,
    insideClosedDetails: inClosed.length,
    failsCheckVisibility: byCheck.length,
    sample: inClosed.slice(0, 3).map((e) => (e.textContent || "").trim().slice(0, 28)),
  };
}), null, 1));
await b.close();
