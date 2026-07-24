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
  const [encodedEmail, signature] = value.split(".");
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
