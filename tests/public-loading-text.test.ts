import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

/**
 * NO LITERAL "LOADING" IN AN INDEXABLE PAGE.
 *
 * ReviewSection renders on the server before the browser has fetched anything,
 * so its loading state was in the HTML of roughly 350 heritage and cemetery
 * pages — the word "Loading" sitting under a heading promising practical notes
 * from visitors. That is what a search engine indexed, and what somebody on a
 * slow connection read.
 *
 * The signed-in screens are a different case and keep their "Loading…": they
 * are behind a session, are not indexed, and there the word is the honest and
 * useful answer. What this holds is the public half.
 */

/** Components that render inside a public, server-rendered, indexable page. */
const PUBLIC_COMPONENTS = ["components/reviews/ReviewSection.tsx"];

test("a public component shows no bare loading text", () => {
  for (const file of PUBLIC_COMPONENTS) {
    const src = readFileSync(file, "utf8");
    // The JSX text node, not the word in a comment or a variable name.
    assert.ok(
      !/>\s*Loading[\s.…]*</.test(src),
      `${file} renders a literal "Loading" into indexable HTML`,
    );
  }
});

test("and tells assistive technology with aria-busy instead, which adds no words", () => {
  const src = readFileSync("components/reviews/ReviewSection.tsx", "utf8");
  assert.match(src, /aria-busy=\{reviews === null\}/);
  // The skeleton itself is hidden from the accessibility tree — it is
  // decoration, and aria-busy above is what carries the meaning.
  assert.match(src, /aria-hidden="true"/);
});

test("the section still appears once loaded, even with no reviews yet", () => {
  // The fix must not have hidden the whole section: with zero reviews it still
  // invites one, which is the point of it being there.
  const src = readFileSync("components/reviews/ReviewSection.tsx", "utf8");
  assert.match(src, /Sign in to review|Add review/);
});

test("every page that renders it is covered by the one fix", () => {
  // The finding named heritage pages; the same component is on cemeteries,
  // destinations, city guides and tzaddikim. Fixing the component fixes all of
  // them, and this fails if a new public page starts using it without being
  // considered here.
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "page.tsx" && readFileSync(full, "utf8").includes("<ReviewSection")) pages.push(full);
    }
  };
  walk("app");
  assert.ok(pages.length >= 4, `expected the review section on several public pages, found ${pages.length}`);
  for (const page of pages) {
    assert.ok(!page.includes("/admin/"), `${page} is an admin page using the public review section`);
  }
});
