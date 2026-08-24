import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getAccountRecord, getCurrentAccountData, getTemplates } from "@/lib/account-store";
import { getPlan, setPlan } from "@/lib/account-plan-store";
import {
  describeSeats,
  extraSeats,
  inviteProblem,
  isOwner as isAgencyOwner,
  MAX_SEATS,
  removeMemberProblem,
  seatChangeProblem,
} from "@/lib/agency";
import {
  agencyIdFor,
  deleteInvite,
  listOpenInvites,
  newAgency,
  readAgency,
  setAccountAgency,
  writeAgency,
  writeInvite,
} from "@/lib/agency-store";
import { readBrand, writeBrand } from "@/lib/business-brand-store";
import { normalizeIdentity, identityKey } from "@/lib/identity";
import { writeTemplatesStore } from "@/lib/trip-templates-store";
import { agencySeatOfferable, agencySeatPriceId, type BillingPeriod, priceIdFor } from "@/lib/plan-billing";
import { readPlanOffering, readSubscription } from "@/lib/plan-billing-store";
import { describePrice, readPrice, readSubscriptionFromStripe, setSubscriptionSeatQuantity } from "@/lib/stripe";
import { sendAgencyInviteEmail } from "@/lib/email";
import { sameOrigin } from "@/lib/secure-access";
import { siteOrigin } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";

export const dynamic = "force-dynamic";

async function signedInEmail() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  return account?.email ?? null;
}

/**
 * Which billing period the owner's LIVE Pro subscription is actually on, by
 * matching its price id against the two Advisor Pro price ids — not stored
 * anywhere, worked out fresh so a seat is always bought on the period that
 * matches what is really being charged.
 */
async function proSubscriptionPeriod(
  subscriptionId: string,
  proMonthlyId: string,
  proYearlyId: string,
): Promise<BillingPeriod | null> {
  const live = await readSubscriptionFromStripe(subscriptionId);
  const item = live?.items?.data?.find((i) => i.price?.id === proMonthlyId || i.price?.id === proYearlyId);
  if (!item) return null;
  return item.price?.id === proYearlyId ? "yearly" : "monthly";
}

/**
 * Everything /agency needs to draw itself: who this account is on the
 * agency, if any, and whether IT can buy or change seats right now.
 *
 * SEATS NEED A LIVE CARD BEHIND THEM. Buying a seat is never offered to a
 * Pro account the owner granted by hand, or on One Trip, or while the
 * deployment is not actually taking cards — see agencySeatOfferable in
 * lib/plan-billing.ts. Nothing here invents a price: what a seat costs is
 * read from Stripe, same as everywhere else on this site.
 */
export async function GET() {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const plan = await getPlan(email);
  const agencyId = await agencyIdFor(email);
  const agency = agencyId ? await readAgency(agencyId) : null;
  const owner = agency ? isAgencyOwner(agency, email) : false;
  const pendingInvites = agency ? await listOpenInvites(agency.id) : [];

  let canBuySeats = false;
  let seatLine = "";
  let seatPeriod: BillingPeriod | null = null;

  if (plan === "pro" && (!agency || owner)) {
    const offering = await readPlanOffering();
    const sub = await readSubscription(email);
    if (sub?.subscriptionId) {
      seatPeriod = await proSubscriptionPeriod(sub.subscriptionId, priceIdFor(offering, "pro", "monthly"), priceIdFor(offering, "pro", "yearly"));
      if (seatPeriod && agencySeatOfferable(offering, seatPeriod)) {
        canBuySeats = true;
        seatLine = describePrice(await readPrice(agencySeatPriceId(offering, seatPeriod)));
      }
    }
  }

  return NextResponse.json({
    plan,
    hasAgency: Boolean(agency),
    isOwner: owner,
    seatsUsed: agency?.members.length ?? 0,
    seatsPurchased: agency?.seatsPurchased ?? 0,
    maxSeats: MAX_SEATS,
    seatsDescription: agency ? describeSeats(agency, pendingInvites.length) : "",
    members: (agency?.members ?? []).map((m) => ({ ...m, you: identityKey(m.account) === identityKey(email) })),
    // Who invited whom is the owner's business; a member sees only that seats exist, not who is pending.
    pendingInvites: owner ? pendingInvites.map((i) => ({ email: i.email, invitedAt: i.invitedAt, expiresAt: i.expiresAt })) : [],
    canBuySeats,
    seatLine,
  });
}

