import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
// A plain .mjs script, imported for the one function worth testing.
import { isTransientMigrateError, migrationUrls } from "../scripts/migrate-deploy.mjs";

const SOURCE = readFileSync("scripts/migrate-deploy.mjs", "utf8");

describe("waiting out another deploy's migration", () => {
  it("retries the advisory-lock timeout that stalled the deploys", () => {
    // Verbatim from the failed Railway deploy of 24 August.
    const real =
      "Error: P1002\n\nThe database server was reached but timed out.\n\n" +
      "Context: Timed out trying to acquire a postgres advisory lock " +
      "(SELECT pg_advisory_lock(72707369)). Timeout: 10000ms.";
    assert.equal(isTransientMigrateError(real), true);
  });

  it("retries a database that cannot be reached yet", () => {
    assert.equal(isTransientMigrateError("Error: P1001\nCan't reach database server"), true);
    assert.equal(isTransientMigrateError("connect ETIMEDOUT 10.0.0.1:5432"), true);
    assert.equal(isTransientMigrateError("Error: P1017\nServer has closed the connection."), true);
  });

  it("does NOT retry a migration the database refused", () => {
    // The failure that matters: retrying this would only fail more slowly,
    // and must never be mistaken for the lock being busy.
    const broken =
      "Error: P3009\nmigrate found failed migrations in the target database\n" +
      'ERROR: column "slug" of relation "Destination" already exists';
    assert.equal(isTransientMigrateError(broken), false);
    assert.equal(isTransientMigrateError("Error: P1000\nAuthentication failed"), false);
    assert.equal(isTransientMigrateError(""), false);
  });

  it("never disables the lock to get past it", () => {
    // Skipping the advisory lock is the tempting fix and the dangerous one —
    // it is what makes two concurrent migrations able to half-apply a schema.
    assert.doesNotMatch(SOURCE, /DISABLE_ADVISORY_LOCK/i);
  });

  it("gives up rather than waiting forever", () => {
    // A bounded wait: the deploy must fail with a reason, not hang until the
    // platform kills it without one.
    assert.match(SOURCE, /DELAYS_MS\s*=\s*\[/);
  });

  it("is what the deploy actually runs", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const railway = JSON.parse(readFileSync("railway.json", "utf8"));
    assert.equal(pkg.scripts["db:migrate"], "node scripts/migrate-deploy.mjs");
    assert.match(railway.deploy.preDeployCommand, /db:migrate/);
  });
});

describe("which connection the migration uses", () => {
  const POOLED = "postgresql://u:p@ep-misty-wildflower-aybq0gyx-pooler.c-5.us-east-2.aws.neon.tech/neondb";
  const DIRECT = "postgresql://u:p@ep-misty-wildflower-aybq0gyx.c-5.us-east-2.aws.neon.tech/neondb";

  it("tries the direct endpoint first, derived from the app's own URL", () => {
    // An advisory lock belongs to a session, and a pooler hands out a
    // different session per transaction — which is how the migration lock came
    // to sit held by a pooled connection nobody was using.
    assert.deepEqual(migrationUrls({ DATABASE_URL: POOLED }), [DIRECT, POOLED]);
  });

  it("keeps the pooled URL as a fallback rather than refusing to deploy", () => {
    assert.equal(migrationUrls({ DATABASE_URL: POOLED }).at(-1), POOLED);
  });

  it("never takes a URL from another project's leftover variables", () => {
    // The mistake that broke a deploy: this service also carries
    // databaseneon_* variables from an older Neon project in another region
    // that no longer answers. Only the app's own URL may be rewritten.
    const stale = "postgresql://u:p@ep-cool-hall-av1nw636.c-11.us-east-1.aws.neon.tech/neondb";
    const urls = migrationUrls({ DATABASE_URL: POOLED, databaseneon_DATABASE_URL_UNPOOLED: stale });
    assert.equal(urls.includes(stale), false);
    assert.deepEqual(urls, [DIRECT, POOLED]);
  });

  it("honours an explicit DIRECT_URL, which is Prisma's own convention", () => {
    assert.equal(migrationUrls({ DATABASE_URL: POOLED, DIRECT_URL: DIRECT })[0], DIRECT);
  });

  it("leaves a plain single-URL database exactly as it was", () => {
    const plain = "postgresql://u:p@db.internal:5432/app";
    assert.deepEqual(migrationUrls({ DATABASE_URL: plain }), [plain]);
  });

  it("leaves the running site on the pooled connection", () => {
    assert.match(SOURCE, /env:\s*\{\s*\.\.\.process\.env/);
  });
});
