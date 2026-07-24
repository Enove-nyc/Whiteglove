import { createHmac, timingSafeEqual } from "crypto";

type AccessScope = "admin" | "site";

function secret() {
  return process.env.WHITE_GLOVE_SESSION_SECRET || process.env.ADMIN_PASSWORD || "white-glove-development-secret";
}

export function accessToken(scope: AccessScope) {
  return createHmac("sha256", secret()).update(`white-glove:${scope}`).digest("base64url");
}

export function isValidAccessToken(scope: AccessScope, value?: string) {
  if (!value) return false;
  const expected = accessToken(scope);
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function isCorrectPassword(scope: AccessScope, password: string) {
  const configured = scope === "admin" ? process.env.ADMIN_PASSWORD : process.env.SITE_ACCESS_PASSWORD;
  return Boolean(configured && password && password === configured);
}
