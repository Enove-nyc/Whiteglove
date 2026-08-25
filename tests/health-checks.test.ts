import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  allWell,
  CHECKS,
  describeTransition,
  foldResults,
  NOT_CHECKED,
  tellAbout,
  type CheckResult,
  type HealthState,
} from "@/lib/health-checks";

/**
 * Whether the things this site depends on are actually working.
 *
 * lib/connections.ts already said the problem and could not solve it: "SET IS
 * NOT THE SAME AS WORKING... only a real request can answer — which is what
 * the test buttons beside this are for." The buttons work. Nobody presses
 * them, and the failure they catch is the quiet kind: a key expires, an
 * account runs out of credit, and one feature stops while every screen goes on
 * saying the variable is set.
 *
 * Two things are worth testing here and they are both about restraint: telling
 * somebody only when the answer CHANGES, and never letting an unchecked thing
 * look like a working one.
 */

const at = "2026-08-25T00:00:00.000Z";
const ok = (id: CheckResult["id"]): CheckResult => ({ id, ok: true, detail: "fine", at });
const bad = (id: CheckResult["id"], detail = "refused"): CheckResult => ({ id, ok: false, detail, at });

describe("told on change, never on state", () => {
  it("says nothing when nothing changed", () => {
    // An email every night saying all is well is one somebody filters — and
    // the night it says otherwise it is filtered too.
    const before: HealthState = { redis: ok("redis"), stripe: ok("stripe") };
    assert.deepEqual(tellAbout(before, [ok("redis"), ok("stripe")]), []);
  });

  it("says nothing about a thing that was already broken", () => {
    // The owner knows. A second email says nothing the first did not.
    const before: HealthState = { stripe: bad("stripe") };
    assert.deepEqual(tellAbout(before, [bad("stripe")]), []);
  });

  it("reports something that has just stopped working", () => {
    const before: HealthState = { stripe: ok("stripe") };
    assert.deepEqual(tellAbout(before, [bad("stripe", "The key was refused.")]), [
      { id: "stripe", broke: true, detail: "The key was refused." },
    ]);
  });

  it("reports a recovery, which stops somebody chasing a problem that has gone", () => {
    const before: HealthState = { resend: bad("resend") };
    const said = tellAbout(before, [ok("resend")]);
    assert.equal(said.length, 1);
    assert.equal(said[0].broke, false);
    assert.equal(describeTransition(said[0]), "Email is working again");
  });

  it("tells nobody anything on the very first run", () => {
    // THE ONE THAT WOULD HAVE BEEN NOTICED IMMEDIATELY. With no previous
    // answers, every check is a "change" — a fresh deployment would email
    // about every connection at once, including the ones nobody has set up.
    assert.deepEqual(tellAbout({}, [ok("redis"), bad("stripe"), bad("resend")]), []);
  });

  it("names what changed in words a person reads", () => {
    assert.equal(describeTransition({ id: "postgres", broke: true, detail: "" }), "The content database stopped working");
  });
});

describe("keeping the answers", () => {
  it("folds a run over what was held, keeping checks this run did not do", () => {
    const before: HealthState = { redis: ok("redis"), stripe: ok("stripe") };
    const after = foldResults(before, [bad("stripe")]);
    assert.equal(after.redis?.ok, true, "a check that did not run must not be forgotten");
    assert.equal(after.stripe?.ok, false);
  });

  it("does not call an empty state well", () => {
    // Nothing checked is not the same as everything fine, and this is the
    // function a screen would reach for to draw a green tick.
    assert.equal(allWell({}), false);
    assert.equal(allWell({ redis: ok("redis") }), true);
    assert.equal(allWell({ redis: ok("redis"), stripe: bad("stripe") }), false);
  });
});

describe("what is not checked is named", () => {
  it("lists the billed services with a reason", () => {
    // Four green ticks above six unmentioned services is the same lie as a
    // variable that is set and not working: it reads as "everything is fine".
    assert.ok(NOT_CHECKED.length >= 3);
    for (const item of NOT_CHECKED) {
      assert.ok(item.what.trim(), "every unchecked thing is named");
      assert.ok(item.why.trim(), "and says why");
    }
    const named = NOT_CHECKED.map((item) => item.what).join(" ");
    assert.match(named, /Google/);
    assert.match(named, /Anthropic/);
  });

  it("shows them on the screen rather than only holding them", () => {
    const panel = readFileSync("components/admin/HealthPanel.tsx", "utf8");
    assert.match(panel, /NOT_CHECKED\.map/);
    assert.match(panel, /Not checked here/);
  });

  it("says 'not checked yet' rather than nothing, before the first run", () => {
    const panel = readFileSync("components/admin/HealthPanel.tsx", "utf8");
    assert.match(panel, /Not checked yet/);
    assert.match(panel, /not the same as nothing being wrong/);
  });

  it("every check says what a person loses without it", () => {
    for (const check of CHECKS) {
      assert.ok(check.without.trim(), `${check.id} should say what breaks`);
      assert.ok(check.vars.length, `${check.id} should name its variables`);
    }
  });
});

describe("the probes cost nothing and cannot throw", () => {
  const PROBES = readFileSync("lib/health-probes.ts", "utf8");

  it("only ever reads", () => {
    // A health check that charges for itself gets turned off, and one that
    // sends a real email to prove email works is worse than the fault.
    assert.match(PROBES, /api\.stripe\.com\/v1\/balance/);
    assert.match(PROBES, /api\.resend\.com\/domains/);
    assert.doesNotMatch(PROBES, /\/v1\/charges|\/emails|payment_intents/);
    assert.doesNotMatch(PROBES, /method: "POST"/);
  });

  it("gives every provider message to redact before it can reach a browser", () => {
    assert.match(PROBES, /import \{ redact \}/);
    assert.match(PROBES, /detail: redact\(detail\)/);
  });

  it("one failing probe never stops the others", () => {
    assert.match(PROBES, /Promise\.all\(/);
    assert.match(PROBES, /catch \(error\) \{[^]*?return result\(check\.id, false/);
  });

  it("treats 'not set up' as its own answer rather than a failure to explain", () => {
    assert.match(PROBES, /function unconfigured/);
    assert.match(PROBES, /Not set up —/);
  });

  it("bounds every request, so one hanging provider cannot hang the run", () => {
    assert.match(PROBES, /const TIMEOUT_MS/);
    assert.match(PROBES, /controller\.abort\(\)/);
  });
});

describe("the job", () => {
  const ROUTE = readFileSync("app/api/cron/health/route.ts", "utf8");
  const WORKFLOW = readFileSync(".github/workflows/daily-notifications.yml", "utf8");

  it("refuses without its secret, and fails closed if unset", () => {
    assert.match(ROUTE, /process\.env\.CRON_SECRET/);
    assert.match(ROUTE, /Not configured/);
    assert.match(ROUTE, /authorization.*!==.*Bearer \$\{secret\}/);
  });

  it("reads the previous answers BEFORE writing the new ones", () => {
    // Written first, and every transition is lost — the comparison would be
    // against what was just stored.
    const read = ROUTE.indexOf("const before = await readHealth()");
    const write = ROUTE.indexOf("await writeHealth(");
    assert.ok(read > 0 && write > 0);
    assert.ok(read < write);
  });

  it("emails only the owner, and only on a change", () => {
    assert.match(ROUTE, /if \(transitions\.length\) \{/);
    assert.match(ROUTE, /process\.env\.OWNER_EMAIL/);
  });

  it("is scheduled, as its own job", () => {
    assert.match(WORKFLOW, /\/api\/cron\/health/);
    assert.match(WORKFLOW, /^  health:$/m);
  });
});
