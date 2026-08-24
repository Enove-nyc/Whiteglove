import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PLAN_LABELS } from "@/lib/account-plans";

/**
 * Telling the owner that somebody asked about a paid plan.
 *
 * THIS EXISTS BECAUSE THE REQUEST ARRIVED IN COMPLETE SILENCE. It was written
 * to the store and shown on /admin/accounts, and nothing anywhere said it had
 * happened — no email, no count, not even a hint on the admin dashboard. The
 * only way to find one was to open that page and look.
 *
 * And the person who asked was told, on their own account page, "we have it,
 * and we will be in touch" — a promise the site had no mechanism to keep.
 */

const ROUTE = readFileSync("app/api/account/plan/route.ts", "utf8");
/** The CALL, not the import line at the top of the file — they read the same. */
const CALL_AT = ROUTE.indexOf("void sendPlanRequestNotification");
const EMAIL = readFileSync("lib/email.ts", "utf8");
const DASHBOARD = readFileSync("app/admin/page.tsx", "utf8");

describe("the request reaches a person", () => {
  it("sends the owner an email when somebody asks", () => {
    // THE ONE THAT MATTERS. Without this line the request is stored and
    // announced nowhere.
    assert.match(ROUTE, /sendPlanRequestNotification\(/);
  });

  it("DOES NOT AWAIT IT", () => {
    // The request IS saved by this point. An email service that is slow or away
    // must not turn a saved request into an error the person sees — they would
    // ask again, and again, and the queue would fill with the same person.
    const call = ROUTE.slice(Math.max(0, CALL_AT - 6), CALL_AT + 30);
    assert.doesNotMatch(call, /await/, "a slow email service would fail a request that was already saved");
    assert.match(ROUTE, /void sendPlanRequestNotification/);
  });

  it("swallows a failure rather than throwing into the response", () => {
    assert.ok(CALL_AT !== -1, "nothing sends the notification");
    assert.match(ROUTE.slice(CALL_AT, CALL_AT + 500), /\.catch\(/);
  });

  it("sends it AFTER the request is saved, not before", () => {
    // An email about a request that then failed to save is worse than none:
    // the owner answers somebody who is not in the queue.
    const savedAt = ROUTE.indexOf("if (!saved)");
    assert.ok(savedAt !== -1 && CALL_AT > savedAt, "the email is sent before the save is checked");
  });

  it("says Advisor Pro, not pro — the label a person reads", () => {
    assert.match(ROUTE, /PLAN_LABELS\[/);
    assert.equal(PLAN_LABELS.pro, "Advisor Pro");
    assert.equal(PLAN_LABELS.starter, "Advisor Starter");
  });
});

describe("what the email says", () => {
  it("carries who asked, what for, and what they wrote", () => {
    const fn = EMAIL.slice(EMAIL.indexOf("export async function sendPlanRequestNotification"));
    for (const field of ["Who", "Asked about", "On now", "They wrote"]) {
      assert.match(fn.slice(0, 1500), new RegExp(`"${field}"`), field);
    }
  });

  it("SAYS NOTHING HAS BEEN CHARGED", () => {
    // There is no payment anywhere on this site. An email that reads like an
    // order confirmation, skimmed on a phone, would suggest money has moved.
    const fn = EMAIL.slice(EMAIL.indexOf("export async function sendPlanRequestNotification"), EMAIL.indexOf("export async function sendVerificationEmail"));
    assert.match(fn, /Nothing has been charged/);
    assert.match(fn, /no card was taken/);
  });

  it("says where to answer it", () => {
    const fn = EMAIL.slice(EMAIL.indexOf("export async function sendPlanRequestNotification"), EMAIL.indexOf("export async function sendVerificationEmail"));
    assert.match(fn, /Visitor accounts/);
  });

  it("replies to an email account and not to a phone one", () => {
    // A phone account has no inbox. A reply-to pointing at a phone number
    // bounces, which is worse than having none.
    const fn = EMAIL.slice(EMAIL.indexOf("export async function sendPlanRequestNotification"), EMAIL.indexOf("export async function sendVerificationEmail"));
    assert.match(fn, /includes\("@"\)/);
  });
});

describe("the dashboard cannot lose one", () => {
  it("counts requests still waiting", () => {
    // The email is the primary. This is the backstop for the day an email is
    // missed, filtered, or the service is not connected at all.
    assert.match(DASHBOARD, /listPlanRequests\(\)/);
    assert.match(DASHBOARD, /plansWaiting/);
  });

  it("counts only the ones still open", () => {
    // A granted request answered last month is not somebody waiting.
    assert.match(DASHBOARD, /state === "asked"/);
  });

  it("says nothing is charged there too, and links to the answer", () => {
    const block = DASHBOARD.slice(DASHBOARD.indexOf("plansWaiting > 0"), DASHBOARD.indexOf("plansWaiting > 0") + 700);
    assert.match(block, /Nothing is charged/);
    assert.match(block, /\/admin\/accounts/);
  });

  it("counts one person as one person", () => {
    const block = DASHBOARD.slice(DASHBOARD.indexOf("plansWaiting > 0"), DASHBOARD.indexOf("plansWaiting > 0") + 700);
    assert.match(block, /person has/);
    assert.match(block, /people have/);
  });
});
