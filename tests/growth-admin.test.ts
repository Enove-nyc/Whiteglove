import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { areaForPath } from "@/lib/admin-permissions";

describe("growth admin surfaces", () => {
  it("files new growth screens under known areas", () => {
    assert.equal(areaForPath("/admin/growth"), "content");
  });

  it("lists growth screens in admin navigation", () => {
    const nav = readFileSync("lib/admin-nav.ts", "utf8");
    assert.match(nav, /\/admin\/growth/);
    assert.match(nav, /Growth/);
    // Alerts, referrals, collaboration and White Glove Plus came off at the
    // owner's word (18 November 2026).
    assert.doesNotMatch(nav, /\/admin\/alerts|\/admin\/settings\/(referral|collaboration|membership)/);
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
