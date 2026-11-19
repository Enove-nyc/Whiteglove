import { randomBytes, randomUUID } from "node:crypto";
import type { TripGroupMember } from "./trip-group-identity";
import { MAX_CUSTOM_CHANNELS, TRIP_CHAT_CHANNELS, isDefaultChannel, type TripChatChannel, type TripChatChannelInfo } from "./trip-chat-channels";

export type TripGroupMessage = { id: string; memberId: string; name: string; text: string; at: string; channel?: TripChatChannel };

// Messages belong to a trip, never to an address book or a private inbox.
// A Redis list avoids lost messages when two travelers send at once.
async function command<T>(args: (string | number)[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Trip chat is unavailable.");
  const response = await fetch(url.replace(/\/$/, ""), {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args), cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Trip chat is unavailable.");
  const data = await response.json() as { result: T; error?: string };
  if (data.error) throw new Error("Trip chat is unavailable.");
  return data.result;
}
// Preserve the original General key so existing conversations need no migration.
function conversationKey(group: string, channel: TripChatChannel): string {
  return `white-glove:trip-group:${group}${channel === "general" ? "" : ":" + channel}`;
}
function messages(rows: string[], channel: TripChatChannel): TripGroupMessage[] {
  return rows.map(row => ({ ...JSON.parse(row) as TripGroupMessage, channel }));
}
export async function readTripGroup(group: string, channel: TripChatChannel = "general"): Promise<TripGroupMessage[]> {
  return messages(await command<string[]>(["LRANGE", conversationKey(group, channel), -500, -1]), channel);
}
/** A quiet conversation returns null without transferring the entire Redis list. */
export async function pollTripGroup(group: string, channel: TripChatChannel, after: string): Promise<TripGroupMessage[] | null> {
  const rows = await command<string[] | null>(["EVAL",
    "local last=redis.call('LINDEX',KEYS[1],-1); if last and cjson.decode(last).id==ARGV[1] then return false end; return redis.call('LRANGE',KEYS[1],-500,-1)",
    1, conversationKey(group, channel), after,
  ]);
  return rows === null ? null : messages(rows, channel);
}
export async function sendTripGroup(member: TripGroupMember, text: string, channel: TripChatChannel = "general"): Promise<TripGroupMessage[]> {
  const message: TripGroupMessage = { id: randomUUID(), memberId: member.id, name: member.name, text, at: new Date().toISOString(), channel };
  const rows = await command<string[]>(["EVAL",
    "redis.call('RPUSH',KEYS[1],ARGV[1]); redis.call('LTRIM',KEYS[1],-500,-1); return redis.call('LRANGE',KEYS[1],-500,-1)",
    1, conversationKey(member.group, channel), JSON.stringify(message),
  ]);
  return messages(rows, channel);
}

/* ---- channels a trip's travellers add themselves ---- */
// A hash of id → {label, createdBy, at}, beside the trip's conversations.
function channelsKey(group: string): string {
  return `white-glove:trip-group:${group}:channels`;
}
type StoredChannel = { label: string; createdBy: string; at: string };
function parseChannels(flat: string[] | null): TripChatChannelInfo[] {
  const list: (TripChatChannelInfo & { at: string })[] = [];
  for (let i = 0; flat && i + 1 < flat.length; i += 2) {
    try { const row = JSON.parse(flat[i + 1]) as StoredChannel; list.push({ id: flat[i], label: row.label, createdBy: row.createdBy, at: row.at }); } catch { /* skip a damaged row */ }
  }
  return list.sort((a, b) => a.at.localeCompare(b.at)).map(({ id, label, createdBy }) => ({ id, label, createdBy }));
}
export async function readTripChannels(group: string): Promise<TripChatChannelInfo[]> {
  const custom = parseChannels(await command<string[] | null>(["HGETALL", channelsKey(group)]));
  return [...TRIP_CHAT_CHANNELS.map(({ id, label }) => ({ id, label })), ...custom];
}
/** True for the four defaults; for anything else, only when this trip really has it. */
export async function tripHasChannel(group: string, channel: TripChatChannel): Promise<boolean> {
  if (isDefaultChannel(channel)) return true;
  return (await command<number>(["HEXISTS", channelsKey(group), channel])) === 1;
}
export async function createTripChannel(member: TripGroupMember, label: string): Promise<{ channels: TripChatChannelInfo[] } | { error: string }> {
  const existing = await readTripChannels(member.group);
  if (existing.some(channel => channel.label.toLowerCase() === label.toLowerCase())) return { error: "This trip already has a channel with that name." };
  const id = `c${randomBytes(5).toString("hex")}`;
  const row: StoredChannel = { label, createdBy: member.id, at: new Date().toISOString() };
  // The cap is checked inside Redis, so two people adding at once cannot pass it.
  const added = await command<number>(["EVAL",
    "if redis.call('HLEN',KEYS[1]) >= tonumber(ARGV[3]) then return 0 end; return redis.call('HSETNX',KEYS[1],ARGV[1],ARGV[2])",
    1, channelsKey(member.group), id, JSON.stringify(row), MAX_CUSTOM_CHANNELS,
  ]);
  if (added !== 1) return { error: `A trip can have up to ${MAX_CUSTOM_CHANNELS} channels of its own.` };
  return { channels: await readTripChannels(member.group) };
}
/** Only the traveller who added a channel removes it, and its messages go with it. */
export async function removeTripChannel(member: TripGroupMember, channel: string): Promise<{ channels: TripChatChannelInfo[] } | { error: string }> {
  if (isDefaultChannel(channel)) return { error: "The four standard channels stay on every trip." };
  const removed = await command<number>(["EVAL",
    "local row=redis.call('HGET',KEYS[1],ARGV[1]); if not row then return 0 end; if cjson.decode(row).createdBy~=ARGV[2] then return -1 end; redis.call('HDEL',KEYS[1],ARGV[1]); redis.call('DEL',KEYS[2]); return 1",
    2, channelsKey(member.group), conversationKey(member.group, channel), channel, member.id,
  ]);
  if (removed === -1) return { error: "Only the person who added this channel can remove it." };
  return { channels: await readTripChannels(member.group) };
}
