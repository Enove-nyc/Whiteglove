// Every trip's group chat opens with these four. Travellers on the trip may add
// their own beside them (owner, 19 November 2026: "make channels under each
// trip"); the four are never removed.
export const TRIP_CHAT_CHANNELS = [
  { id: "general", label: "General" },
  { id: "hotels", label: "Hotels & rooms" },
  { id: "flights", label: "Flights" },
  { id: "plans", label: "Trip plans" },
] as const;
export type DefaultTripChatChannel = typeof TRIP_CHAT_CHANNELS[number]["id"];
export type TripChatChannel = string;
export type TripChatChannelInfo = { id: string; label: string; createdBy?: string };

/** A trip may hold this many channels of its own, on top of the four. */
export const MAX_CUSTOM_CHANNELS = 12;
export const MAX_CHANNEL_LABEL = 40;
// A custom id is "c" and ten hex characters: it can never equal a default id,
// nor the ":channels" suffix the channel list itself is stored under.
const CUSTOM_ID = /^c[a-f0-9]{10}$/;

export function isDefaultChannel(value: unknown): value is DefaultTripChatChannel {
  return typeof value === "string" && TRIP_CHAT_CHANNELS.some(channel => channel.id === value);
}
export function isCustomChannelId(value: unknown): value is string {
  return typeof value === "string" && CUSTOM_ID.test(value);
}
/** The shape of a channel id off the wire — a default, or a well-formed custom id. */
export function isTripChatChannel(value: unknown): value is TripChatChannel {
  return isDefaultChannel(value) || isCustomChannelId(value);
}
/** One line of plain text, trimmed and collapsed; null when nothing usable is left. */
export function cleanChannelLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return label && label.length <= MAX_CHANNEL_LABEL ? label : null;
}
