/**
 * Direct entry to every destination URL.
 *
 * WHAT THIS IS FOR. Opening /vacation-ideas/rome from a search result — not by
 * clicking through from the hub — used to show "Loading vacation destinations…"
 * for several seconds and nothing else: the page was force-dynamic and read
 * every attraction, stay and quarter on the site before it would render a
 * heading that lives in a file. Clicking through hid it, because the previous
 * page stayed on screen. Only a cold request finds it, which is what this does.
 *
 * It checks the things a person and a search engine each need out of the FIRST
 * response, with no JavaScript run:
 *
 *   • 200, and the H1 is the destination's name
 *   • the summary paragraph is in the markup, not fetched afterwards
 *   • every section anchor is there
 *   • the page is not a loading shell
 *   • it is indexable — no noindex, and a canonical pointing at itself
 *
 * And that an address which is not a destination is a 404 rather than a page.
 *
 * Usage:  npm run build && npm run start &   then   npm run audit:destinations
 *         BASE=https://whiteglovekoshertravel.com npm run audit:destinations
 */

import { spawnSync } from "node:child_process";

const BASE = process.env.BASE || "http://localhost:3000";

/** The destination list, read through tsx so this stays the one source of it. */
function destinations() {
  const result = spawnSync(
    "npx",
    [
      "tsx",
      "-e",
      'import { vacationDestinations } from "@/data/vacation-destinations"; console.log(JSON.stringify(vacationDestinations.map((d) => ({ slug: d.slug, name: d.name, overview: d.overview }))));',
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr);
    process.exit(1);
  }
  return JSON.parse(result.stdout.trim());
}

/** Markup only. The RSC flight payload lives in <script> and is not the page. */
function markupOf(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, "");
}

function textOf(markup) {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ");
}

const SECTIONS = ["why-visit", "when-and-how-long", "where-to-stay", "things-to-do", "kosher-food", "shabbos", "getting-around", "cautions"];

async function main() {
  const list = destinations();
  const failures = [];

  for (const destination of list) {
    const path = `/destinations/${destination.slug}`;
    const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const html = await response.text();
    const markup = markupOf(html);
    const text = textOf(markup);

    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(markup);
    const heading = h1 ? textOf(h1[1]).trim() : null;
    const missingSections = SECTIONS.filter((id) => !markup.includes(`id="${id}"`));

    const problems = [];
    if (response.status !== 200) problems.push(`status ${response.status}`);
    if (heading !== destination.name) problems.push(`h1 is ${JSON.stringify(heading)}`);
    if (!text.includes(textOf(destination.overview).slice(0, 60).trim())) problems.push("the summary is not in the first response");
    if (missingSections.length) problems.push(`missing sections: ${missingSections.join(", ")}`);
    if (/name="robots"[^>]*noindex/.test(html)) problems.push("noindex");
    if (!html.includes(`rel="canonical" href="${BASE}${path}"`) && !html.includes(`rel="canonical" href="${path}"`)) {
      problems.push("no self-canonical");
    }

    if (problems.length) {
      failures.push(`${path} — ${problems.join("; ")}`);
      console.log(`FAIL ${path}\n     ${problems.join("\n     ")}`);
    } else {
      console.log(`ok   ${path}`);
    }
  }

  const missing = await fetch(`${BASE}/destinations/not-a-destination-at-all`, { redirect: "manual" });
  if (missing.status !== 404) {
    failures.push(`an unknown destination answered ${missing.status} rather than 404`);
    console.log(`FAIL /destinations/not-a-destination-at-all — status ${missing.status}, expected 404`);
  } else {
    console.log("ok   an unknown destination is a 404");
  }

  console.log(`\n${list.length} destinations, ${failures.length} findings.`);
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
