import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { cleanFileName, sniffWalletType, walletAvailable } from "@/lib/account-wallet-store";

/**
 * Wallet files are also saved to the traveller's account (owner, 19 November
 * 2026), privately, so they reach another phone.
 */
describe("what goes into the account wallet", () => {
  it("decides the type from the file's own bytes", () => {
    assert.equal(sniffWalletType(new Uint8Array([37, 80, 68, 70, 45, 49])), "application/pdf");
    assert.equal(sniffWalletType(new Uint8Array([255, 216, 255, 224])), "image/jpeg");
    assert.equal(sniffWalletType(new Uint8Array([77, 90, 144, 0])), null);
  });
  it("cleans a file name and never lets it become a path", () => {
    assert.equal(cleanFileName("../../etc/pass\nwd.pdf"), ".. .. etc pass wd.pdf");
    assert.equal(cleanFileName("   "), "Travel document");
  });
  it("is off away from Cloudflare R2, so the wallet stays device-only and says so", () => {
    const before = process.env.MEDIA_STORE;
    delete process.env.MEDIA_STORE;
    assert.equal(walletAvailable(), false);
    if (before !== undefined) process.env.MEDIA_STORE = before;
  });
});

describe("only the signed-in account reaches its files", () => {
  const ROUTE = readFileSync("app/api/account/wallet/route.ts", "utf8");
  const STORE = readFileSync("lib/account-wallet-store.ts", "utf8");
  it("reads the account from the session cookie on every verb", () => {
    assert.equal((ROUTE.match(/await signedInEmail\(\)/g) ?? []).length, 3);
    assert.doesNotMatch(ROUTE, /searchParams\.get\("email"\)/);
  });
  it("keys every file under the account, never under the trip code alone", () => {
    assert.match(STORE, /wallet\/\$\{createHash\("sha256"\)\.update\(email/);
  });
  it("guards writes: same origin, rate limit, size and file type", () => {
    const POST = ROUTE.slice(ROUTE.indexOf("export async function POST"), ROUTE.indexOf("export async function DELETE"));
    assert.match(POST, /sameOrigin\(request\)/);
    assert.match(POST, /rateLimit\(`wallet-upload:/);
    assert.match(POST, /MAX_WALLET_FILE_BYTES/);
    assert.match(POST, /sniffWalletType/);
  });
});

describe("the wallet screen", () => {
  const UI = readFileSync("components/companion/PersonalTravelWallet.tsx", "utf8");
  it("does not promise sync unless the account copy is really on", () => {
    assert.match(UI, /mode === "account"\s*\? "Boarding passes, hotel confirmations and entry tickets\. Files are kept on this device/);
  });
  it("treats a synced file that has left the account as removed elsewhere", () => {
    assert.match(UI, /document\.synced && !onAccount\.has\(document\.id\)/);
  });
  it("leaves the samples device-only", () => {
    assert.match(UI, /if \(sample\) return;/);
  });
});
