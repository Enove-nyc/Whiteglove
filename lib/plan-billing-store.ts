/**
 * Where the plan-offering switch lives, and where a live subscription is
 * written down.
 *
 * TWO THINGS, KEPT APART ON PURPOSE.
 *
 * The offering is one record: is this open, how does somebody pay, what are the
 * prices. It is the owner's setting and nothing else writes it.
 *
 * A subscription is one record per account, written by the Stripe webhook and
 * read by the account page. It is deliberately NOT the account's plan — the
 * plan is on the account record, which is the one place anything asks "what is
 * this person allowed to do". This holds the *why*: which Stripe customer, when
 * it renews, whether it is about to end. So a plan set by hand by the owner and
 * a plan set by a card work identically everywhere else on the site, and losing
 * this store demotes nobody.
 */

import { updateTag } from "next/cache";
import { type AccountPlan } from "@/lib/account-plans";
import { cleanOffering, DEFAULT_OFFERING, type PlanOffering } from "@/lib/plan-billing";
import { identityKey } from "@/lib/identity";

const OFFERING_KEY = "white-glove:plan-offering";
const SUB_PREFIX = "white-glove:subscription:";
const SUB_INDEX = "white-glove:subscription-index";
const CUSTOMER_PREFIX = "white-glove:stripe-customer:";

export const PLAN_OFFERING_TAG = "plan-offering";

export function planBillingStoreAvailable() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

/* ---- the offering ------------------------------------------------------- */

/**
 * The switch as it stands.
 *
 * A store that cannot be read returns the default — which is open, on "ask", so
 * a Redis outage leaves the account page doing what it has always done rather
 * than making the site look as though a feature had been withdrawn. What a
 * failure here CANNOT produce is Stripe: "stripe" only ever comes from a record
 * the owner saved, so no outage, bad parse or fresh deployment can end with
 * somebody's card being charged.
 */
export async function readPlanOffering(): Promise<PlanOffering> {
  if (!planBillingStoreAvailable()) return { ...DEFAULT_OFFERING };
  const raw = await redis<string>(`get/${OFFERING_KEY}`);
  if (!raw) return { ...DEFAULT_OFFERING };
  try {
    return cleanOffering(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_OFFERING };
  }
}

export async function writePlanOffering(offering: PlanOffering, by: string): Promise<boolean> {
  if (!planBillingStoreAvailable()) return false;
  const next = cleanOffering({ ...offering, updatedAt: new Date().toISOString(), updatedBy: by });
  if ((await redis(`set/${OFFERING_KEY}`, JSON.stringify(next))) === null) return false;
  try {
    updateTag(PLAN_OFFERING_TAG);
  } catch {
    /* no request context */
  }
  return true;
}

/* ---- a live subscription ------------------------------------------------ */

export type SubscriptionRecord = {
  /** The account it belongs to — what they sign in with. */
  account: string;
  plan: AccountPlan;
  /** Stripe's ids, so the owner can find it in his own dashboard. */
  customerId: string;
  subscriptionId: string;
  /** "active", "trialing", "past_due", "canceled" — Stripe's own word. */
  status: string;
  /** ISO. When the paid-up period runs out. */
  currentPeriodEnd?: string;
  /** True when they have cancelled but the paid period has not run out yet. */
  cancelAtPeriodEnd?: boolean;
  startedAt: string;
  updatedAt: string;
};

const subKey = (account: string) => `${SUB_PREFIX}${identityKey(account)}`;

export async function readSubscription(account: string): Promise<SubscriptionRecord | null> {
  if (!account || !planBillingStoreAvailable()) return null;
  const raw = await redis<string>(`get/${encodeURIComponent(subKey(account))}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SubscriptionRecord;
    return parsed && typeof parsed === "object" && parsed.account ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeSubscription(record: SubscriptionRecord): Promise<boolean> {
  if (!planBillingStoreAvailable()) return false;
  const ok = (await redis(`set/${encodeURIComponent(subKey(record.account))}`, JSON.stringify(record))) !== null;
  if (!ok) return false;
  await redis(`sadd/${SUB_INDEX}`, JSON.stringify([record.account]));
  return true;
}

/** Everything on a card right now, for the owner's own screen. */
export async function listSubscriptions(limit = 500): Promise<SubscriptionRecord[]> {
  if (!planBillingStoreAvailable()) return [];
  const accounts = await redis<string[]>(`smembers/${SUB_INDEX}`);
  if (!Array.isArray(accounts)) return [];
  const rows: SubscriptionRecord[] = [];
  for (const account of accounts.slice(0, limit)) {
    const row = await readSubscription(account);
    if (row) rows.push(row);
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/* ---- which account a Stripe customer is --------------------------------- */

/**
 * Stripe hands back a customer id, not an email, on most of the events that
 * matter. This is the way back.
 *
 * Written when the checkout is created — before the card is ever entered — so
 * a webhook that arrives while the traveller is still on Stripe's page can
 * still be matched to somebody. Without it, a subscription that cancels months
 * later has no way home.
 */
export async function rememberCustomer(customerId: string, account: string): Promise<boolean> {
  if (!customerId || !account || !planBillingStoreAvailable()) return false;
  return (await redis(`set/${encodeURIComponent(`${CUSTOMER_PREFIX}${customerId}`)}`, account)) !== null;
}

export async function accountForCustomer(customerId: string): Promise<string | null> {
  if (!customerId || !planBillingStoreAvailable()) return null;
  return redis<string>(`get/${encodeURIComponent(`${CUSTOMER_PREFIX}${customerId}`)}`);
}
