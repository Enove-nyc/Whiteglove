/**
 * Whether the Duffel access token is a real one, without ever printing it.
 *
 * A common local setup pastes the variable name as the value
 * (`DUFFEL_ACCESS_TOKEN="DUFFEL_ACCESS_TOKEN"`). That is not a token: Duffel
 * will 401, and treating it as "connected" made the admin search look ready
 * when it could not run. Real tokens start `duffel_test_` or `duffel_live_`.
 */

import { cleanKey } from "@/lib/api-key";

export const DUFFEL_DASHBOARD = "https://duffel.com";

export type DuffelTokenKind = "missing" | "placeholder" | "unrecognised" | "test" | "live";

const PLACEHOLDERS = new Set([
  "DUFFEL_ACCESS_TOKEN",
  "DUFFEL_API_KEY",
  "your_duffel_access_token",
  "changeme",
  "placeholder",
  "xxx",
  "replace-me",
]);

function looksLikePlaceholder(value: string): boolean {
  if (PLACEHOLDERS.has(value) || PLACEHOLDERS.has(value.toLowerCase())) return true;
  // Angle-bracket or dollar-style env templates, not a token.
  return /^<.+>$/.test(value) || /^\$\{?.+\}$/.test(value);
}

/** Named access so Next keeps the server env substitution. */
export function duffelEnvToken(): string | undefined {
  return process.env.DUFFEL_ACCESS_TOKEN;
}

export function inspectDuffelToken(raw?: string): { kind: DuffelTokenKind; ready: boolean } {
  const value = (raw ?? "").trim();
  if (!value) return { kind: "missing", ready: false };
  if (looksLikePlaceholder(value)) return { kind: "placeholder", ready: false };
  if (/^duffel_test_[0-9A-Za-z_-]+$/.test(value)) return { kind: "test", ready: true };
  if (/^duffel_live_[0-9A-Za-z_-]+$/.test(value)) return { kind: "live", ready: true };
  return { kind: "unrecognised", ready: false };
}

export function inspectConfiguredDuffelToken(): { kind: DuffelTokenKind; ready: boolean } {
  return inspectDuffelToken(cleanKey(duffelEnvToken()) ?? duffelEnvToken());
}

export function duffelTokenHelp(kind: DuffelTokenKind): { message: string; detail: string } {
  if (kind === "missing") {
    return {
      message: "The Duffel account is not connected.",
      detail: `Add a real DUFFEL_ACCESS_TOKEN from the Duffel dashboard (${DUFFEL_DASHBOARD}) under Developers, set it in Vercel, then redeploy. A made-up value will not work.`,
    };
  }
  if (kind === "placeholder") {
    return {
      message: "DUFFEL_ACCESS_TOKEN is still a placeholder, not a token from Duffel.",
      detail: `Create an access token in the Duffel dashboard (${DUFFEL_DASHBOARD} → Developers) and paste that value into Vercel as DUFFEL_ACCESS_TOKEN, then redeploy. Do not invent a token.`,
    };
  }
  if (kind === "unrecognised") {
    return {
      message: "DUFFEL_ACCESS_TOKEN is not a Duffel access token.",
      detail: `A real token starts with duffel_test_ (sandbox fares) or duffel_live_ (real fares). Copy it from ${DUFFEL_DASHBOARD} → Developers, then redeploy.`,
    };
  }
  return {
    message: "The Duffel account is connected.",
    detail:
      kind === "test"
        ? "This is a test token: Duffel returns invented flights that cannot be ticketed. Swap it for a live token when you are ready to issue a real ticket."
        : "This is a live token. A search here creates real offers; booking charges a card through Duffel as merchant of record.",
  };
}

/**
 * The bearer token for admin Duffel calls, or a message that is safe to show.
 * Never includes the secret.
 */
export function duffelBearer():
  | { ok: true; token: string; kind: "test" | "live" }
  | { ok: false; message: string; detail: string } {
  const cleaned = cleanKey(duffelEnvToken());
  const inspected = inspectDuffelToken(cleaned ?? duffelEnvToken());
  if (!inspected.ready || (inspected.kind !== "test" && inspected.kind !== "live") || !cleaned) {
    const help = duffelTokenHelp(inspected.kind);
    return { ok: false, message: help.message, detail: help.detail };
  }
  return { ok: true, token: cleaned, kind: inspected.kind };
}
