import { existsSync, readdirSync, readFileSync } from "node:fs";
if (existsSync("journey-results")) for (const dir of readdirSync("journey-results")) {
  const path = "journey-results/" + dir + "/report.json";
  if (!existsSync(path)) continue;
  const report = JSON.parse(readFileSync(path, "utf8"));
  console.log("RUNTIME_BROWSER_RESULT", JSON.stringify({ brand: report.brand, passed: report.scenarios.filter(s => s.status === "passed").length, failed: report.scenarios.filter(s => s.status !== "passed"), errors: report.errors, accessibility: report.accessibility.flatMap(s => s.violations) }));
  for (const name of ["home-390.jpg", "home-1280.jpg", "country-search-opens-an-actual-filtered-list-on-a-phone.jpg", "new-city-search-opens-its-own-sights-without-a-full-guide.jpg", "expanded-country-directory-remains-readable-on-desktop.jpg"]) {
    const file = "journey-results/" + dir + "/" + name;
    if (existsSync(file)) console.log("SITE_PREVIEW_IMAGE|" + report.brand + "|" + name + "|" + readFileSync(file).toString("base64"));
  }
}
