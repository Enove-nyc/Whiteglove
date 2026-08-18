/**
 * What the site has to remember between "here is a car" and "I want that one".
 *
 * THIS EXISTS BECAUSE OF THEIR CONTRACT, NOT OURS. RouteStack's
 * /mcp/car/get-payment-url does not take a fare code. It takes the entire car
 * object back — every field they sent, plus the pickup and drop-off they were
 * asked about — and hands back a checkout link. So a price on our page and a
 * checkout on theirs are joined by a lump of their JSON that somebody has to
 * hold on to.
 *
 * IT IS HELD HERE AND NOT IN THE BROWSER. Sending their whole payload to the
 * page and posting it back would work and would be wrong: it puts a hundred
 * fields of a provider's internals on a public page, and it lets anyone edit
 * the car they are about to be quoted for. The page gets an opaque handle,
 * the server keeps the payload, and what goes to RouteStack is what RouteStack
 * sent us.
 *
 * SHORT-LIVED ON PURPOSE. A car quote is not a thing to keep — the price moves
 * and the desk sells out — so a handle lives thirty minutes and then stops
 * existing. Nothing here is a booking record, nobody is identified by it, and
 * a traveler who waits too long simply searches again.
 *
 * WITHOUT REDIS THERE IS NO HAND-OFF, and that is the honest behaviour: the
 * alternative is holding quotes in one container's memory, where a restart or
 * a second instance turns a Book button into a dead end at the moment somebody
 * is trying to spend money.
 */

import { randomUUID } from "node:crypto";
import type { ProviderId, TravelCategory } from "@/lib/travel/types";

const PREFIX = "white-glove:travel-checkout:";
const TTL_SECONDS = 30 * 60;

export type CheckoutHandle = {
  provider: ProviderId;
  category: TravelCategory;
  /** Exactly what the provider sent for this offer, untouched. */
  payload: unknown;
};

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function checkoutHandlesConfigured(): boolean {
  return Boolean(redisConfig());
}

/** Keep one offer's provider payload. Returns the handle, or null if we cannot. */
export async function keepForCheckout(entry: CheckoutHandle): Promise<string | null> {
  const config = redisConfig();
  if (!config) return null;
  const id = randomUUID();
  try {
    const response = await fetch(`${config.url}/setex/${encodeURIComponent(PREFIX + id)}/${TTL_SECONDS}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "content-type": "application/json" },
      body: JSON.stringify(entry),
      cache: "no-store",
    });
    return response.ok ? id : null;
  } catch {
    return null;
  }
}

/**
 * Read one back.
 *
 * A handle that has expired, or was never ours, returns null and the caller
 * tells the traveler to search again — never a stack trace and never a guess
 * at what they meant.
 */
export async function readForCheckout(id: string): Promise<CheckoutHandle | null> {
  const config = redisConfig();
  // A handle is a UUID we minted. Anything else is not worth a round trip.
  if (!config || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const response = await fetch(`${config.url}/get/${encodeURIComponent(PREFIX + id)}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { result?: string | null };
    if (!body.result) return null;
    const parsed = JSON.parse(body.result) as CheckoutHandle;
    return parsed && typeof parsed === "object" && parsed.provider ? parsed : null;
  } catch {
    return null;
  }
}
