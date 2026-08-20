import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseChatMessages } from "@/lib/companion-chat-store";

/**
 * The concierge thread: text, a picture, a video, a voice note, or a place —
 * and a way to report one.
 *
 * TWO THINGS THIS PINS. First, the back-compatibility that a stored thread is
 * fragile about: every message written before pictures existed has no `kind`,
 * and must still read as text so an old conversation does not vanish. Second,
 * the fences around the messages a client with no account can push real bytes
 * with — a picture, a video, a voice note — which are checked in the route
 * source, the same way business-trips.test.ts checks its gates, because the
 * property is that the checks are PRESENT and come before the work.
 */

describe("reading a stored thread", () => {
  it("reads an old text-only row that has no kind", () => {
    const [m] = parseChatMessages([JSON.stringify({ from: "client", text: "hello", at: "2026-01-01T00:00:00Z" })]);
    assert.equal(m.kind, "text");
    assert.equal(m.text, "hello");
  });

  it("reads a picture, a video, a voice note and a place", () => {
    const rows = [
      JSON.stringify({ from: "advisor", kind: "image", text: "the square", mediaId: "m-1-a", at: "t1" }),
      JSON.stringify({ from: "advisor", kind: "video", text: "the walk over", mediaId: "m-1-b", at: "t1b" }),
      JSON.stringify({ from: "client", kind: "audio", text: "", mediaId: "m-1-c", at: "t1c" }),
      JSON.stringify({ from: "client", kind: "location", text: "I'm here", lat: 41.9, lng: 12.5, at: "t2" }),
    ];
    const out = parseChatMessages(rows);
    assert.equal(out[0].kind, "image");
    assert.equal(out[0].mediaId, "m-1-a");
    assert.equal(out[1].kind, "video");
    assert.equal(out[1].mediaId, "m-1-b");
    assert.equal(out[2].kind, "audio");
    assert.equal(out[2].mediaId, "m-1-c");
    assert.equal(out[3].kind, "location");
    assert.equal(out[3].lat, 41.9);
  });

  it("drops a broken picture, video, voice note or place rather than showing an empty bubble", () => {
    const rows = [
      JSON.stringify({ from: "advisor", kind: "image", text: "", at: "t1" }), // no mediaId
      JSON.stringify({ from: "advisor", kind: "video", text: "", at: "t1b" }), // no mediaId
      JSON.stringify({ from: "client", kind: "audio", text: "", at: "t1c" }), // no mediaId
      JSON.stringify({ from: "client", kind: "location", text: "", at: "t2" }), // no coordinates
      JSON.stringify({ from: "client", kind: "text", text: "still here", at: "t3" }),
    ];
    const out = parseChatMessages(rows);
    assert.equal(out.length, 1);
    assert.equal(out[0].text, "still here");
  });

  it("skips a corrupt row without dropping the rest of the thread", () => {
    const out = parseChatMessages(["not json", JSON.stringify({ from: "client", text: "ok", at: "t" })]);
    assert.equal(out.length, 1);
  });

  it("refuses a row from neither side", () => {
    assert.equal(parseChatMessages([JSON.stringify({ from: "someone", text: "x", at: "t" })]).length, 0);
  });
});

