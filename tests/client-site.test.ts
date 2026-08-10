import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { publicPaths } from "@/lib/site-map";

/**
 * The public site is for the person taking the trip, and for nobody else.
 *
 * THREE KINDS OF THING HAD GROWN INTO IT, all of them added for good reasons
 * and none of them written for a customer:
 *
 * 1. AN ADMIN PANEL. The heritage town pages carried "Verification summary",
 *    "What is ready, and what still needs checking", "Destination record:
 *    Available", "Batei hachaim: 3", "Practical sections are shown only when
 *    they exist in the destination database", and a "Quick actions" card with
 *    per-cemetery "Needs verification / Unavailable" chips. That is the screen
 *    you would build for the person maintaining the site. It was being shown
 *    to the person planning a journey to a kever.
 *
 * 2. QUESTIONS ASKED OF THE VISITOR RATHER THAN ANSWERED FOR THEM. "See
 *    something to fix? Suggest an edit" on eight pages. "Been here? Send a
 *    picture of the beis hachaim." "Are you one of these businesses?" on the
 *    directory a traveler reads to find a driver. "Help us keep this useful —
 *    have a trusted driver, food contact or current minyan detail for
 *    Lizhensk?" Each one asks a customer to do our work.
 *
 * 3. AN INFLOW THAT IS NOT A CUSTOMER JOURNEY. /submit is a structured
 *    contributor form — type, title, source — and it sat in the small print of
 *    every page on the site.
 *
 * NOTHING WAS DELETED FROM THE BUSINESS. Corrections, listings and local
 * knowledge are all still wanted; they arrive through Contact, which asks
 * which page and where you know it from, and lands in one inbox. The
 * suggestion machinery and the admin screen that reads it are untouched.
 */

const OWNER_FACING =
  /Admin|Editor|Manager|Panel|Queue|Control|Wizard|Log$|Test$|Setup|Settings|Completeness|Drafts|Trail|Export|Review$/;

function walk(dir: string, match: (path: string) => boolean): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "admin" || name === "api" || name === "node_modules") continue;
      found.push(...walk(full, match));
    } else if (match(full)) {
      found.push(full);
    }
  }
  return found;
}

const PAGES = walk("app", (path) => path.endsWith("page.tsx"));
const COMPONENTS = walk("components", (path) => path.endsWith(".tsx")).filter(
  (path) => !OWNER_FACING.test(path.split("/").pop()!.replace(/\.tsx$/, "")),
);

/** Rendered words only: comments record what changed and are read by nobody. */
function prose(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/className=(\{`[\s\S]*?`\}|"[^"]*")/g, "");
}

describe("no admin screen is shown to a customer", () => {
  const FURNITURE: Array<[RegExp, string]> = [
    [/Verification summary/i, "an admin summary card"],
    [/Quick actions/i, "an admin panel label"],
    [/still needs checking/i, "the checking backlog"],
    [/destination database/i, "the CMS, explained to a customer"],
    [/Destination record:/i, "a database row, printed"],
    [/Needs verification/i, "an internal record state"],
    [/Last checked:/i, "our own maintenance log"],
    [/Use the edit form below/i, "an instruction to do our data entry"],
  ];

  it("CARRIES NONE OF THE ADMIN FURNITURE", () => {
    const broken: string[] = [];
    for (const path of [...PAGES, ...COMPONENTS]) {
      const text = prose(path);
      for (const [pattern, what] of FURNITURE) {
        if (pattern.test(text)) broken.push(`${path} — ${what} (${pattern})`);
      }
    }
    assert.deepEqual(broken, [], `admin furniture on a public surface:\n${broken.join("\n")}`);
  });

  it("is reading the real site rather than an empty list", () => {
    assert.ok(PAGES.length > 30, `only ${PAGES.length} pages scanned`);
    assert.ok(PAGES.includes("app/heritage/towns/[place]/page.tsx"));
  });
});

describe("the site does not ask a customer to do our work", () => {
  const ASKS: Array<[RegExp, string]> = [
    [/See something to fix\?/i, "asks the visitor to proofread"],
    [/Suggest an edit/i, "asks the visitor to proofread"],
    [/Send a picture/i, "asks the visitor to supply photographs"],
    [/Been here\?/i, "asks the visitor to supply photographs"],
    [/Are you one of these businesses\?/i, "a business question on a page a traveller reads"],
    [/Help us keep this useful/i, "asks the visitor to do our research"],
    [/Have a trusted driver/i, "asks the visitor to do our research"],
    [/Submit an entry/i, "a contributor flow in the customer journey"],
  ];

  it("ASKS FOR NONE OF IT ON A PAGE A CUSTOMER READS", () => {
    const broken: string[] = [];
    for (const path of [...PAGES, ...COMPONENTS]) {
      const text = prose(path);
      for (const [pattern, what] of ASKS) {
        if (pattern.test(text)) broken.push(`${path} — ${what} (${pattern})`);
      }
    }
    assert.deepEqual(broken, [], `the customer is being asked to work:\n${broken.join("\n")}`);
  });

  it("STILL WANTS ALL OF IT, through the one door that asks the right things", () => {
    // The point is not that corrections stopped mattering. A correction sent
    // through Contact arrives with the page and the source attached, which is
    // more than the inline button ever collected.
    const contact = readFileSync("lib/contact-reasons.ts", "utf8");
    assert.match(contact, /value: "correction"/);
    assert.match(contact, /value: "advertise"/);
    assert.match(readFileSync("lib/beta-notice.ts", "utf8"), /feedbackHref: "\/contact\?reason=correction"/);
    assert.match(readFileSync("app/directory/page.tsx", "utf8"), /\/contact\?reason=advertise/);
  });

  it("leaves the machinery that receives it alone", () => {
    // The admin reads what people have sent in. Removing the buttons must not
    // have removed the screen.
    assert.ok(readFileSync("components/SuggestionReview.tsx", "utf8").length > 500);
  });
});

describe("the contributor page is out of the customer journey", () => {
  it("IS NOT IN THE FOOTER, THE NAV OR THE SITEMAP", () => {
    for (const file of ["components/Footer.tsx", "lib/navigation.ts"]) {
      assert.doesNotMatch(prose(file), /"\/submit"/, `${file} still offers the contributor form`);
    }
    for (const entry of publicPaths()) {
      assert.notEqual(entry.path, "/submit", "the contributor form is still submitted to search engines");
    }
  });

  it("still exists, so a link the owner sends somebody keeps working", () => {
    // Removed from the journey, not from the site. This is reversible in one
    // line if the owner wants it back in the footer.
    assert.ok(readFileSync("app/submit/page.tsx", "utf8").includes("SubmitEntryForm"));
  });
});
