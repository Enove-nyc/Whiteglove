import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { planCards, whatThisAdds } from "@/data/plan-comparison";
import { PLAN_FEATURES } from "@/lib/account-limits";
import { PLAN_LABELS } from "@/lib/account-plans";
import { codeOf as code } from "./helpers/source";


describe("the pricing page never invents a price", () => {
  const PAGE = code("app/pricing/page.tsx");
  const DATA = code("data/plan-comparison.ts");

  it("no amount is written into the page or the comparison data", () => {
    // The settled prices are the owner's, set on /admin/settings/plans and
    // read at request time. A hardcoded "$29" here would outlive the day he
    // changes it.
    for (const source of [PAGE, DATA]) {
      assert.doesNotMatch(source, /\$\s?\d/);
      assert.doesNotMatch(source, /\d+\s*(?:a|per)\s+month/i);
    }
  });

  it("the price shown comes from offerLine, the one function allowed to say it", () => {
    assert.match(code("app/pricing/page.tsx"), /offerLine\(offering, plan, usable\[0\]\)/);
  });

  it("in card mode an unreadable price drops the plan rather than quoting nothing", () => {
    assert.match(code("app/pricing/page.tsx"), /if \(offering\.how === "stripe" && usable\.length === 0\) continue/);
  });

  it("a plan with no settled price still says what it is, and nothing about money", () => {
    // The fallback line names the SHAPE of the charge, never an amount, and
    // never explains that the owner has not set one — AGENTS.md keeps internal
    // status out of customer-facing copy.
    assert.match(PAGE, /A single, one-time fee/);
    assert.match(PAGE, /A monthly subscription/);
    for (const banned of ["not set", "coming soon", "TBD", "unverified", "pending", "not yet"]) {
      assert.ok(!PAGE.toLowerCase().includes(banned.toLowerCase()), `page says "${banned}" to a customer`);
    }
  });
});

describe("what a plan advertises is what the code actually gives", () => {
  it("every plan is listed, Personal first", () => {
    // Personal used to be excluded, on the grounds that "an account that can
    // plan nothing is not an option to sell". It plans trips now, and it is
    // the first thing on the page rather than a thing the page omits.
    const names = planCards().map((c) => c.name);
    assert.deepEqual(names, [PLAN_LABELS.free, PLAN_LABELS.one_trip, PLAN_LABELS.starter, PLAN_LABELS.pro]);
  });

  it("a plan never advertises an entitlement it does not hold", () => {
    // The lines are derived from PLAN_FEATURES, so this is really asking that
    // nobody has since hand-written one in.
    const CLIENT_APP = /Hand each client their own app/;
    const BRANDING = /Your name and logo/;
    for (const card of planCards()) {
      const blob = card.includes.join(" ");
      assert.equal(CLIENT_APP.test(blob), PLAN_FEATURES[card.plan].companionClients, card.name);
      assert.equal(BRANDING.test(blob), PLAN_FEATURES[card.plan].ownBranding, card.name);
    }
  });

  it("the Trip Pass is bought once, and does not claim the client-facing half", () => {
    /**
     * It used to assert "One trip" as a line on the card, from when the pass
     * capped an account at one. It no longer does: the moment Personal became
     * unlimited, a cap on the paid plan meant paying to keep FEWER trips than
     * free. What the pass buys is the app on the phone, not a trip slot.
     */
    const one = planCards().find((c) => c.plan === "one_trip")!;
    assert.ok(one.oneTime);
    assert.ok(!one.free);
    assert.ok(!one.includes.some((line) => /client/i.test(line)));
    assert.ok(one.includes.some((line) => /app/i.test(line)), "the pass does not mention the app it is for");
  });

  it("Personal is on the page, free, and is the floor", () => {
    // It was left off entirely, on the grounds that it "can plan nothing".
    const personal = planCards().find((c) => c.plan === "free")!;
    assert.ok(personal, "Personal is not on the pricing page");
    assert.ok(personal.free);
    assert.ok(!personal.oneTime);
    assert.ok(!personal.includes.some((line) => /app for your own trip/i.test(line)), "free must not claim the app");
  });

  it("Pro carries everything Starter does", () => {
    const starter = planCards().find((c) => c.plan === "starter")!;
    const pro = planCards().find((c) => c.plan === "pro")!;
    for (const line of starter.includes) assert.ok(pro.includes.includes(line), `Pro dropped: ${line}`);
  });
});

describe("what moving up actually buys", () => {
  it("is computed from the tables, not written out", () => {
    assert.deepEqual(whatThisAdds("one_trip"), []);
    assert.ok(whatThisAdds("starter").some((l) => /Hand each client/.test(l)));
    const pro = whatThisAdds("pro");
    assert.ok(pro.some((l) => /Your name and logo/.test(l)));
    assert.ok(pro.some((l) => /template/i.test(l)));
    // Never repeats something the plan below already had.
    assert.ok(!pro.some((l) => /Hand each client/.test(l)));
  });
});

describe("the page can be found without an account", () => {
  it("it is in the itineraries footer and nav, and in the sitemap", () => {
    assert.match(readFileSync("components/Footer.tsx", "utf8"), /label: "Pricing", href: "\/pricing"/);
    assert.match(readFileSync("lib/navigation.ts", "utf8"), /href: "\/pricing"/);
    assert.match(readFileSync("lib/site-map.ts", "utf8"), /path: "\/pricing"/);
  });

  it("it is not behind a sign-in", () => {
    const page = readFileSync("app/pricing/page.tsx", "utf8");
    assert.doesNotMatch(page, /requireSignedIn|redirect\("\/login/);
  });

  it("and it is indexable — noIndex would defeat the point", () => {
    assert.doesNotMatch(readFileSync("app/pricing/page.tsx", "utf8"), /noIndex/);
  });
});
