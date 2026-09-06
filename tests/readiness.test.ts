import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { schemaIsCurrent, shippedMigration } from "@/lib/readiness";

/**
 * READINESS, AND WHY THERE IS STILL NO MIGRATION RUNNER HERE.
 *
 * The two deployments share one database and one migration lineage — the same
 * 17 folders, byte for byte. Only the kosher deployment runs them, through a
 * wrapper that waits for Prisma's advisory lock rather than failing on it,
 * written after two overlapping deploys spent ninety minutes silently refusing
 * to go live on 24 August.
 *
 * This repository is the OWNER: its db:migrate is scripts/migrate-deploy.mjs,
 * the wrapper that waits for the lock. The other deployment deliberately runs
 * none — a second migrator on one database is what caused the incident, and
 * adding one there would reintroduce it rather than add safety.
 *
 * The real gap was the healthcheck. /version returns 200 with the database
 * unreachable and the schema years behind, so Railway called a deploy healthy
 * and moved traffic onto a container that could not answer an account request.
 */

test("a build is ready when the applied schema is at or ahead of what it ships", () => {
  assert.equal(schemaIsCurrent("20260823130000_x", "20260823130000_x"), true);
  // Ahead is the normal steady state: the deployment that owns migrations runs
  // them first and this one catches up on its next deploy.
  assert.equal(schemaIsCurrent("20260823130000_x", "20260901000000_later"), true);
});

test("A BUILD IS NOT READY AGAINST AN OLDER SCHEMA — the failure this exists for", () => {
  assert.equal(schemaIsCurrent("20260901000000_needs_column", "20260823130000_x"), false);
  assert.equal(schemaIsCurrent("20260823130000_x", ""), false, "no migrations applied at all");
});

test("a build shipping no migrations never blocks itself", () => {
  assert.equal(schemaIsCurrent("", "anything"), true);
  assert.equal(schemaIsCurrent("", ""), true);
});

test("the newest shipped migration is read off this build, and a missing folder is not fatal", () => {
  const newest = shippedMigration(new URL("../prisma/migrations", import.meta.url).pathname);
  assert.match(newest, /^\d{14}_/, `expected a timestamped migration, got ${JSON.stringify(newest)}`);
  assert.equal(shippedMigration("/no/such/directory"), "");
});

test("Railway waits on the readiness endpoint, not on a page that only renders", () => {
  const railway = JSON.parse(readFileSync(new URL("../railway.json", import.meta.url), "utf8"));
  assert.equal(railway.deploy.healthcheckPath, "/api/health");
});

test("THIS DEPLOYMENT OWNS MIGRATIONS — one database, one owner, and it is this one", () => {
  // The two deployments share one database and one migration lineage. This one
  // runs them, through scripts/migrate-deploy.mjs, which waits for Prisma's
  // advisory lock rather than failing on it — written after two overlapping
  // deploys spent ninety minutes silently refusing to go live on 24 August.
  // The other deployment deliberately has no runner; see its own copy of this
  // test. Losing this line would leave the shared schema with no owner at all.
  const railway = JSON.parse(readFileSync(new URL("../railway.json", import.meta.url), "utf8"));
  assert.equal(railway.deploy.preDeployCommand, "npm run db:migrate");
  assert.match(readFileSync("package.json", "utf8"), /"db:migrate": "node scripts\/migrate-deploy\.mjs"/);
});

test("and the migration runner still waits for the lock rather than failing on it", () => {
  const runner = readFileSync("scripts/migrate-deploy.mjs", "utf8");
  assert.match(runner, /P1002/, "the lock-timeout handling is what stops overlapping deploys failing");
});

test("a cold cache is reported but does not fail the check", () => {
  // The reading half is where readiness() lives — the pure half holds the
  // rules only. Only the schema check may set ready:false.
  const src = readFileSync(new URL("../lib/readiness-data.ts", import.meta.url), "utf8");
  assert.match(src, /if \(database\.behind\) \{/);
  assert.ok(!/redis[^\n]*ready: false/.test(src), "a Redis blip must not block a deploy");
  // And the pure half must stay free of anything that reads.
  const rules = readFileSync(new URL("../lib/readiness.ts", import.meta.url), "utf8");
  for (const word of ["fetch(", "prisma", "process.env"]) {
    assert.ok(!rules.includes(word), `lib/readiness.ts should not contain ${word}`);
  }
});

test("the endpoint answers 503 when it is not ready, and leaks nothing", () => {
  const route = readFileSync(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
  assert.match(route, /status: state\.ready \? 200 : 503/);
  assert.match(route, /"cache-control": "no-store"/);
  assert.ok(!/DATABASE_URL|process\.env/.test(route), "the route must not echo configuration");
});
