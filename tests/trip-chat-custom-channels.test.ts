import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MAX_CUSTOM_CHANNELS, TRIP_CHAT_CHANNELS, cleanChannelLabel, isCustomChannelId, isDefaultChannel, isTripChatChannel } from "@/lib/trip-chat-channels";

/**
 * Travellers add their own channels under a trip (owner, 19 November 2026),
 * beside the four every trip opens with.
 */
describe("channel ids off the wire", () => {
  it("keeps the four defaults", () => {
    assert.deepEqual(TRIP_CHAT_CHANNELS.map(c => c.id), ["general", "hotels", "flights", "plans"]);
    for (const c of TRIP_CHAT_CHANNELS) assert.ok(isTripChatChannel(c.id));
  });
  it("accepts only the custom shape, which can never collide with a default or the list key", () => {
    assert.ok(isCustomChannelId("c0123456789"));
    assert.ok(!isCustomChannelId("channels"));
    assert.ok(!isCustomChannelId("c012345678"));
    assert.ok(!isTripChatChannel("../general"));
    assert.ok(!isDefaultChannel("c0123456789"));
  });
  it("cleans a channel name to one short line", () => {
    assert.equal(cleanChannelLabel("  Day   trip\n to Bellagio "), "Day trip to Bellagio");
    assert.equal(cleanChannelLabel("   "), null);
    assert.equal(cleanChannelLabel("x".repeat(41)), null);
    assert.equal(cleanChannelLabel(5), null);
  });
});

describe("the store keeps the cap and the creator rule inside Redis", () => {
  const STORE = readFileSync("lib/trip-group-store.ts", "utf8");
  it("checks the cap atomically", () => {
    assert.match(STORE, /HLEN',KEYS\[1\]\) >= tonumber\(ARGV\[3\]\)/);
    assert.ok(MAX_CUSTOM_CHANNELS > 0);
  });
  it("lets only the creator remove a channel, and never a default", () => {
    assert.match(STORE, /createdBy~=ARGV\[2\]/);
    assert.match(STORE, /if \(isDefaultChannel\(channel\)\) return \{ error/);
  });
});

describe("the route", () => {
  const ROUTE = readFileSync("app/api/trip-group/route.ts", "utf8");
  it("refuses a message to a channel the trip does not have", () => {
    assert.match(ROUTE, /tripHasChannel\(group, channel\)/);
  });
  it("needs a joined member to add or remove a channel, and limits how often", () => {
    assert.ok(ROUTE.indexOf('if (!member) return reply({ needsName: true }, 401)') < ROUTE.indexOf("createTripChannel(member"));
    assert.match(ROUTE, /limit: writes \? 10/);
  });
});
