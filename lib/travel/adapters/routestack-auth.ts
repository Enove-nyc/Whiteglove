/**
 * Getting a token out of RouteStack.
 *
 * NOT A STATIC KEY. Their credentials are a public apiKey and a private
 * secret, traded at /mcp/auth/partner-token for a JWT that serves as an
 * ordinary bearer token for twenty-four hours.
 *
 * THE SIGNATURE IS base64url, AND THAT IS THE WHOLE TRICK. Their OpenAPI
 * document says only "HMAC signature of apiKey:timestamp:nonce using the
 * partner secret key" and does not name an encoding; their key-usage guide
 * does, in one word buried in a code sample — `.digest('base64url')`. Signed
 * as hex or as ordinary base64 the request is well-formed and refused, and the
 * refusal says "partner account is not found or not active", which reads like
 * a dead account rather than a wrong encoding. That message cost an afternoon,
 * so it is written down here.
 *
 * THE SECRET NEVER LEAVES THIS SERVER. It signs; it is not sent. An earlier
 * attempt did put it in the body — their error text asks for an "apiSecret" —
 * but with the correct digest it is not needed, and a secret that stays home
 * is the point of signing in the first place.
 *
 * THE HOST COMES FROM THE ENVIRONMENT, AND THE DEFAULT IS PRODUCTION. There
 * are two of them — mcp.routestack.ai is the live market, evolvemcp.
 * routestack.ai is the sandbox — and a sandbox key against the production host
 * is refused with "partner account is not found or not active", which reads
 * like a dead account rather than the wrong address. That message cost an
 * afternoon once already.
 *
 * The default is deliberately the production host and not the sandbox one.
 * Both failure modes are then loud: sandbox credentials with the variable
 * missing simply cannot authenticate, and somebody notices. The other way
 * round — defaulting to the sandbox — a deleted variable would quietly serve
 * invented prices to travelers, and nothing on any screen would say so.
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
  const base = (process.env.ROUTESTACK_API_BASE?.trim() || "https://mcp.routestack.ai").replace(/\/$/, "");
  return apiKey && secret ? { apiKey, secret, base } : null;
}

let cached: { token: string; expiresAt: number } | null = null;

/** Renew a few minutes early, so a search never carries a token that dies mid-flight. */
const EARLY_RENEWAL_MS = 5 * 60 * 1000;

export function signPartnerRequest(config: RouteStackConfig, timestamp: number, nonce: string) {
  // Their documented string to sign, and their documented encoding. base64url
  // — not hex, not plain base64. See the note above for what the wrong one
  // looks like from the outside.
  const message = `${config.apiKey}:${timestamp}:${nonce}`;
  return createHmac("sha256", config.secret).update(message).digest("base64url");
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

/**
 * One POST to RouteStack, authenticated.
 *
 * Every one of their endpoints is a POST with a JSON body and a bearer token,
 * so the three adapters were about to write the same six lines each. Written
 * once here, where the token already lives.
 */
export async function routestackPost<T>(
  config: RouteStackConfig,
  path: string,
  body: unknown,
  signal: AbortSignal,
  timeoutMs = 12000,
): Promise<T> {
  const token = await routestackToken(config, signal);
  const response = await providerFetch(`${config.base}${path}`, {
    signal,
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    timeoutMs,
  });
  return (await response.json()) as T;
}

/**
 * An IATA code for a place, asked of their flight index.
 *
 * WHY THIS IS HERE AND NOT IN THE CAR ADAPTER. Their car location index is a
 * different index from their flight one, and it does not know every name a
 * traveler would type: "Krakow" and "Kraków" both return nothing from cars,
 * while "Cracow" and "KRK" return the airport. The flight index does know
 * Kraków, and answers KRK. So when the car index draws a blank, this asks the
 * flight index for a code and tries again with that. Shared because a hotel
 * search may want the same trick later.
 */
export async function routestackAirportCode(
  config: RouteStackConfig,
  term: string,
  signal: AbortSignal,
): Promise<string | null> {
  const data = await routestackPost<{ result?: Array<{ code?: string }> }>(
    config,
    "/mcp/flight/locations",
    { term },
    signal,
    8000,
  );
  return data.result?.find((row) => row.code)?.code ?? null;
}
