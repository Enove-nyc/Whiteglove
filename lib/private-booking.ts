import { BOOKING_GUEST_KEY, BOOKING_PASSWORD_KEY, bookingStorage, bookingStorageConfigured } from "./private-booking-storage";

export const BOOKING_HOST = "book.whitegloveitineraries.com";
export const BOOKING_ORIGIN = `https://${BOOKING_HOST}`;
export const BOOKING_COOKIE = "__Host-wg-booking";
// Unlocked for 30 days on a device, so the owner is not typing the password
// every visit (owner, 22 November 2026). Changing the password in Cloudflare
// signs every device out, because the cookie is signed over the password.
export const BOOKING_SESSION_SECONDS = 30 * 24 * 60 * 60;
/** Shortest password the gate accepts. Guessing is limited to 8 tries per 15 minutes. */
export const BOOKING_PASSWORD_MIN = 8;

type HeadersLike = { get(name: string): string | null };
type BookingRequest = {
  headers: HeadersLike;
  cookies: { get(name: string): { value: string } | undefined };
};

export function getBookingOrigin(headers: HeadersLike) {
  const host = headers.get("host")?.toLowerCase();
  const previewHost = process.env.PRIVATE_BOOKING_PREVIEW_HOST?.toLowerCase();
  if (host === BOOKING_HOST) return BOOKING_ORIGIN;
  if (host && host === previewHost && /^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(host)) {
    return `https://${host}`;
  }
  return null;
}

export function isBookingHost(headers: HeadersLike) {
  return getBookingOrigin(headers) !== null;
}

export function bookingPreviewCanSearch(headers: HeadersLike) {
  return getBookingOrigin(headers) === BOOKING_ORIGIN ||
    process.env.DUFFEL_ACCESS_TOKEN?.trim().startsWith("duffel_test_") === true;
}

export function bookingPassword() {
  const password = process.env.PRIVATE_BOOKING_PASSWORD;
  return password && password.length >= BOOKING_PASSWORD_MIN && signingSecret() ? password : null;
}

function signingSecret() {
  const secret = process.env.PRIVATE_BOOKING_SIGNING_SECRET || process.env.WHITE_GLOVE_SESSION_SECRET;
  return secret && secret.length >= 24 && secret !== process.env.PRIVATE_BOOKING_PASSWORD ? secret : null;
}

