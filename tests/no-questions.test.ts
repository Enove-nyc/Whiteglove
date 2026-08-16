import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * The site answers rather than interrogates. It is allowed a question mark.
 *
 * THE INSTRUCTION, and I got it wrong the first time. The owner asked for the
 * site to answer what a visitor would have wondered, without the wondering
 * printed on the page. I turned that into a ban on question marks and swept
 * every one off the site, including "Ready to book Rome?" — which he then had
 * to point out sounds like a normal travel website, because it does.
 *
 * SO THE RULE IS ABOUT WHICH QUESTION, NOT ABOUT PUNCTUATION.
 *
 * BANNED — a question that is not the visitor's:
 *   "What will we eat?" over a section about kosher food. It puts words in
 *   somebody's mouth and postpones the answer by a line, on a page whose whole
 *   job is the answer. "Kosher food, wherever you go" is the same section with
 *   the wondering taken out.
 *
 *   "See something to fix?", "Are you one of these businesses?" — a customer
 *   being asked to do our work, on a page they came to read.
 *
 *   "Not sure where to begin?", "Would rather not do this part?" — the site
 *   telling a visitor they are struggling.
 *
 * ALLOWED — a question the visitor is already asking, at the moment they are
 * asking it:
 *   "Ready to book Rome?" at the foot of a destination page.
 *   "Planning a heritage journey?" beside the link for somebody who is.
 *
 * Both of those name the reader's own next move. Neither can be rewritten as a
 * statement without sounding like a brochure. The banned list below is
 * explicit and small, and each entry earned its place by being wrong on a real
 * page; the allowed ones are asserted PRESENT, so nobody flattens them again —
 * which is what I did.
 */

const OWNER_FACING =
  /Admin|Editor|Manager|Panel|Queue|Control|Wizard|Log|Test|Setup|Settings|Completeness|Drafts|Trail|Export|Review|Suggestion|Sms|DbSetup|AiConnection|Duffel|KeyTest/;

/** Questions that belong to us, or to nobody, rather than to the reader. */
const NOT_THE_VISITORS: Array<[RegExp, string]> = [
  // Wondering put into the reader's mouth above the answer.
  [/What will we eat\?/i, "asks the reader what they are worrying about"],
  [/Which part of town do we stay in\?/i, "same"],
  [/What happens on Shabbos\?/i, "same"],
  [/Who do we ask locally\?/i, "same"],
  [/What do we need at the border\?/i, "same"],
  [/Whose hechsher is that\?/i, "same"],
  [/What people actually ask/i, "a page about what people ask, instead of the answers"],
  // A customer asked to do our work.
  [/See something to fix\?/i, "asks the visitor to proofread"],
  [/Something wrong here\?/i, "asks the visitor to proofread"],
  [/Been here\?/i, "asks the visitor for photographs"],
  [/Are you one of these businesses\?/i, "a business question on a page a traveller reads"],
  [/Know something we do not/i, "asks the visitor to do our research"],
  [/Have a trusted driver/i, "asks the visitor to do our research"],
  // The site telling somebody they are lost.
  [/Not sure where to begin\?/i, "tells the reader they are struggling"],
  [/Not sure which of these you need\?/i, "same"],
  [/Would rather not do this part\?/i, "same"],
  [/Would rather look at somewhere/i, "same"],
  // Our own machinery, asked out loud.
  [/Is the private store connected\?/i, "an internal state, asked of a customer"],
  [/What kind of trip are you planning\?/i, "a grid of trip types the page already shows"],
];

/**
 * Questions that must stay. Named by the owner, or of the same kind.
 *
 * Asserted PRESENT rather than merely allowed, because the failure this file
 * has actually seen is not one of these creeping in — it is all of them being
 * swept out by a rule that was too blunt.
 */
const THE_VISITORS_OWN: Array<[string, string]> = [
  ["app/destinations/[destination]/page.tsx", "Ready to book {destination.name}?"],
  // The homepage now opens with the visitor's own question — the audit's
  // exact wording — and the heritage hero link went with the rest of the
  // hero copy (heritage is reached through Destinations like anywhere else).
  ["app/page.tsx", "Where to?"],
];

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

/** The words a visitor reads: comments out, Tailwind out. */
function prose(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/className=(\{`[\s\S]*?`\}|"[^"]*")/g, "");
}

describe("which questions the site may ask", () => {
  it("is reading the real site rather than an empty list", () => {
    assert.ok(FILES.length > 150, `only ${FILES.length} files scanned`);
    assert.ok(FILES.some((path) => path.replace(/\\/g, "/") === "app/kosher-travel/page.tsx"));
  });

  it("ASKS NOTHING THAT IS NOT THE READER'S OWN QUESTION", () => {
    const broken: string[] = [];
    for (const path of FILES) {
      const text = prose(path);
      for (const [pattern, why] of NOT_THE_VISITORS) {
        if (pattern.test(text)) broken.push(`${path} — ${why} (${pattern})`);
      }
    }
    assert.deepEqual(broken, [], `questions that are not the reader's:\n${broken.join("\n")}`);
  });

  it("KEEPS THE ONES THAT SOUND LIKE A TRAVEL WEBSITE", () => {
    // "Ready to book Rome?" was swept out by a blanket ban on question marks
    // and had to be put back. It names the reader's own next move at the
    // moment they are making it, and there is no statement that does the job.
    for (const [path, phrase] of THE_VISITORS_OWN) {
      assert.ok(prose(path).includes(phrase), `${path} lost "${phrase}"`);
    }
  });

  it("KEEPS THE INFORMATION where the wondering came out", () => {
    // The six kosher-travel cards: the questions went, the subjects stayed,
    // and each still leads somewhere that answers it.
    const page = prose("app/kosher-travel/page.tsx");
    for (const subject of [
      "Kosher food",
      "Where to stay",
      "Shabbos away from home",
      "Drivers, guides and contacts",
      "Documents and borders",
      "Hechsherim",
    ]) {
      assert.ok(page.includes(subject), `the card for "${subject}" lost its subject`);
    }
  });

  it("LEAVES THE ADMIN ALONE, because that is a conversation with the owner", () => {
    // A kashrus dropdown reading "reported — not checked by us" is exactly
    // right on the screen of the person doing the checking.
    assert.match(readFileSync("components/AddEntryForms.tsx", "utf8"), /not checked by us/);
  });
});
