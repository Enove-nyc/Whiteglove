import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * The site states things. It does not ask them.
 *
 * THE INSTRUCTION, in the owner's words: answer every question a visitor would
 * have had, without the question being on the site. Just the information.
 *
 * WHY IT MATTERS MORE THAN IT SOUNDS. A question printed on a page does two
 * things, and both are bad. It puts words in the reader's mouth — "What will
 * we eat?" tells somebody what they are supposed to be worrying about before
 * they were worrying about it. And it postpones the answer by one line, on a
 * page whose whole job is the answer. "Kosher food, wherever you go" is the
 * same section with the wondering taken out of it.
 *
 * There were thirty-eight of them. Six were the kosher-travel cards, six were
 * the pricing panel, and the rest were scattered across headings, form labels
 * and even API error strings that surface in the browser.
 *
 * FORM LABELS COUNT TOO, and that surprised me until I read them side by side.
 * "What kind of trip is it?" against "Kind of trip": the second is shorter,
 * reads like every other booking site, and asks nothing. A question mark in a
 * field label is a tell that the form was written as a conversation rather
 * than as a form.
 *
 * WHAT IS NOT COVERED. The admin is exempt — that IS a conversation with the
 * person maintaining the site, and a dropdown reading "reported — not checked
 * by us" is exactly right there.
 */

const OWNER_FACING =
  /Admin|Editor|Manager|Panel|Queue|Control|Wizard|Log|Test|Setup|Settings|Completeness|Drafts|Trail|Export|Review|Suggestion|Sms|DbSetup|AiConnection|Duffel|KeyTest/;

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "admin" || name === "node_modules") continue;
      found.push(...walk(full));
    } else if (full.endsWith(".tsx") || full.endsWith(".ts")) {
      found.push(full);
    }
  }
  return found;
}

const FILES = ["app", "components", "data", "lib"]
  .flatMap((dir) => walk(dir))
  .filter((path) => !OWNER_FACING.test(path.split("/").pop()!.replace(/\.tsx?$/, "")));

/**
 * The words a visitor reads: comments out, Tailwind out.
 *
 * Comments are stripped because this file's own reasoning quotes the questions
 * it removed, and several source files record what they used to say.
 */
function prose(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/className=(\{`[\s\S]*?`\}|"[^"]*")/g, "");
}

/** A sentence in a string literal, or JSX text, that ends in a question mark. */
function questionsIn(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/"([^"\n]{6,120}\?)"/g)) found.push(match[1]);
  // ACROSS LINES TOO. The first version of this matched single-line JSX text
  // only, and four questions survived it because prettier had wrapped them —
  // "Planning a heritage journey?" among them, on the front page. Found by
  // reading the rendered HTML rather than the source, which is why the
  // verification run reads pages as well as files.
  for (const match of text.matchAll(/>\s*([A-Z][^<>{}]{6,160}\?)\s*(?:<|\{"\s"\})/g)) {
    found.push(match[1].replace(/\s+/g, " ").trim());
  }
  // AND WITH AN INTERPOLATION IN THE MIDDLE. "Ready to book {destination.name}?"
  // survived both of the patterns above, on every one of the eighteen
  // destination pages, because the braces broke the match. Found by reading the
  // rendered page rather than the file — which is the third time that has been
  // the thing that found it.
  for (const match of text.matchAll(/>\s*([A-Z][^<>]{0,120}\{[^{}]+\}[^<>{}]{0,40}\?)\s*</g)) {
    found.push(match[1].replace(/\s+/g, " ").trim());
  }
  return found;
}

describe("nothing on the public site is phrased as a question", () => {
  it("is reading the real site rather than an empty list", () => {
    assert.ok(FILES.length > 150, `only ${FILES.length} files scanned`);
    assert.ok(FILES.includes("app/kosher-travel/page.tsx"));
    assert.ok(FILES.includes("components/ServicePricing.tsx"));
  });

  it("ASKS THE VISITOR NOTHING, IN A HEADING OR A LABEL", () => {
    const asked: string[] = [];
    for (const path of FILES) {
      for (const question of questionsIn(prose(path))) asked.push(`${path} — ${question}`);
    }
    assert.deepEqual(asked, [], `questions still printed at the visitor:\n${asked.join("\n")}`);
  });

  it("KEEPS THE INFORMATION, which is the whole point of removing them", () => {
    // The six kosher-travel cards are the test case: the questions went, the
    // subjects stayed, and each still leads somewhere that answers it.
    const page = prose("app/kosher-travel/page.tsx");
    for (const subject of [
      "Kosher food, wherever you go",
      "Which part of town to stay in",
      "Shabbos away from home",
      "Local drivers, guides and contacts",
      "Documents and border crossings",
      "The hechsher on a listing",
    ]) {
      assert.ok(page.includes(subject), `the card for "${subject}" lost its subject`);
    }
  });

  it("names the six pricing lines rather than asking them", () => {
    const pricing = prose("components/ServicePricing.tsx");
    for (const label of ["The fee", "What the fee depends on", "Time to a first reply", "Changes to a plan"]) {
      assert.ok(pricing.includes(label), `the pricing panel lost "${label}"`);
    }
    // Each one still reads a word the owner can edit, or the settings screen
    // grows a field that no page shows.
    for (const word of ["pricingStartsAt", "pricingWhatAffects", "pricingTurnaround", "pricingRevisions"]) {
      assert.ok(pricing.includes(`words.${word}`), `${word} is editable and shown nowhere`);
    }
  });

  it("LEAVES THE ADMIN ALONE, because that is a conversation with the owner", () => {
    // A kashrus dropdown reading "reported — not checked by us" is exactly
    // right on the screen of the person doing the checking.
    const admin = readFileSync("components/AddEntryForms.tsx", "utf8");
    assert.match(admin, /not checked by us/);
  });
});
