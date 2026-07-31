import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { splitSql } from "../lib/db-setup";
import { INIT_SQL } from "../lib/init-sql";
import { UPGRADE_SQL } from "../lib/upgrade-sql";

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

  test("a dollar-quoted block is one statement, semicolons and all", () => {
    // The same bug again, and the only way to add a foreign key only if it is
    // missing. This came out as three fragments — an unterminated block, a
    // bare EXCEPTION, and a stray END $$ — all syntax errors rather than
    // "already exists", so the run stopped and skipped everything after it.
    const sql = `DO $$ BEGIN
  ALTER TABLE "Photo" ADD CONSTRAINT "Photo_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "PracticalPlace"("id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`;
    const statements = splitSql(sql);
    assert.equal(statements.length, 1);
    assert.match(statements[0], /EXCEPTION/);
    assert.match(statements[0], /END \$\$$/);
  });

  test("a named dollar tag is matched by its own tag, not by any other", () => {
    const statements = splitSql(`DO $body$ SELECT 'a; b'; $body$; SELECT 2;`);
    assert.equal(statements.length, 2);
    assert.match(statements[0], /\$body\$$/);
  });

  test("a dollar sign that is not a tag is left alone", () => {
    // "$1" is a placeholder, not the start of a quoted block.
    assert.deepEqual(splitSql(`SELECT $1; SELECT 2;`), ["SELECT $1", "SELECT 2"]);
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

  test("is only the generated script now", () => {
    // The three Page columns used to be hand-appended to the bottom of this
    // file. They belong in UPGRADE_SQL, where regenerating cannot delete them.
    assert.ok(!INIT_SQL.includes("ADD COLUMN IF NOT EXISTS"), "a hand-added upgrade has crept back into the generated file");
  });
});

/**
 * The upgrade half, which is what an OLDER database needs.
 *
 * INIT_SQL builds from empty, so on a database that already has the tables
 * every statement in it fails "already exists" and is skipped — a new COLUMN
 * or a new enum VALUE is invisible to it. Those three Page columns above were
 * being carried, hand-appended, inside the generated file, where the next
 * regeneration would have silently deleted them. They live in UPGRADE_SQL now.
 */
describe("the SQL that brings an older database up to date", () => {
  const statements = splitSql(UPGRADE_SQL);

  test("adds one thing per statement", () => {
    // Postgres fails a whole ALTER TABLE ... ADD COLUMN a, ADD COLUMN b when a
    // exists, taking b with it — which is exactly how a half-upgraded database
    // would stay half-upgraded for ever.
    for (const statement of statements) {
      const adds = statement.match(/ADD COLUMN/gi)?.length ?? 0;
      assert.ok(adds <= 1, `more than one ADD COLUMN in: ${statement.split("\n")[0].slice(0, 80)}`);
    }
  });

  test("every statement can be run twice", () => {
    for (const statement of statements) {
      const code = statement.split("\n").filter((l) => !l.trim().startsWith("--")).join(" ");
      assert.match(
        code,
        /IF NOT EXISTS|EXCEPTION\s+WHEN/i,
        `not safe to re-run: ${code.trim().slice(0, 90)}`,
      );
    }
  });

  test("still carries the three columns the page editor needs", () => {
    // These were the reason the pattern existed. They moved here from the
    // generated file, where the next regeneration would have deleted them —
    // and did, which is how all of this was found.
    for (const column of ["blocks", "seoTitle", "seoDescription"]) {
      assert.ok(
        statements.some((s) => new RegExp(`ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "${column}"`).test(s)),
        `no statement adds "${column}"`,
      );
    }
  });

  test("carries the six kinds of listing and the picture columns", () => {
    const all = statements.join("\n");
    for (const value of ["TEFILLOS", "SHABBOS", "HOSPITAL", "EMERGENCY", "GROCERY", "PARKING"]) {
      assert.ok(all.includes(`ADD VALUE IF NOT EXISTS '${value}'`), `${value} is not added to PlaceCategory`);
    }
    for (const column of ["placeId", "submittedAt", "contactConsent", "featuredReason"]) {
      assert.ok(all.includes(`"${column}"`), `${column} is not added`);
    }
  });

  test("does not add a column the schema does not have", () => {
    // Cemetery's own "status" is already a VerificationStatus. Adding a second
    // one produced a database the schema then wanted to DROP a column from,
    // which is a database that is wrong in a way nothing would report.
    assert.ok(!UPGRADE_SQL.includes(`ALTER TABLE "Cemetery" ADD COLUMN IF NOT EXISTS "verification"`));
  });
});
