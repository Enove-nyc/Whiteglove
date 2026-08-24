import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  activeSuggestions,
  dismissSuggestion,
  emptyOptimizationResult,
  isStale,
  itinerarySignature,
  type OptimizationResult,
  type OptimizationSuggestion,
} from "@/data/itinerary-optimization";

function suggestion(over: Partial<OptimizationSuggestion> = {}): OptimizationSuggestion {
  return { id: "s1", message: "Day 3 is nearly empty while day 2 is packed.", dismissed: false, ...over };
}

describe("an itinerary's signature", () => {
  const base = { startDate: "2026-06-01", endDate: "2026-06-10", flights: [], lodging: [], activities: [] };

  it("changes when an activity's date changes", () => {
    const a = itinerarySignature({ ...base, activities: [{ id: "x", date: "2026-06-02" }] });
    const b = itinerarySignature({ ...base, activities: [{ id: "x", date: "2026-06-03" }] });
    assert.notEqual(a, b);
  });

  it("is the same regardless of the order stops are listed in", () => {
    const acts = [{ id: "a", date: "2026-06-02" }, { id: "b", date: "2026-06-03" }];
    const x = itinerarySignature({ ...base, activities: acts });
    const y = itinerarySignature({ ...base, activities: [...acts].reverse() });
    assert.equal(x, y);
  });

  it("is unaffected by an activity's own name — only its scheduling matters here", () => {
    const a = itinerarySignature({ ...base, activities: [{ id: "x", date: "2026-06-02", order: 1 }] });
    const b = itinerarySignature({ ...base, activities: [{ id: "x", date: "2026-06-02", order: 1 }] });
    assert.equal(a, b);
  });
});

describe("whether a review has gone stale", () => {
  it("is stale once the itinerary's signature no longer matches", () => {
    const result: OptimizationResult = { ...emptyOptimizationResult(), forSignature: "old" };
    assert.equal(isStale(result, "new"), true);
  });

  it("is fresh when the signature still matches", () => {
    const result: OptimizationResult = { ...emptyOptimizationResult(), forSignature: "same" };
    assert.equal(isStale(result, "same"), false);
  });
});

describe("dismissing a suggestion", () => {
  it("dismisses only the one suggestion", () => {
    const result: OptimizationResult = { ...emptyOptimizationResult(), suggestions: [suggestion({ id: "a" }), suggestion({ id: "b" })] };
    const out = dismissSuggestion(result, "a", true);
    assert.equal(out.suggestions.find((s) => s.id === "a")?.dismissed, true);
    assert.equal(out.suggestions.find((s) => s.id === "b")?.dismissed, false);
  });

  it("can be undone", () => {
    const result: OptimizationResult = { ...emptyOptimizationResult(), suggestions: [suggestion({ id: "a", dismissed: true })] };
    const out = dismissSuggestion(result, "a", false);
    assert.equal(out.suggestions[0].dismissed, false);
  });
});

describe("what's actually worth showing", () => {
  it("leaves out dismissed suggestions", () => {
    const result: OptimizationResult = {
      ...emptyOptimizationResult(),
      suggestions: [suggestion({ id: "a", dismissed: true }), suggestion({ id: "b", dismissed: false })],
    };
    assert.deepEqual(activeSuggestions(result).map((s) => s.id), ["b"]);
  });
});

describe("optimization is a personal-travel feature, not Business-gated", () => {
  const ROUTE = readFileSync("app/api/account/optimize/route.ts", "utf8");

  it("has no mayServeCompanionClients gate", () => {
    assert.doesNotMatch(ROUTE, /mayServeCompanionClients/);
  });

  it("checks same-origin before any write", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
  });

  it("resolves a staff login through resolveBusinessOwner", () => {
    assert.match(ROUTE, /resolveBusinessOwner/);
  });
});

describe("the AI is given the itinerary's own deterministic warnings, not asked to re-find them", () => {
  const STORE = readFileSync("lib/account-store.ts", "utf8");

  it("builds its day summary from buildDays(), the same computation the planner's own view uses", () => {
    assert.match(STORE, /buildDays\(itinerary\)/);
  });

  it("includes each day's own warnings in the summary handed to the model", () => {
    const fn = STORE.slice(STORE.indexOf("function optimizationSummary"));
    assert.match(fn.slice(0, fn.indexOf("\n\n")), /day\.warnings/);
  });
});
