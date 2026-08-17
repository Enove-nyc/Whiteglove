/**
 * Getting a token out of RouteStack.
 *
 * NOT A STATIC KEY. Their credentials are a public apiKey and a private
 * secret, and a request is authorised by signing `apiKey:timestamp:nonce` with
 * the secret, posting that to /mcp/auth/partner-token, and using the JWT that
 * comes back as an ordinary bearer token for twenty-four hours.
 *
 * The signature never leaves this file and the secret never leaves the server.
 * The timestamp and nonce are what stop a captured request being replayed, so
 * both are fresh every time a token is minted.
 *
 * ONE TOKEN, REUSED. Minting is a network round trip, and doing it before
 * every car search would double the latency of a search for no benefit. The
 * token is held in memory and renewed a little before it expires — in memory
 * rather than in the store, because a JWT is a credential and a process
 * restart losing it costs one extra round trip.
 */

import { createHmac, randomUUID } from "node:crypto";
import { providerFetch } from "@/lib/travel/search";

export type RouteStackConfig = { apiKey: string; secret: string; base: string };

export function routestackConfig(): RouteStackConfig | null {
  const apiKey = process.env.ROUTESTACK_API_KEY?.trim();
  const secret = process.env.ROUTESTACK_API_SECRET?.trim();
  const base = (process.env.ROUTESTACK_API_BASE?.trim() || "https://evolvemcp.routestack.ai").replace(/\/$/, "");
  return apiKey && secret ? { apiKey, secret, base } : null;
}

let cached: { token: string; expiresAt: number } | null = null;

/** Renew a few minutes early, so a search never carries a token that dies mid-flight. */
const EARLY_RENEWAL_MS = 5 * 60 * 1000;

export function signPartnerRequest(config: RouteStackConfig, timestamp: number, nonce: string) {
  // Their documented string to sign: apiKey:timestamp:nonce.
  const message = `${config.apiKey}:${timestamp}:${nonce}`;
  return createHmac("sha256", config.secret).update(message).digest("hex");
}

export async function routestackToken(config: RouteStackConfig, signal: AbortSignal): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt - EARLY_RENEWAL_MS > now) return cached.token;

  const timestamp = Math.floor(now / 1000);
  const nonce = randomUUID();
  const response = await providerFetch(`${config.base}/mcp/auth/partner-token`, {
    signal,
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      apiKey: config.apiKey,
      timestamp,
      nonce,
      hmac: signPartnerRequest(config, timestamp, nonce),
    }),
    timeoutMs: 8000,
  });
  const data = (await response.json()) as { token?: string; expiresIn?: string; result?: { token?: string } };
  const token = data.token ?? data.result?.token;
  if (!token) throw new Error("routestack returned no token");

  // "24h" in their example. Parsed rather than assumed, and floored to an hour
  // if they ever answer with something this does not understand.
  const hours = Number(String(data.expiresIn ?? "24h").replace(/[^\d.]/g, "")) || 1;
  cached = { token, expiresAt: now + hours * 60 * 60 * 1000 };
  return token;
}

/** Only for tests, which must not inherit a token minted by another test. */
export function forgetRouteStackToken(): void {
  cached = null;
}
