import { createHmac, timingSafeEqual } from "crypto";

const cookieName = "white_glove_account";

function secret() {
  return process.env.WHITE_GLOVE_SESSION_SECRET || process.env.ADMIN_PASSWORD || "white-glove-development-secret";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createAccountSession(email: string) {
  const normalized = normalizeEmail(email);
  const signature = createHmac("sha256", secret()).update(normalized).digest("base64url");
  return `${encodeURIComponent(normalized)}.${signature}`;
}

export function parseAccountSession(value?: string) {
  if (!value) return null;
  // Split on the LAST "." — the signature is base64url (no dots), but the
  // encoded email keeps its dots (e.g. "gmail.com"), so splitting on the first
  // "." would slice the email apart and never validate.
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const encodedEmail = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!encodedEmail || !signature) return null;
  const email = decodeURIComponent(encodedEmail);
  const expected = createHmac("sha256", secret()).update(normalizeEmail(email)).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return normalizeEmail(email);
}

export function accountCookieName() {
  return cookieName;
}
