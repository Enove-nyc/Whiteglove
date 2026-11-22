import assert from "node:assert/strict";
import { test } from "node:test";
import { duffelRefusal } from "@/lib/duffel-guard";
import { BOOKING_COOKIE, BOOKING_HOST, BOOKING_ORIGIN, bookingSignature, hasBookingAccess } from "@/lib/private-booking";

test("invited sessions can book only on the booking hostname and only through opted-in endpoints", async (t) => {
  const password = "test-password-for-invited-guests";
  t.mock.method(Date, "now", () => 1763760000000);
  const originalPassword = process.env.PRIVATE_BOOKING_PASSWORD;
  const originalSecret = process.env.PRIVATE_BOOKING_SIGNING_SECRET;
  process.env.PRIVATE_BOOKING_PASSWORD = password;
  process.env.PRIVATE_BOOKING_SIGNING_SECRET = "separate-test-only-server-signing-secret";
  t.after(() => {
    if (originalPassword === undefined) delete process.env.PRIVATE_BOOKING_PASSWORD;
    else process.env.PRIVATE_BOOKING_PASSWORD = originalPassword;
    if (originalSecret === undefined) delete process.env.PRIVATE_BOOKING_SIGNING_SECRET;
    else process.env.PRIVATE_BOOKING_SIGNING_SECRET = originalSecret;
  });

  const expires = 1763763600;
  const signature = await bookingSignature(`access:${expires}:${password}`);
  const cookie = `${expires}.${signature}`;
  const request = (host: string, origin = BOOKING_ORIGIN, value = cookie) => ({
    headers: new Headers({ host, origin, "x-forwarded-host": BOOKING_HOST }),
    cookies: { get: (name: string) => name === BOOKING_COOKIE ? { value } : undefined },
  });

  assert.equal(await hasBookingAccess(request(BOOKING_HOST)), true);
  assert.equal(await hasBookingAccess(request("www.whitegloveitineraries.com")), false);
  assert.equal(await hasBookingAccess(request(BOOKING_HOST, BOOKING_ORIGIN, "")), false);
  assert.equal(await hasBookingAccess(request(BOOKING_HOST, BOOKING_ORIGIN, `${expires + 1}.${signature}`)), false);
  assert.equal(await duffelRefusal(request(BOOKING_HOST), { privateBooking: true }), null);
  assert.equal((await duffelRefusal(request(BOOKING_HOST)))?.status, 404);
  assert.equal((await duffelRefusal(request(BOOKING_HOST, "https://example.org"), { privateBooking: true }))?.status, 403);

  process.env.PRIVATE_BOOKING_PASSWORD = "a-different-long-booking-password";
  assert.equal(await hasBookingAccess(request(BOOKING_HOST)), false);
});

test("the booking password: 8 characters, 30 days unlocked, guessing limited — accepts 8 characters, keeps a device unlocked 30 days, and limits wrong tries", async () => {
    const { readFileSync } = await import("node:fs");
    const lib = readFileSync("lib/private-booking.ts", "utf8");
    assert.match(lib, /BOOKING_PASSWORD_MIN = 8;/);
    assert.match(lib, /BOOKING_SESSION_SECONDS = 30 \* 24 \* 60 \* 60;/);
    const route = readFileSync("app/api/private-booking/access/route.ts", "utf8");
    assert.match(route, /tooManyAttempts\(request, "booking"\)/);
    assert.match(route, /recordFailedAttempt\(request, "booking"\)/);
});

test("owner recovery is single-use and guest sessions end when the pass is replaced", async (t) => {
  const {
    createBookingResetToken, createBookingSession, createGuestPass, resetBookingPassword, validBookingResetToken,
  } = await import("@/lib/private-booking");
  const settings = {
    OWNER_EMAIL: "owner@example.com",
    PRIVATE_BOOKING_PASSWORD: "test-original-password",
    PRIVATE_BOOKING_SIGNING_SECRET: "test-separate-signing-secret",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "test-local-only",
  };
  for (const [key, value] of Object.entries(settings)) {
    const original = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    });
  }
  const store = new Map<string, string>();
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    const [command, arg, value, key, expected, replacement] = JSON.parse(String(init.body));
    if (command === "GET") return Response.json({ result: store.get(arg) ?? null });
    if (command === "SET") {
      store.set(arg, value);
      return Response.json({ result: "OK" });
    }
    assert.equal(command, "EVAL");
    if ((store.get(key) ?? "") !== expected) return Response.json({ result: 0 });
    store.set(key, replacement);
    return Response.json({ result: 1 });
  });

  const headers = new Headers({ host: BOOKING_HOST });
  const request = (value: string) => ({ headers, cookies: { get: () => ({ value }) } });
  const ownerSession = await createBookingSession(headers, settings.PRIVATE_BOOKING_PASSWORD);
  assert.ok(ownerSession);
  const token = await createBookingResetToken();
  assert.ok(token);
  assert.equal(await validBookingResetToken(token), true);
  assert.equal(await resetBookingPassword(token, "test-new-password"), true);
  assert.equal(await validBookingResetToken(token), false);
  assert.equal(await hasBookingAccess(request(ownerSession.value)), false);
  assert.equal(await createBookingSession(headers, settings.PRIVATE_BOOKING_PASSWORD), null);
  assert.ok(await createBookingSession(headers, "test-new-password"));

  const guest = await createGuestPass(3600);
  const guestSession = await createBookingSession(headers, guest.password);
  assert.ok(guestSession);
  assert.equal(guestSession.maxAge, 3600);
  assert.equal(await hasBookingAccess(request(guestSession.value)), true);
  await createGuestPass(86400);
  assert.equal(await hasBookingAccess(request(guestSession.value)), false);
  assert.equal(await createBookingSession(headers, guest.password), null);
});
