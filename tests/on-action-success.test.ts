import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { hasNewResult, type ActionLike } from "@/components/useOnActionSuccess";

/**
 * "That save went through — put the form away."
 *
 * Six admin screens did this in an effect, which meant React painted the form
 * once more, still open, and only then closed it. A visible flash of a form the
 * person has finished with, and what react-hooks/set-state-in-effect points at.
 *
 * They now adjust state during render instead — React's own answer, not a
 * workaround — and the comparison below is what makes that safe. A version
 * that answers "yes" every render is an infinite loop rather than a bug found
 * later, which is why the decision is pure and tested here rather than left to
 * be discovered in a browser.
 */

const ok: ActionLike = { ok: true };
const failed: ActionLike = { ok: false };

describe("what counts as a new action result", () => {
  it("settles: the same results are not new twice", () => {
    // The whole safety of adjusting during render. Every re-render passes the
    // same objects, and every one of those must answer no.
    const results = [ok, failed];
    assert.equal(hasNewResult(results, results), false);
    assert.equal(hasNewResult([ok, failed], [ok, failed]), false);
  });

  it("notices a fresh result object", () => {
    assert.equal(hasNewResult([{ ok: true }], [ok]), true);
  });

  it("counts two successes in a row as two, not one", () => {
    // useActionState hands back a fresh object per submission. Comparing on
    // `ok` instead of identity would make the second save a no-op and leave
    // the dialog open.
    const first: ActionLike = { ok: true };
    const second: ActionLike = { ok: true };
    assert.notEqual(first, second);
    assert.equal(hasNewResult([second], [first]), true);
  });

  it("treats null as a real value, not as nothing", () => {
    // The first render's result is null; the first save replaces it.
    assert.equal(hasNewResult([null], [null]), false);
    assert.equal(hasNewResult([ok], [null]), true);
    assert.equal(hasNewResult([null], [ok]), true);
  });

  it("handles a list that changes length rather than reading past its end", () => {
    assert.equal(hasNewResult([ok, failed], [ok]), true);
    assert.equal(hasNewResult([ok], [ok, failed]), true);
    assert.equal(hasNewResult([], []), false);
  });
});

describe("the six screens use it rather than their own copy", () => {
  const screens = [
    "components/AddEntryForms.tsx",
    "components/BlastComposer.tsx",
    "components/BlockEditor.tsx",
    "components/FlatFileListEditor.tsx",
    "components/MikvaosEditor.tsx",
    "components/CaseStudiesForm.tsx",
  ];

  for (const file of screens) {
    it(`${file} closes its form through the hook`, () => {
      const source = readFileSync(file, "utf8");
      assert.ok(source.includes("useOnActionSuccess("), `${file} no longer uses the hook`);
      assert.ok(
        !/useEffect\([^)]*\{\s*if \(\w*[Ss]tate\?\.ok/.test(source),
        `${file} has grown its own copy of the effect again`,
      );
    });
  }

  it("keeps the comparison state, without which it never settles", () => {
    const hook = readFileSync("components/useOnActionSuccess.ts", "utf8");
    assert.match(hook, /const \[seen, setSeen\] = useState\(results\)/);
    assert.match(hook, /if \(hasNewResult\(results, seen\)\)/);
    assert.match(hook, /setSeen\(results\)/);
    // If this ever becomes an effect again, the six screens go back to
    // painting a form they have finished with.
    assert.doesNotMatch(hook, /useEffect/);
  });
});
