import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { areaForPath } from "@/lib/admin-permissions";

describe("growth admin surfaces", () => {
  it("files new growth screens under known areas", () => {
    assert.equal(areaForPath("/admin/growth"), "content");
    assert.equal(areaForPath("/admin/alerts"), "content");
    assert.equal(areaForPath("/admin/settings/referral"), "access");
    assert.equal(areaForPath("/admin/settings/collaboration"), "access");
    assert.equal(areaForPath("/admin/settings/membership"), "access");
  });

  it("lists growth screens in admin navigation", () => {
    const nav = readFileSync("lib/admin-nav.ts", "utf8");
    assert.match(nav, /\/admin\/growth/);
    assert.match(nav, /\/admin\/alerts/);
    assert.match(nav, /\/admin\/settings\/referral/);
    assert.match(nav, /\/admin\/settings\/collaboration/);
    assert.match(nav, /\/admin\/settings\/membership/);
    assert.match(nav, /Growth/);
    assert.match(nav, /Alerts/);
    assert.match(nav, /Referrals/);
    assert.match(nav, /Collaboration/);
    assert.match(nav, /Plus/);
  });

  it("keeps destination commerce free of fake partner buttons", () => {
    const component = readFileSync("components/DestinationBookingOptions.tsx", "utf8");
    assert.match(component, /resolveLink/);
    assert.match(component, /readDestinationPlacements/);
    assert.match(component, /AffiliateDisclosure/);
  });

  it("shows landing-product earn state on the destination placements form", () => {
    const form = readFileSync("components/AdminPlacementsForm.tsx", "utf8");
    assert.match(form, /Works, earns nothing/);
    assert.match(form, /landingNotes/);
    assert.doesNotMatch(form, /under travel extras below/);
  });
});