describe("sending a picture, video or voice note is fenced", () => {
  const ROUTE = readFileSync("app/api/companion/chat/route.ts", "utf8");
  const mediaBranch = ROUTE.slice(ROUTE.indexOf("body.dataUrl"), ROUTE.indexOf("A place"));

  it("comes only from this site, checked before anything is read", () => {
    const body = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(body, /sameOrigin/);
    assert.ok(body.indexOf("sameOrigin") < body.indexOf("sideFor"), "same-origin is the first gate");
  });

  it("is rate limited before it stores anything, with its own counter per kind", () => {
    assert.match(mediaBranch, /rateLimit\(`companion-\$\{media\.kind\}:/);
    assert.ok(mediaBranch.indexOf("rateLimit") < mediaBranch.indexOf("putMedia"), "the limit must be counted before the write");
  });

  it("checks the type and the size before it stores anything", () => {
    assert.match(mediaBranch, /mediaKindFor\(contentType\)/);
    assert.match(mediaBranch, /media\.available\(\)/);
    assert.ok(mediaBranch.indexOf("mediaKindFor") < mediaBranch.indexOf("putMedia"));
    assert.ok(mediaBranch.indexOf("media.limit") < mediaBranch.indexOf("putMedia"));
  });

  it("only accepts photograph, clip and voice-note types, not every media type the store takes", () => {
    // The media store also accepts PDFs and GIFs; chat is a photo, a clip or a
    // recorded voice note, nothing else.
    assert.match(ROUTE, /CHAT_IMAGE_TYPES = new Set\(\["image\/jpeg", "image\/png", "image\/webp"\]\)/);
    assert.match(ROUTE, /CHAT_VIDEO_TYPES = new Set\(\["video\/mp4", "video\/quicktime", "video\/webm"\]\)/);
    assert.match(ROUTE, /CHAT_AUDIO_TYPES = new Set\(\["audio\/webm", "audio\/mp4", "audio\/mpeg", "audio\/ogg"\]\)/);
  });

  it("gives video and audio their own ceiling — the disk-only limits, not the image one", () => {
    assert.match(ROUTE, /video.*limit: MAX_CHAT_VIDEO_BYTES.*available: videoUploadsAvailable/);
    assert.match(ROUTE, /audio.*limit: MAX_CHAT_AUDIO_BYTES.*available: audioUploadsAvailable/);
  });

  it("validates a shared location's coordinates", () => {
    assert.match(ROUTE, /Math\.abs\(body\.lat\) > 90/);
    assert.match(ROUTE, /Math\.abs\(body\.lng\) > 180/);
  });
});

describe("the thread is Business-only, like the app it belongs to", () => {
  // The client app page and the inbox are gated on mayServeCompanionClients;
  // the chat and report routes are the write path behind them and must carry
  // the SAME gate, or a share link from any plan becomes a way to push chat
  // and hosted images the product otherwise withholds.
  it("gates the chat route on the owner's plan, before a side is read", () => {
    const ROUTE = readFileSync("app/api/companion/chat/route.ts", "utf8");
    const sideFor = ROUTE.slice(ROUTE.indexOf("async function sideFor"), ROUTE.indexOf("export async function GET"));
    assert.match(sideFor, /mayServeCompanionClients\(await getPlan\(owner\)\)/);
    assert.ok(sideFor.indexOf("mayServeCompanionClients") < sideFor.indexOf("accountCookieName"), "the plan is checked before the side is worked out");
  });

  it("gates the report route on the owner's plan too", () => {
    const ROUTE = readFileSync("app/api/companion/report/route.ts", "utf8");
    const body = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(body, /mayServeCompanionClients\(await getPlan\(owner\)\)/);
    assert.ok(body.indexOf("mayServeCompanionClients") < body.indexOf("appendReport"), "gate before recording");
  });
});

describe("reporting a message is fenced", () => {
  const ROUTE = readFileSync("app/api/companion/report/route.ts", "utf8");

  it("comes only from this site, is rate limited, and records the report", () => {
    const body = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(body, /sameOrigin/);
    assert.match(body, /rateLimit\(`companion-report:/);
    assert.match(body, /appendReport/);
    assert.ok(body.indexOf("rateLimit") < body.indexOf("appendReport"), "count the limit before recording");
  });

  it("reads who is reporting from the link, never from the request body", () => {
    // The side is derived from the share owner + session, the same as the chat
    // route — a client cannot claim to be the advisor.
    assert.match(ROUTE, /getShareOwnerEmail/);
    assert.match(ROUTE, /identityKey\(account\.email\) === identityKey\(owner\)/);
  });
});
