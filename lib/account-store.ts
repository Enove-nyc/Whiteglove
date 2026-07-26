import { createHmac, pbkdf2Sync, randomBytes } from "crypto";
import type { SavedPlace } from "@/data/route-utils";
import { accountCookieName, createAccountSession, parseAccountSession } from "@/lib/account-session";

type RedisResult<T> = { result?: T };

export type AccountRecord = {
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  verifiedAt?: string;
  verificationCodeHash?: string;
  verificationCodeExpiresAt?: string;
  verificationRequestedAt?: string;
  resetCodeHash?: string;
  resetCodeExpiresAt?: string;
};

export type AccountData = {
  route: SavedPlace[];
  favorites: SavedPlace[];
  updatedAt?: string;
};

export type AccountSummary = {
  email: string;
  routeCount: number;
  favoriteCount: number;
  createdAt?: string;
  verifiedAt?: string;
};

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(command: string) {
  const config = redisConfig();
  if (!config) return undefined;
  try {
    const response = await fetch(`${config.url}/${command}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    return (await response.json()) as RedisResult<T>;
  } catch {
    return undefined;
  }
}

function accountKey(email: string) {
  return `white-glove:account:${email}`;
}

function dataKey(email: string) {
  return `white-glove:account-data:${email}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120000, 64, "sha256").toString("hex");
}

function verificationSecret() {
  return process.env.WHITE_GLOVE_SESSION_SECRET || process.env.ADMIN_PASSWORD || "white-glove-development-secre