export async function bookingSignature(value: string) {
  const password = signingSecret();
  if (!password) return null;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function equalBookingValue(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let differences = a.length ^ b.length;
  for (let index = 0; index < b.length; index++) differences |= (a[index] ?? 0) ^ b[index];
  return differences === 0;
}

export const BOOKING_GUEST_DURATIONS = [3600, 86400, 604800] as const;
export const BOOKING_RESET_SECONDS = 1800;
export const BOOKING_RESET_COOKIE = "__Host-wg-booking-reset";

export function bookingOwnerEmail() {
  return process.env.OWNER_EMAIL?.trim().toLowerCase() || "";
}

export function bookingRecoveryAvailable() {
  return Boolean(bookingOwnerEmail() && signingSecret() && bookingStorageConfigured());
}

async function storedPassword() {
  return bookingStorageConfigured() ? bookingStorage<string | null>("GET", BOOKING_PASSWORD_KEY) : null;
}

export async function bookingLoginAvailable(headers: HeadersLike) {
  if (!signingSecret()) return false;
  if (bookingPassword()) return true;
  if (getBookingOrigin(headers) !== BOOKING_ORIGIN || !bookingStorageConfigured()) return false;
  try {
    return Boolean(await storedPassword() || await bookingStorage<string | null>("GET", BOOKING_GUEST_KEY));
  } catch {
    return false;
  }
}

async function passwordDigest(password: string, salt: string) {
  return bookingSignature(`password:${salt}:${password}`);
}

export async function createBookingSession(headers: HeadersLike, password: string) {
  if (password.length > 128) return null;
  const now = Math.floor(Date.now() / 1000);
  const production = getBookingOrigin(headers) === BOOKING_ORIGIN;
  const stored = production ? await storedPassword() : null;
  const configured = bookingPassword();
  const [salt, verifier] = stored?.split(".") ?? ["", ""];
  const digest = stored ? await passwordDigest(password, salt) : null;
  const ownerMatches = stored ? Boolean(digest && equalBookingValue(digest, verifier)) :
    Boolean(configured && equalBookingValue(password, configured));
  if (ownerMatches) {
    const expires = now + BOOKING_SESSION_SECONDS;
    const signature = await bookingSignature(`access:${expires}:${stored ?? configured}`);
    return signature ? { value: `${expires}.${signature}`, maxAge: BOOKING_SESSION_SECONDS } : null;
  }
  if (!production || !bookingStorageConfigured()) return null;
  const guest = await bookingStorage<string | null>("GET", BOOKING_GUEST_KEY);
  if (!guest) return null;
  const [expires, guestVerifier] = guest.split(".");
  const guestDigest = await bookingSignature(`guest-password:${password}`);
  const maxAge = Number(expires) - now;
  if (maxAge <= 0 || !guestDigest || !equalBookingValue(guestDigest, guestVerifier)) return null;
  const signature = await bookingSignature(`guest-access:${guest}`);
  return signature ? { value: `g.${expires}.${signature}`, maxAge } : null;
}

export async function hasBookingAccess(request: BookingRequest) {
  const origin = getBookingOrigin(request.headers);
  if (!origin || !signingSecret()) return false;
  const cookie = request.cookies.get(BOOKING_COOKIE)?.value ?? "";
  const match = /^(g\.)?(\d{10})\.([a-f0-9]{64})$/.exec(cookie);
  if (!match || Number(match[2]) <= Date.now() / 1000) return false;
  const [, guestSession, expires, supplied] = match;
  try {
    let signature: string | null;
    if (guestSession) {
      if (origin !== BOOKING_ORIGIN) return false;
      const guest = await bookingStorage<string | null>("GET", BOOKING_GUEST_KEY);
      if (!guest?.startsWith(expires + ".")) return false;
      signature = await bookingSignature(`guest-access:${guest}`);
    } else {
      const password = (origin === BOOKING_ORIGIN ? await storedPassword() : null) ?? bookingPassword();
      if (!password) return false;
      signature = await bookingSignature(`access:${expires}:${password}`);
    }
    return signature !== null && equalBookingValue(supplied, signature);
  } catch {
    return false;
  }
}

export async function createGuestPass(duration: number) {
  const password = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[byte & 31]).join("");
  const verifier = await bookingSignature(`guest-password:${password}`);
  if (!verifier) throw new Error("Booking is unavailable.");
  const expires = Math.floor(Date.now() / 1000) + duration;
  await bookingStorage("SET", BOOKING_GUEST_KEY, `${expires}.${verifier}`, "EX", duration);
  return { password, expires };
}

export async function createBookingResetToken() {
  const stored = await storedPassword();
  const expires = Math.floor(Date.now() / 1000) + BOOKING_RESET_SECONDS;
  const nonce = crypto.randomUUID();
  const signature = await bookingSignature(`reset:${expires}:${nonce}:${stored ?? bookingPassword()}`);
  return signature ? `${expires}.${nonce}.${signature}` : null;
}

async function resetState(token: string) {
  const match = /^(\d{10})\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token);
  if (!match || Number(match[1]) <= Date.now() / 1000 || !bookingRecoveryAvailable()) return null;
  const [, expires, nonce, supplied] = match;
  const stored = await storedPassword();
  const expected = await bookingSignature(`reset:${expires}:${nonce}:${stored ?? bookingPassword()}`);
  return expected && equalBookingValue(supplied, expected) ? { stored } : null;
}

export async function validBookingResetToken(token: string) {
  return Boolean(await resetState(token));
}

export async function resetBookingPassword(token: string, password: string) {
  const state = await resetState(token);
  const salt = crypto.randomUUID();
  const digest = await passwordDigest(password, salt);
  if (!state || !digest ||
      equalBookingValue(password, signingSecret() ?? "")) return false;
  // A concurrent request can redeem a link only before another reset changes
  // the verifier it was issued for. The compare and update are one operation.
  return await bookingStorage<number>("EVAL",
    "if (redis.call('GET', KEYS[1]) or '') ~= ARGV[1] then return 0 end redis.call('SET', KEYS[1], ARGV[2]) return 1",
    1, BOOKING_PASSWORD_KEY, state.stored ?? "", `${salt}.${digest}`,
  ) === 1;
}
