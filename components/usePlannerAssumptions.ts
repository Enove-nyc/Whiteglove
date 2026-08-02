"use client";

import { useEffect, useState } from "react";
import { BUILT_IN_ASSUMPTIONS, type PlannerAssumptions } from "@/data/planner-assumptions";
import { mergeAssumptions } from "@/lib/planner-settings";

/**
 * The owner's planning figures, for a screen that renders in the browser.
 *
 * ONE REQUEST FOR THE WHOLE PAGE, kept at module level, because the answer is
 * the same everywhere and does not change while somebody is reading.
 *
 * THE BUILT-IN FIGURES ARE NEVER WAITED FOR. They are already in the bundle and
 * are a complete working set, so a request that fails leaves the page reading
 * exactly as the site shipped — the right way for this to fail. `ready` says
 * whether the answer has come back, for the one screen that would rather wait
 * than lay a printed page out twice.
 */
let promise: Promise<PlannerAssumptions> | null = null;

function load(): Promise<PlannerAssumptions> {
  promise ??= fetch("/api/planner-settings", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => mergeAssumptions(body))
    .catch(() => BUILT_IN_ASSUMPTIONS);
  return promise;
}

export function usePlannerAssumptions(): { assume: PlannerAssumptions; ready: boolean } {
  const [state, setState] = useState<{ assume: PlannerAssumptions; ready: boolean }>({
    assume: BUILT_IN_ASSUMPTIONS,
    ready: false,
  });

  // Written from the promise's own callback, not from the effect body.
  useEffect(() => {
    let alive = true;
    load().then((assume) => {
      if (alive) setState({ assume, ready: true });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
