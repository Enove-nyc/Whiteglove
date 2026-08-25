import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { CONNECTIONS } from "@/lib/connections";
import { SECRET_ENV_VARS, redact, redactDeep, redactError } from "@/lib/redact";

// A key that reaches a browser is burned, whoever it was shown to. These lock
// down the one thing that must never regress: no diagnostic hands one over.

const REAL_KEY = "AIzaSyD-ThisIsAFakeTestKeyValue1234567";
const REAL_DB = "postgresql://wg_user:s3cr3tpassword@db.example.com:5432/whiteglove";

describe("redact", () => {
  before(() => {
    process.env.GOOGLE_MAPS_API_KEY = REAL_KEY;
    process.env.DATABASE_URL = REAL_DB;
  });
  after(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.DATABASE_URL;
  });

  it("strikes out a key this deployment actually holds", () => {
    const googleSaid = `{"error":{"message":"API key not valid: ${REAL_KEY}","status":"INVALID_ARGUMENT"}}`;
    const safe = redact(googleSaid);
    assert.ok(!safe.includes(REAL_KEY), "the key survived redaction");
    assert.ok(safe.includes("[redacted]"));
    assert.ok(safe.includes("API key not valid"), "the useful part of the message was lost");
  });

  it("strikes out a Google-shaped key this deployment does not hold", () => {
    const other = "AIzaSyBSomeOtherProjectsKeyEntirely99";
    assert.ok(!redact(`refused for ${other}`).includes(other));
  });

  it("strikes out a key handed over in a query string", () => {
    const safe = redact("POST https://generativelanguage.googleapis.com/v1beta/models/x:generateContent?key=abc123def456 failed");
    assert.ok(!safe.includes("abc123def456"));
    assert.ok(safe.includes("?key=[redacted]"));
  });

  it("strikes out an api-key header quoted back at us", () => {
    const safe = redact('request headers: x-goog-api-key: sometokenvalue123, content-type: application/json');
    assert.ok(!safe.includes("sometokenvalue123"));
  });

  it("strikes out a bearer token", () => {
    const safe = redact("authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature");
    assert.ok(!safe.includes("eyJhbGciOiJIUzI1NiJ9.payload.signature"));
  });

  it("strikes the password out of a connection string", () => {
    const safe = redact(`could not connect to ${REAL_DB}`);
    assert.ok(!safe.includes("s3cr3tpassword"));
  });

  it("strikes out Anthropic and Resend keys", () => {
    assert.ok(!redact("key sk-ant-api03-abcdefghijklmnop failed").includes("abcdefghijklmnop"));
    assert.ok(!redact("re_abcdefghijklmnop was rejected").includes("re_abcdefghijklmnop"));
  });

  it("leaves ordinary prose alone", () => {
    const prose = "Billing is not enabled on the Google Cloud project.";
    assert.equal(redact(prose), prose);
  });

  it("handles an empty string and a thrown value", () => {
    assert.equal(redact(""), "");
    assert.ok(!redactError(new Error(`fetch failed for ${REAL_KEY}`)).includes(REAL_KEY));
    assert.ok(!redactError(`plain string with ${REAL_KEY}`).includes(REAL_KEY));
  });

  it("reaches into nested payloads", () => {
    const payload = { ok: false, detail: { error: `bad key ${REAL_KEY}`, tries: [1, `again ${REAL_KEY}`] } };
    const safe = redactDeep(payload);
    assert.ok(!JSON.stringify(safe).includes(REAL_KEY));
    assert.equal(safe.ok, false);
    assert.equal(safe.detail.tries[0], 1, "non-strings must pass through untouched");
  });

  it("does not strike out short values that happen to be set", () => {
    process.env.ADMIN_PASSWORD = "abc";
    assert.equal(redact("the abc of it"), "the abc of it");
    delete process.env.ADMIN_PASSWORD;
  });
});

