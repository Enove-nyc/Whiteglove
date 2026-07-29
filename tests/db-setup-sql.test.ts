import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { splitSql } from "../lib/db-setup";
import { INIT_SQL } from "../lib/init-sql";

// The setup run sends the init SQL to Postgres one statement at a time, and it
// used to find those statements by splitting on every semicolon. A semicolon in
// the prose of a comment broke that: the comment was cut in half, the next
// statement began with bare English, Postgres called it a syntax error, and
// since that is not an "already exists" error the whole run stopped. Setting up
// a database and re-importing content both failed at the same place.

describe("finding the statements in a SQL script", () => {
  test("a semicolon in a comment does not end a statement", () => {
    const sql = `-- covers a fresh database; these cover an older one
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "blocks" JSONB;`;
    const statements = splitSql(sql);
    assert.equal(statements.length, 1);
    assert.match(statements[0], /ALTER TABLE "Page"/);
    // The bare prose that used to become a statement of its own is gone.
    assert.ok(!statements.some((s) => /^these cover/m.test(s)));
  });

  test("a semicolon inside a literal does not end a statement", () => {
    const statements = splitSql(`INSERT INTO "T" ("a") VALUES ('one; two');`);
    assert.equal(statements.length, 1);
    assert.match(statements[0], /one; two/);
  });

  test("an escaped quote inside a literal is not the end of it", () => {
    const statements = splitSql(`INSERT INTO "T" ("a") VALUES ('it''s here; still one');`);
    assert.equal(statements.length, 1);
  });

  test("a semicolon in a block comment does not end a statement", () => {
    const statements = splitSql(`/* one; two */ SELECT 1;`);
    assert.equal(statements.length, 1);
  });

  test("a trailing run of comments is not sent as an empty query", () => {
    assert.deepEqual(splitSql(`SELECT 1;\n-- nothing after this\n`), ["SELECT 1"]);
    assert.deepEqual(splitSql(`-- only a comment`), []);
  });

  test("ordinary statements still come out one by one", () => {
    assert.deepEqual(splitSql(`SELECT 1; SELECT 2;`), ["SELECT 1", "SELECT 2"]);
  });
});

describe("the init SQL the site actually ships", () => {
  const statements = splitSql(INIT_SQL);

  test("every statement starts with a SQL keyword", () => {
    // The failure looked exactly like this: a "statement" beginning with a word
    // that is not SQL. Comments are allowed to come first, so strip them.
    for (const statement of statements) {
      const code = statement
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("--"))
        .join(" ");
      assert.match(code, /^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|SELECT|COMMENT|GRANT|DO)\b/i, `not a statement: ${code.slice(0, 80)}`);
    }
  });

  test("the three columns the page editor needs are added", () => {
    for (const column of ["blocks", "seoTitle", "seoDescription"]) {
      assert.ok(
        statements.some((s) => new RegExp(`ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "${column}"`).test(s)),
        `no statement adds "${column}"`,
      );
    }
  });
});
