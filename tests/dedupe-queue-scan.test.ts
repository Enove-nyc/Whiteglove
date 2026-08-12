import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * ownedDuplicateFor checks a new import candidate against the whole review
 * queue. That queue runs to 15,000+ rows in a single pack
 * (worldwide-batch-5), and it used to be read in full — every field, every
 * row, no WHERE clause — on every single candidate edit, purely to compare
 * one row against the rest. That is what actually spent a month's Neon
 * public-network-transfer allowance on admin work nobody outside the team
 * ever saw: reviewing a fraction of one pack pulled the whole pack across
 * the wire, once per edit.
 *
 * This is a source check, not a live-database test, because there is no
 * Postgres in this test environment (the same reason
 * tests/content-store-outage.test.ts reads source rather than exercising a
 * real outage). What it guards is real: the query that reads the candidate
 * table must always narrow with a WHERE clause tied to the candidate being
 * checked, never an unconditional or unfiltered findMany.
 */

const SOURCE = readFileSync("lib/content-imports.ts", "utf8");

function body(fnName: string): string {
  const sigStart = SOURCE.indexOf(`async function ${fnName}(`);
  assert.ok(sigStart >= 0, `expected to find ${fnName} in lib/content-imports.ts`);

  // Walk past the parameter list first, so a return type like
  // Promise<{ id: string }> does not fool a naive "first {" search into
  // treating that type's brace as the function body.
  const parenStart = SOURCE.indexOf("(", sigStart);
  let parenDepth = 0;
  let parenEnd = -1;
  for (let i = parenStart; i < SOURCE.length; i++) {
    if (SOURCE[i] === "(") parenDepth++;
    if (SOURCE[i] === ")") {
      parenDepth--;
      if (parenDepth === 0) {
        parenEnd = i;
        break;
      }
    }
  }
  assert.ok(parenEnd >= 0, `unterminated parameter list for ${fnName}`);

  // Skip the return-type annotation too — Promise<{ id: string }> has a
  // brace of its own, before the one that actually opens the function body.
  let angleDepth = 0;
  let from = -1;
  for (let i = parenEnd + 1; i < SOURCE.length; i++) {
    if (SOURCE[i] === "<") angleDepth++;
    else if (SOURCE[i] === ">") angleDepth--;
    else if (SOURCE[i] === "{" && angleDepth === 0) {
      from = i;
      break;
    }
  }
  assert.ok(from >= 0, `could not find the body of ${fnName}`);
  let depth = 0;
  for (let i = from; i < SOURCE.length; i++) {
    if (SOURCE[i] === "{") depth++;
    if (SOURCE[i] === "}") {
      depth--;
      if (depth === 0) return SOURCE.slice(from, i + 1);
    }
  }
  throw new Error(`unterminated function body for ${fnName}`);
}

describe("import-queue duplicate check does not scan the whole table", () => {
  it("possibleQueueDuplicates narrows on a stored, indexed field before it ever reaches the database", () => {
    const fn = body("possibleQueueDuplicates");
    assert.match(
      fn,
      /normalizedLocation/,
      "the narrowing filter must key off a stored column shared with the rest of the app's duplicate logic, not re-derive one",
    );
    assert.doesNotMatch(
      fn,
      /findMany\(\{\s*where:\s*ignoreCandidateId/,
      "the old bug: a findMany whose only condition is excluding the row being edited reads every other row in the table",
    );
    assert.match(fn, /take:\s*\d+/, "a narrowed query still needs a hard cap — an unbounded OR can still match thousands of rows");
  });

  it("ownedDuplicateFor calls the narrowed lookup, not a bare findMany against the candidate table", () => {
    const fn = body("ownedDuplicateFor");
    assert.match(fn, /possibleQueueDuplicates\(/, "duplicate checks must go through the narrowed query");
    assert.doesNotMatch(
      fn,
      /prisma\.contentImportCandidate\.findMany/,
      "ownedDuplicateFor itself must never call findMany directly on the full candidate table",
    );
  });

  it("the new lookup fields carry an index, or the narrowed WHERE clause is still a full table scan", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const modelStart = schema.indexOf("model ContentImportCandidate");
    const modelEnd = schema.indexOf("\n}", modelStart);
    const model = schema.slice(modelStart, modelEnd);
    assert.match(model, /@@index\(\[normalizedLocation\]\)/, "normalizedLocation is queried directly and needs its own index");
    assert.match(model, /@@index\(\[sourceId\]\)/, "sourceId is queried directly and needs its own index");
  });
});
