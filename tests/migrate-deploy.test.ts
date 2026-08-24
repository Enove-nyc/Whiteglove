import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
// A plain .mjs script, imported for the one function worth testing.
import { isTransientMigrateError, migrationDatabaseUrl } from "../scripts/migrate-deploy.mjs";

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
  const POOLED = "postgresql://u:p@ep-misty-pooler.c-5.us-east-2.aws.neon.tech/neondb";
  const DIRECT = "postgresql://u:p@ep-misty.c-5.us-east-2.aws.neon.tech/neondb";

  it("migrates over a direct connection, never the pooler", () => {
    // The whole cause of the stuck deploys: an advisory lock belongs to a
    // session, and a pooler hands out a different session per transaction, so
    // the lock could sit held by a pooled connection nobody was using.
    assert.equal(
      migrationDatabaseUrl({ DATABASE_URL: POOLED, databaseneon_DATABASE_URL_UNPOOLED: DIRECT }),
      DIRECT,
    );
    assert.equal(migrationDatabaseUrl({ DATABASE_URL: POOLED, DIRECT_URL: DIRECT }), DIRECT);
    assert.equal(migrationDatabaseUrl({ DATABASE_URL: POOLED, POSTGRES_URL_NON_POOLING: DIRECT }), DIRECT);
  });

  it("still migrates when there is no separate direct endpoint", () => {
    // A plain Postgres with one URL must behave exactly as it did before.
    assert.equal(migrationDatabaseUrl({ DATABASE_URL: POOLED }), POOLED);
  });

  it("leaves the running site on the pooled connection", () => {
    // The override is scoped to the migration child process — the app that
    // starts afterwards reads its own DATABASE_URL, which is what a pooler is for.
    assert.match(SOURCE, /env:\s*\{\s*\.\.\.process\.env/);
  });
});
