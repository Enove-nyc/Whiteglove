/**
 * Which providers are on, in which category, and how far.
 *
 * THREE STATES, NOT TWO. A provider is off, or it is on for the admin only, or
 * it is on for everybody. The middle state is the whole point of this file: it
 * is how a new company gets tested against real searches on the real site
 * without a single visitor meeting it. Nothing reaches the public site until
 * somebody sets it to "public" deliberately.
 *
 * SETTINGS, NOT ENVIRONMENT VARIABLES. A flag that needs a redeploy is a flag
 * nobody turns off at nine on a Friday when a provider starts returning
 * nonsense. These live beside the site's other settings, so the owner can shut
 * one down from a screen. Whether the provider is *configured* — whether its
 * key exists — stays in the environment, where secrets belong.
 */

import type { ProviderId, TravelCategory } from "@/lib/travel/types";

/** Off / admin-only / everybody. */
export type ProviderStage = "off" | "testing" | "public";

export const STAGE_LABELS: Record<ProviderStage, string> = {
  off: "Off",
  testing: "Testing — admin only",
  public: "Live for visitors",
};

export type ProviderStages = Partial<Record<`${ProviderId}:${TravelCategory}`, ProviderStage>>;

/**
 * Where each provider starts before anybody touches a setting.
 *
 * The three that already serve visitors are public because they already are —
 * this file describes the site as it is, and turning them down would be a
 * change to the public site dressed up as configuration. RouteStack starts off
 * entirely: it has never been connected.
 */
export const DEFAULT_STAGES: Required<Pick<ProviderStages, "stay22:hotel" | "travelpayouts:flight" | "duffel:flight" | "duffel:hotel" | "routestack:car" | "routestack:hotel" | "routestack:flight">> = {
  "stay22:hotel": "public",
  "travelpayouts:flight": "public",
  // Duffel has always been admin-only, guarded at the endpoint. Unchanged.
  "duffel:flight": "testing",
  "duffel:hotel": "testing",
  "routestack:car": "off",
  "routestack:hotel": "off",
  "routestack:flight": "off",
};

export function stageOf(stages: ProviderStages, provider: ProviderId, category: TravelCategory): ProviderStage {
  const key = `${provider}:${category}` as const;
  return stages[key] ?? DEFAULT_STAGES[key as keyof typeof DEFAULT_STAGES] ?? "off";
}

/**
 * Whether this provider may answer this particular search.
 *
 * `audience` is the honest question — who is looking — rather than a boolean
 * called something like `isAdmin`, so a call site cannot accidentally pass
 * `true` and put a testing provider in front of a traveler.
 */
export function providerIsAllowed(
  stages: ProviderStages,
  provider: ProviderId,
  category: TravelCategory,
  audience: "public" | "admin",
): boolean {
  const stage = stageOf(stages, provider, category);
  if (stage === "off") return false;
  if (stage === "public") return true;
  return audience === "admin";
}

/** Every provider/category pair the site knows about, for the admin screen. */
export const KNOWN_PAIRS: ReadonlyArray<{ provider: ProviderId; category: TravelCategory }> = [
  { provider: "duffel", category: "flight" },
  { provider: "duffel", category: "hotel" },
  { provider: "travelpayouts", category: "flight" },
  { provider: "stay22", category: "hotel" },
  { provider: "routestack", category: "car" },
  { provider: "routestack", category: "hotel" },
  { provider: "routestack", category: "flight" },
] as const;