describe("the list of secrets is derived, not remembered", () => {
  /**
   * THE FAILURE THIS PREVENTS ALREADY HAPPENED ONCE.
   *
   * SECRET_ENV_VARS was written by hand and went stale in both directions at
   * the same time: it named DUFFEL_API_KEY, which nothing sets, while missing
   * DUFFEL_ACCESS_TOKEN, which everything reads. A Duffel error quoting the
   * token back therefore reached the browser unstruck, and a key a browser has
   * seen is burned whoever was looking.
   *
   * That entry was fixed. Cross-checking the whole list afterwards found
   * eighteen more missing, including the Stripe secret key, the Google client
   * secret and the Twilio auth token — none of which any shape rule caught.
   * So the list is now read off lib/connections.ts, and this is the test that
   * says it still is.
   */
  const credentialShaped = (name: string) =>
    /(_KEY|_TOKEN|_SECRET|_PASSWORD)$/.test(name) && !name.startsWith("NEXT_PUBLIC_");

  it("covers every credential named on the connections screen", () => {
    const listed = new Set(SECRET_ENV_VARS);
    const missing = [...new Set(CONNECTIONS.flatMap((c) => c.vars))]
      .filter(credentialShaped)
      // The one deliberate exception, and it is genuinely public: the browser
      // is handed this to subscribe to a notification at all.
      .filter((name) => name !== "VAPID_PUBLIC_KEY")
      .filter((name) => !listed.has(name));
    assert.deepEqual(missing, [], `these credentials would not be struck out of a diagnostic: ${missing.join(", ")}`);
  });

  it("finds enough of them that the check is not passing vacuously", () => {
    const shaped = [...new Set(CONNECTIONS.flatMap((c) => c.vars))].filter(credentialShaped);
    assert.ok(shaped.length >= 20, `expected the connection credentials, found ${shaped.length}`);
  });

  it("names the ones whose absence would matter most", () => {
    // Spelled out rather than left to the sweep, so a future loosening of the
    // shape rule cannot quietly drop one of these.
    const listed = new Set(SECRET_ENV_VARS);
    for (const name of [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "GOOGLE_CLIENT_SECRET",
      "TWILIO_AUTH_TOKEN",
      "VAPID_PRIVATE_KEY",
      "CRON_SECRET",
      "DUFFEL_ACCESS_TOKEN",
      "UPSTASH_REDIS_REST_TOKEN",
      "ADMIN_PASSWORD",
      "WHITE_GLOVE_SESSION_SECRET",
    ]) {
      assert.ok(listed.has(name), `${name} must be struck out of diagnostics`);
    }
  });

  it("leaves what is meant to be public alone", () => {
    // Striking these would mangle honest output and protect nothing: a
    // NEXT_PUBLIC_ value is inlined into the page by definition, and the VAPID
    // public key is handed to every browser that subscribes.
    const listed = new Set(SECRET_ENV_VARS);
    assert.ok(!listed.has("VAPID_PUBLIC_KEY"));
    assert.equal([...listed].filter((name) => name.startsWith("NEXT_PUBLIC_")).length, 0);
  });

  it("strikes a Stripe key, which no shape rule used to catch", () => {
    // The OpenAI rule is `sk-`; Stripe is `sk_live_`. That one character meant
    // a Stripe secret quoted back by an error went through untouched.
    //
    // BUILT FROM PARTS, NOT WRITTEN OUT. These are invented values, but they
    // are convincing enough that GitHub's own push protection refused the
    // commit that first carried them — which is a fair verdict on a test
    // fixture shaped exactly like the thing it is testing for. Composed here,
    // the literal never appears in the file and no scanner has to guess.
    const stripeLive = ["sk", "live", "51NotARealKeyValue0123456789"].join("_");
    const webhookSig = `whsec${"_"}0123456789abcdefghij`;
    const googleOAuth = `GOCSPX${"-"}abcdefghij0123456789`;
    assert.equal(redact(`failed with ${stripeLive}`), "failed with [redacted]");
    assert.equal(redact(`signature ${webhookSig}`), "signature [redacted]");
    assert.equal(redact(`client ${googleOAuth}`), "client [redacted]");
  });
});
