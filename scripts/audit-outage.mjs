// Does the site still work when the private store does not?
//
//   UPSTASH_REDIS_REST_URL=http://127.0.0.1:5999 UPSTASH_REDIS_REST_TOKEN=x \
//     npm run build && npx next start -p 3200
//   node scripts/audit-outage.mjs http://127.0.0.1:3200
//
// Point the store at a port with nothing on it — CONFIGURED BUT UNREACHABLE,
// which is what a real outage looks like. "Not configured at all" is a
// different case and one the site already handled; it is the blip that took
// the front page down.
//
// This exists because it happened. The homepage and the route planner both
// returned a 500 when the content store had a blip, and the reason was an
// advert: one uncaught fetch, in a helper nothing else in the codebase had
// left uncaught. Nothing in the other audits would have found it — every page
// is perfectly correct while the store is up.
//
// Every page here should come back 200. A page that renders without its
// adverts, without its visitor counts and without the owner's wording is a
// page somebody can still use; a 500 is not.

const BASE = process.argv[2] ?? "http://127.0.0.1:3200";

// The public site. Admin screens are deliberately not here: an administrator
// being told the store is down is correct, and is not the same failure.
const PAGES = [
  "/",
  "/itinerary",
  "/book",
  "/stops",
  "/cemeteries",
  "/directory",
  "/kosher",
  "/kosher-stays",
  "/getaways",
  "/services",
  "/map",
  "/contact",
  "/login",
  "/submit",
  "/account",
  "/command-center",
  "/travel-guide",
  "/attractions",
  "/tzaddikim",
  "/terms",
  "/privacy",
  "/uman",
  "/lizensk",
  "/flight-booking-assistance",
];

const bad = [];
for (const path of PAGES) {
  try {
    const response = await fetch(BASE + path, { redirect: "manual" });
    // A redirect is a decision the page made, not a failure.
    const ok = response.status < 400 || response.status === 404;
    if (!ok) bad.push(`${path} -> ${response.status}`);
    console.log(`${String(response.status).padEnd(4)} ${path}`);
  } catch (error) {
    bad.push(`${path} -> ${String(error).slice(0, 60)}`);
    console.log(`ERR  ${path} :: ${String(error).slice(0, 60)}`);
  }
}

console.log("");
if (bad.length) {
  console.log("===== PAGES THAT FAIL WITHOUT THE STORE =====");
  for (const line of bad) console.log("  " + line);
}
console.log(`TOTAL ${bad.length}`);
process.exit(bad.length ? 1 : 0);
