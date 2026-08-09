/**
 * What was pressed, where, and whether it earned anything.
 *
 * THE ONE FIELD THIS RECORD DOES NOT HAVE, and the reason it is written as a
 * type rather than as a convention: there is nowhere here to put a kosher
 * standard, a Shabbos requirement or an interest in kevarim. Those answers are
 * collected to do the job the visitor asked for — find them somewhere they can
 * eat and daven — and they are not an advertising profile. A field for them
 * would eventually be filled, so there is not one.
 *
 * `session` is a rotating anonymous id from a first-party cookie. It exists to
 * tell one visit's four clicks apart from four visitors' one click each, which
 * is the difference between a click-through rate that means something and one
 * that does not. It is not a person and it is not joined to an account.
 *
 * Stored in the same Redis the rest of the site's analytics use, and simply
 * absent when that is not configured — a missing store must never stop the
 * redirect, because the traveler pressed a button and is waiting.
 */

import type { AffiliateNetwork, TravelProduct } from "@/lib/affiliate/partners";

export type BookingClick = {
  id: string;
  at: string;
  product: TravelProduct;
  network: AffiliateNetwork;
  /** Where they land: "Kayak", "Booking.com", "Stay22". */
  destinationLabel: string;
  /** Whether a referral was actually recorded. False is a real, reportable state. */
  earns: boolean;
  /** The vacation destination slug, when the click came from one. */
  destinationSlug: string;
  /** The page it was pressed on, and the named position on that page. */
  page: string;
  placement: string;
  campaignId: string;
  /** Only what the partner accepts; absent otherwise. */
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  session: string;
  device: "mobile" | "desktop";
};

/** What a partner tells us afterwards. Never guessed at. */
export type ClickOutcome = {
  clickId: string;
  status: "reported" | "confirmed" | "cancelled";
  amount: number;
  currency: string;
  reconciledAt: string;
};

const KEY = "white-glove:booking-clicks";
const COUNTS = "white-glove:booking-click-counts";

/** Keep the newest 5,000. Enough for reporting; not a customer database. */
export const CLICK_HISTORY = 5000;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(command: string, body?: string): Promise<T | null> {
  const config = redisConfig();
  if (!config) return null;
  try {
    const response = await fetch(`${config.url}/${command}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${config.token}` },
      body,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

/**
 * The counter keys a click increments.
 *
 * Counted as well as listed, because the list is trimmed and the totals are
 * not: "how many hotel clicks has Rome had" should not quietly become "how
 * many since the last five thousand".
 */
export function counterKeys(click: BookingClick): string[] {
  const keys = [
    `product:${click.product}`,
    `network:${click.network}`,
    `placement:${click.placement || "unnamed"}`,
    `page:${click.page || "unknown"}`,
    `device:${click.device}`,
    click.earns ? "earning:yes" : "earning:no",
  ];
  if (click.destinationSlug) keys.push(`destination:${click.destinationSlug}`);
  if (click.campaignId) keys.push(`campaign:${click.campaignId}`);
  return keys;
}

/** Never throws, never blocks. A store that is away costs a statistic, not a booking. */
export async function recordClick(click: BookingClick): Promise<void> {
  if (!redisConfig()) return;
  await Promise.all([
    redis(`lpush/${KEY}`, JSON.stringify([JSON.stringify(click)])).then(() => redis(`ltrim/${KEY}/0/${CLICK_HISTORY - 1}`)),
    ...counterKeys(click).map((field) => redis(`hincrby/${COUNTS}/${encodeURIComponent(field)}/1`)),
  ]).catch(() => undefined);
}

export async function readClicks(limit = 500): Promise<BookingClick[]> {
  const rows = await redis<string[]>(`lrange/${KEY}/0/${Math.max(1, Math.min(limit, CLICK_HISTORY)) - 1}`);
  if (!Array.isArray(rows)) return [];
  const out: BookingClick[] = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row) as BookingClick;
      if (parsed && typeof parsed.id === "string") out.push(parsed);
    } catch {
      /* a row this version cannot read is skipped, not fatal */
    }
  }
  return out;
}

export async function readCounts(): Promise<Record<string, number>> {
  const raw = await redis<Record<string, string>>(`hgetall/${COUNTS}`);
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const n = Number(value);
    if (Number.isFinite(n)) out[decodeURIComponent(key)] = n;
  }
  return out;
}
