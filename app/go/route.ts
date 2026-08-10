import { NextResponse, type NextRequest } from "next/server";
import { recordClick, type BookingClick } from "@/lib/affiliate/clicks";
import { readAffiliateRequest } from "@/lib/affiliate/request";
import { resolveLink } from "@/lib/affiliate/partners";
import { readAffiliateConfig } from "@/lib/affiliate/config";

/**
 * Every booking link on this site goes through here.
 *
 * Record, then redirect. In that order, and awaited: a click written after the
 * 302 is a click that is often never written, because the browser has already
 * been told to leave. The write is bounded and never throws — a store that is
 * away costs a statistic, and the traveler still gets where they were going.
 *
 * SESSION COOKIE. First-party, anonymous, and rotating: it exists to tell one
 * visit's four clicks apart from four visitors' one click each, which is the
 * difference between a click-through rate that means something and one that
 * does not. It is not joined to an account and it carries nothing about the
 * visitor.
 *
 * A request this site cannot build a link for — an unjoined product, a flight
 * with no airports — is sent back to the page it came from rather than to a
 * broken partner search. The UI is not supposed to render those links at all;
 * this is the second line, not the first.
 */

const SESSION_COOKIE = "wg_click_session";
const SESSION_DAYS = 30;

function sessionId(request: NextRequest): { id: string; fresh: boolean } {
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  if (existing && /^[a-z0-9]{8,40}$/.test(existing)) return { id: existing, fresh: false };
  return { id: crypto.randomUUID().replace(/-/g, "").slice(0, 24), fresh: true };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = readAffiliateRequest(params);
  const back = request.headers.get("referer");
  const fallback = () => NextResponse.redirect(new URL(back && back.startsWith(request.nextUrl.origin) ? back : "/", request.url));

  if (!parsed) return fallback();

  const config = await readAffiliateConfig();
  const resolved = resolveLink(parsed, config);
  if (!resolved) return fallback();

  const { id: session, fresh } = sessionId(request);
  const click: BookingClick = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    product: parsed.product,
    network: resolved.route.network,
    destinationLabel: resolved.route.destinationLabel,
    earns: resolved.route.earns,
    destinationSlug: parsed.destinationSlug ?? "",
    page: parsed.page ?? "",
    placement: parsed.placement ?? "",
    campaignId: parsed.campaignId ?? "",
    checkIn: parsed.checkIn ?? "",
    checkOut: parsed.checkOut ?? "",
    adults: parsed.adults ?? 0,
    children: parsed.children ?? 0,
    rooms: parsed.rooms ?? 0,
    session,
    device: /Mobi|Android/i.test(request.headers.get("user-agent") ?? "") ? "mobile" : "desktop",
  };
  await recordClick(click);

  const response = NextResponse.redirect(resolved.url, 302);
  // Never cached: the destination depends on settings that can change between
  // one visitor and the next, and a cached 302 would outlive a closed partner.
  response.headers.set("Cache-Control", "no-store, max-age=0");
  if (fresh) {
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      path: "/",
    });
  }
  return response;
}
