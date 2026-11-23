import { randomUUID } from "node:crypto";
import { after as afterResponse, NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountSummary, getSharedTraveler, getShareOwnerEmail, getSharedItineraryByShareId, notifyFamilyChat } from "@/lib/account-store";
import { sameOrigin } from "@/lib/secure-access";
import { rateLimit } from "@/lib/rate-limit";
import { groupKey, memberCookieName, readMember, signMember } from "@/lib/trip-group-identity";
import { createTripChannel, newestTripGroupMessage, pollTripGroup, readTripChannels, readTripGroup, removeTripChannel, reportFamilyChat, sendTripGroup, tripHasChannel } from "@/lib/trip-group-store";

import { cleanChannelLabel, isTripChatChannel } from "@/lib/trip-chat-channels";

export const dynamic = "force-dynamic";
function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
// POST reads keep the trip credential out of request URLs and access logs.
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "Please open your trip again." }, 403);
  const raw = await request.text();
  if (raw.length > 6000) return reply({ error: "That message is too long." }, 413);
  let body: { code?: unknown; action?: unknown; name?: unknown; text?: unknown; channel?: unknown; after?: unknown; messageId?: unknown; reportKind?: unknown; label?: unknown };
  try { body = JSON.parse(raw); } catch { return reply({ error: "That request could not be read." }, 400); }
  if (!body || typeof body !== "object") return reply({ error: "Open a trip first." }, 400);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(code)) return reply({ error: "That trip code is not active." }, 404);
  const action = body.action;
  if (action !== "join" && action !== "read" && action !== "send" && action !== "peek" && action !== "report" && action !== "channels" && action !== "add-channel" && action !== "remove-channel") return reply({ error: "Choose a chat action." }, 400);
  const channel = body.channel ?? "general";
  if (!isTripChatChannel(channel)) return reply({ error: "Choose a chat channel." }, 400);
  const after = body.after;
  if (after !== undefined && (typeof after !== "string" || !/^[a-f0-9-]{36}$/.test(after))) return reply({ error: "Reload the conversation." }, 400);
  const rateKey = groupKey(code);
  const writes = action === "add-channel" || action === "remove-channel";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = await rateLimit(`trip-group:${action}:${rateKey}:${groupKey(ip)}`, { limit: action === "report" ? 5 : writes ? 10 : action === "send" ? 40 : 120, windowSeconds: 60 });
  if (!limited.ok) return reply({ error: "Please wait a moment before trying again." }, 429);
  // Always resolve against the live trip. Revoking sharing closes chat too;
  // a stale cookie, raw trip id, or guessed neighboring id grants no access.
  const wholeTrip = action === "join" ? await getSharedItineraryByShareId(code) : await getShareOwnerEmail(code);
  const legacyTraveler = wholeTrip ? null : await getSharedTraveler(code);
  const legacyGroup = wholeTrip ? code : legacyTraveler?.internalChatKey;
  const account = legacyGroup ? null : await getCurrentAccountSummary(request.cookies.get(accountCookieName())?.value);
  const family = account ? await getSharedTraveler(code, account.email) : null;
  if (!legacyGroup && !family?.privateInvite) return reply({ error: "That trip invitation is not active." }, 404);

  const group = family?.privateInvite ? groupKey(JSON.stringify([family.ownerEmail, family.tripId])) : groupKey(legacyGroup!);
  const secret = process.env.WHITE_GLOVE_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (!secret) return reply({ error: "Trip chat is unavailable. Please try again later." }, 503);
  const cookie = memberCookieName(code);
  let member = account && family?.privateInvite
    ? { id: groupKey(JSON.stringify([group, account.email])), name: (family.ownerEmail === account.email ? account.name || "Trip organizer" : family.traveler.name).slice(0, 60), group }
    : readMember(request.cookies.get(cookie)?.value, code, secret, group);
  if (action === "join" && family?.privateInvite && member) return reply({ member: { id: member.id, name: member.name } });
  if (action === "join") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 60) return reply({ error: "Enter your name, up to 60 characters." }, 400);
    member = { id: member?.id ?? randomUUID(), name, group, credential: rateKey };
    const response = reply({ member: { id: member.id, name: member.name } });
    response.cookies.set(cookie, signMember(member, secret), {
      httpOnly: true, secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:", sameSite: "lax", path: "/api/trip-group", maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  }
  if (!member) return reply({ needsName: true }, 401);
  const who = { id: member.id, name: member.name };
  try {
    if (action === "report") {
      if (!family?.privateInvite || typeof body.messageId !== "string" || !/^[a-f0-9-]{36}$/.test(body.messageId) ||
          (body.reportKind !== "message" && body.reportKind !== "traveler")) {
        return reply({ error: "Choose a message from the family trip chat." }, 400);
      }
      const saved = await reportFamilyChat(group, channel, member.id, body.messageId, body.reportKind);
      return saved ? reply({ reported: true }) : reply({ error: "That message is no longer available to report." }, 404);
    }
    if (action === "peek") {
      if (!family?.privateInvite) return reply({ error: "This trip does not support chat previews." }, 404);
      const message = await newestTripGroupMessage(group);
      return reply({ newestId: message?.id, mine: message?.memberId === member.id });
    }
    if (action === "channels") return reply({ channels: await readTripChannels(group), member: who });
    if (action === "add-channel") {
      const label = cleanChannelLabel(body.label);
      if (!label) return reply({ error: "Name the channel in up to 40 characters." }, 400);
      const result = await createTripChannel(member, label);
      return "error" in result ? reply({ error: result.error }, 409) : reply({ ...result, member: who });
    }
    if (action === "remove-channel") {
      const result = await removeTripChannel(member, channel);
      return "error" in result ? reply({ error: result.error }, 403) : reply({ ...result, member: who });
    }
    if (action === "send") {
      // A message only goes to a channel this trip really has.
      if (!(await tripHasChannel(group, channel))) return reply({ error: "That channel was removed.", channelGone: true }, 404);
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text || text.length > 2000) return reply({ error: "Write a message of up to 2,000 characters." }, 400);
      const messages = await sendTripGroup(member, text, channel);
      if (account && family?.privateInvite) {
        afterResponse(() => notifyFamilyChat(family.ownerEmail, family.tripId, account.email).catch(() => undefined));
      }
      return reply({ messages, member: { id: member.id, name: member.name } });
    }
    const messages = after ? await pollTripGroup(group, channel, after as string) : await readTripGroup(group, channel);
    return reply({ ...(messages === null ? { unchanged: true } : { messages }), member: { id: member.id, name: member.name } });
  } catch { return reply({ error: "Could not reach the trip chat. Please try again." }, 503); }
}
