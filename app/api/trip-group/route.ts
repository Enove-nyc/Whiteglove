import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getShareOwnerEmail, getSharedItineraryByShareId, getSharedTraveler } from "@/lib/account-store";
import { sameOrigin } from "@/lib/secure-access";
import { rateLimit } from "@/lib/rate-limit";
import { groupKey, memberCookieName, readMember, signMember } from "@/lib/trip-group-identity";
import { createTripChannel, pollTripGroup, readTripChannels, readTripGroup, removeTripChannel, sendTripGroup, tripHasChannel } from "@/lib/trip-group-store";
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
  let body: { code?: unknown; action?: unknown; name?: unknown; text?: unknown; channel?: unknown; after?: unknown; label?: unknown };
  try { body = JSON.parse(raw); } catch { return reply({ error: "That request could not be read." }, 400); }
  if (!body || typeof body !== "object") return reply({ error: "Open a trip first." }, 400);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(code)) return reply({ error: "That trip code is not active." }, 404);
  const action = body.action;
  if (action !== "join" && action !== "read" && action !== "send" && action !== "channels" && action !== "add-channel" && action !== "remove-channel") return reply({ error: "Choose a chat action." }, 400);
  const channel = body.channel ?? "general";
  if (!isTripChatChannel(channel)) return reply({ error: "Choose a chat channel." }, 400);
  const after = body.after;
  if (after !== undefined && (typeof after !== "string" || !/^[a-f0-9-]{36}$/.test(after))) return reply({ error: "Reload the conversation." }, 400);
  const credentialKey = groupKey(code);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const writes = action === "add-channel" || action === "remove-channel";
  const limited = await rateLimit(`trip-group:${action}:${credentialKey}:${groupKey(ip)}`, { limit: writes ? 10 : action === "send" ? 40 : 120, windowSeconds: 60 });
  if (!limited.ok) return reply({ error: "Please wait a moment before trying again." }, 429);
  // Always resolve against the live trip. Revoking sharing closes chat too;
  // a stale cookie, raw trip id, or guessed neighboring id grants no access.
  // Joining reads the whole trip once. Everything after only needs the code's
  // own key, which revoking the code or deleting the trip removes — so a poll
  // costs one small read instead of loading the trip owner's whole account.
  const wholeTrip = action === "join" ? await getSharedItineraryByShareId(code) : await getShareOwnerEmail(code);
  const traveler = wholeTrip ? null : await getSharedTraveler(code);
  const groupCode = wholeTrip ? code : traveler?.internalChatKey;
  if (!groupCode) return reply({ error: "That trip code is not active." }, 404);
  const group = groupKey(groupCode);
  const secret = process.env.WHITE_GLOVE_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (!secret) return reply({ error: "Trip chat is unavailable. Please try again later." }, 503);
  const cookie = memberCookieName(code);
  let member = readMember(request.cookies.get(cookie)?.value, code, secret, group);
  if (action === "join") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 60) return reply({ error: "Enter your name, up to 60 characters." }, 400);
    member = { id: member?.id ?? randomUUID(), name, group, credential: credentialKey };
    const response = reply({ member: { id: member.id, name: member.name } });
    response.cookies.set(cookie, signMember(member, secret), {
      httpOnly: true, secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:", sameSite: "lax", path: "/api/trip-group", maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  }
  if (!member) return reply({ needsName: true }, 401);
  const who = { id: member.id, name: member.name };
  try {
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
      return reply({ messages: await sendTripGroup(member, text, channel), member: who });
    }
    const messages = after ? await pollTripGroup(group, channel, after as string) : await readTripGroup(group, channel);
    return reply({ ...(messages === null ? { unchanged: true } : { messages }), member: who });
  } catch { return reply({ error: "Could not reach the trip chat. Please try again." }, 503); }
}
