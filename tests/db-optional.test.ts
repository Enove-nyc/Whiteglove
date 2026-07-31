import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { optionalRead } from "@/lib/db-optional";

/**
 * A read that is allowed to fail, and a read that is not.
 *
 * The bug this exists for: the cemetery page fetched a beis hachaim and its
 * pictures in one query. On a database where the migration had not been run
 * the Photo table did not exist, so that query threw, the catch above it fell
 * back to the built-in record, and every kever the owner had added vanished
 * from the page. He had saved them. The admin had said "Saved." They were in
 * the database. The page simply would not read them, and said nothing at all.
 *
 * The town pages were worse: one throw and every listing and every phone
 * number he had entered disappeared at once, leaving a site that looked like
 * nobody had ever typed anything into it.
 *
 * The mistake was joining something new and optional onto something old and
 * essential. These tests are about the two halves staying apart.
 */

describe("a read that is allowed to fail", () => {
  it("gives back what was read when it works", async () => {
    assert.deepEqual(await optionalRead("pictures", async () => [1, 2, 3], []), [1, 2, 3]);
  });

  it("gives back the fallback when it throws, instead of throwing on", async () => {
    const error = mock.method(console, "error", () => {});
    const result = await optionalRead("pictures", async () => { throw new Error("relation \"Photo\" does not exist"); }, []);
    assert.deepEqual(result, []);
    error.mock.restore();
  });

  it("says something, rather than swallowing it", async () => {
    // A failure nobody can see is how this went unnoticed. It has to be
    // findable in the logs even though the page carries on.
    const error = mock.method(console, "error", () => {});
    await optionalRead("the pictures for lizhensk", async () => { throw new Error("boom"); }, null);
    assert.equal(error.mock.callCount(), 1);
    const message = String(error.mock.calls[0].arguments[0]);
    assert.match(message, /the pictures for lizhensk/, "the message does not name what failed");
    assert.match(message, /carrying on without it/);
    error.mock.restore();
  });

  it("names the migration when that is what it looks like", async () => {
    // By far the likeliest cause, and the fix is one command — so the log says
    // which one rather than leaving somebody to work it out from a Postgres
    // error code.
    const error = mock.method(console, "error", () => {});
    await optionalRead("pictures", async () => { throw new Error('relation "Photo" does not exist'); }, null);
    assert.match(String(error.mock.calls[0].arguments[0]), /db:migrate/);
    error.mock.restore();
  });

  it("does not blame the migration for an unrelated failure", async () => {
    const error = mock.method(console, "error", () => {});
    await optionalRead("pictures", async () => { throw new Error("connection terminated"); }, null);
    assert.ok(!String(error.mock.calls[0].arguments[0]).includes("db:migrate"));
    error.mock.restore();
  });

  it("carries a fallback of any shape, including a Map", async () => {
    const empty = new Map<string, number>();
    const error = mock.method(console, "error", () => {});
    const result = await optionalRead("counts", async () => { throw new Error("nope"); }, empty);
    assert.equal(result, empty);
    assert.equal(result.size, 0);
    error.mock.restore();
  });
});