type Body = { action?: string; seats?: number; email?: string; token?: string; account?: string };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const plan = await getPlan(email);

  const body = (await request.json().catch(() => null)) as Body | null;
  const action = body?.action;

  const agencyId = await agencyIdFor(email);
  const agency = agencyId ? await readAgency(agencyId) : null;

  switch (action) {
    case "buy-seats": {
      if (plan !== "pro") return NextResponse.json({ error: "An agency starts from Advisor Pro." }, { status: 403 });
      if (agency && !isAgencyOwner(agency, email)) {
        return NextResponse.json({ error: "Only the owner can change seats." }, { status: 403 });
      }
      const seats = Number(body?.seats);
      const pendingCount = agency ? (await listOpenInvites(agency.id)).length : 0;
      const problem = seatChangeProblem(agency, seats, pendingCount);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });

      const offering = await readPlanOffering();
      const sub = await readSubscription(email);
      if (!sub?.subscriptionId) {
        return NextResponse.json({ error: "Advisor Pro needs to be a real Stripe subscription before it can carry seats." }, { status: 409 });
      }
      const period = await proSubscriptionPeriod(sub.subscriptionId, priceIdFor(offering, "pro", "monthly"), priceIdFor(offering, "pro", "yearly"));
      if (!period || !agencySeatOfferable(offering, period)) {
        return NextResponse.json({ error: "Seats are not offered right now." }, { status: 409 });
      }

      const result = await setSubscriptionSeatQuantity({
        subscriptionId: sub.subscriptionId,
        seatPriceId: agencySeatPriceId(offering, period),
        quantity: extraSeats(seats),
      });
      if (!result.ok) {
        console.error("[agency] seat update failed:", result.error);
        return NextResponse.json({ error: "That could not be charged just now. Please try again shortly." }, { status: 502 });
      }

      if (!agency) {
        // Founding the agency. Their existing letterhead and saved trip
        // templates, if any, carry over to the shared pool — nothing about
        // either resets just because a second login can now use them too.
        const priorBrand = await readBrand(email);
        const priorTemplates = await getTemplates(email);
        const fresh = newAgency(email, seats);
        await writeAgency(fresh);
        await setAccountAgency(email, fresh.id);
        if (priorBrand) await writeBrand(email, priorBrand);
        if (priorTemplates.length) await writeTemplatesStore(email, priorTemplates);
        return NextResponse.json({ ok: true });
      }
      await writeAgency({ ...agency, seatsPurchased: seats, updatedAt: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }

    case "invite": {
      if (!agency) return NextResponse.json({ error: "Buy a seat before inviting anybody." }, { status: 409 });
      if (!isAgencyOwner(agency, email)) return NextResponse.json({ error: "Only the owner can invite." }, { status: 403 });
      const identity = normalizeIdentity(String(body?.email ?? ""));
      if (!identity || identity.kind !== "email") {
        return NextResponse.json({ error: "That does not look like an email address." }, { status: 400 });
      }
      const pending = await listOpenInvites(agency.id);
      const elsewhere = await agencyIdFor(identity.value);
      const problem = inviteProblem({
        agency,
        email: identity.value,
        pendingInvites: pending.filter((i) => identityKey(i.email) !== identity.value).length,
        alreadyElsewhere: Boolean(elsewhere) && elsewhere !== agency.id,
      });
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      if (pending.some((i) => identityKey(i.email) === identity.value)) {
        return NextResponse.json({ error: "Already invited — ask them to check their email." }, { status: 409 });
      }

      const token = randomBytes(9).toString("base64url");
      const now = new Date().toISOString();
      const invite = {
        token,
        agencyId: agency.id,
        email: identity.value,
        invitedAt: now,
        invitedBy: email,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };
      if (!(await writeInvite(invite))) {
        return NextResponse.json({ error: "That could not be saved. Try again." }, { status: 503 });
      }

      const origin = siteOrigin()?.origin || request.nextUrl.origin;
      const ownerRecord = await getAccountRecord(email);
      await sendAgencyInviteEmail(identity.value, {
        ownerName: ownerRecord?.name || email,
        url: `${origin}/agency/join?token=${token}`,
        siteBrand: await currentBrand(),
      }).catch(() => undefined);

      return NextResponse.json({ ok: true });
    }

    case "revoke-invite": {
      if (!agency || !isAgencyOwner(agency, email)) return NextResponse.json({ error: "Only the owner can do that." }, { status: 403 });
      // By email, not by token — the token is the invite link itself, and
      // there is no reason for the owner's own screen to ever hold it, even
      // over an authenticated connection to their own account.
      const target = identityKey(String(body?.email ?? ""));
      const invite = target ? (await listOpenInvites(agency.id)).find((i) => identityKey(i.email) === target) : null;
      if (!invite) return NextResponse.json({ error: "That invite is already gone." }, { status: 404 });
      await deleteInvite(invite);
      return NextResponse.json({ ok: true });
    }

    case "remove-member": {
      if (!agency || !isAgencyOwner(agency, email)) return NextResponse.json({ error: "Only the owner can do that." }, { status: 403 });
      const target = String(body?.account ?? "");
      const problem = removeMemberProblem(agency, target);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      await setAccountAgency(target, undefined);
      await setPlan(target, "free", `Removed from ${email}'s agency`);
      await writeAgency({
        ...agency,
        members: agency.members.filter((m) => identityKey(m.account) !== identityKey(target)),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    case "leave": {
      if (!agency) return NextResponse.json({ error: "You are not on an agency." }, { status: 409 });
      const problem = removeMemberProblem(agency, email);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      await setAccountAgency(email, undefined);
      await setPlan(email, "free", "Left the agency");
      await writeAgency({
        ...agency,
        members: agency.members.filter((m) => identityKey(m.account) !== identityKey(email)),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Say what to do." }, { status: 400 });
  }
}
