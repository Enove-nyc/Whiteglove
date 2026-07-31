import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { passwordProblem, MIN_PASSWORD_LENGTH } from "@/lib/password-rules";

// A six-digit code is a million combinations, which sounds like a lot until
// you notice a script making a hundred guesses a second walks it in under
// three hours. With no limit, a six-digit code is a formality. These are the
// tests that say the limit is real.

const saved = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
afterEach(() => {
  if (saved.url === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = saved.url;
  if (saved.token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = saved.token;
});

let counter = 0;
const freshKey = () => `test-${process.pid}-${counter++}`;

describe("the attempt limit", () => {
  it("allows exactly the number it says, then stops", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const key = freshKey();
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await rateLimit(key, { limit: 3, windowSeconds: 60 });
      assert.equal(result.ok, true, `attempt ${attempt} should be allowed`);
      assert.equal(result.remaining, 3 - attempt);
    }
    const blocked = await rateLimit(key, { limit: 3, windowSeconds: 60 });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfter > 0, "a refusal has to say how long");
  });

  it("keeps counting once blocked, rather than letting the next one through", async () => {
    const key = freshKey();
    await rateLimit(key, { limit: 1, windowSeconds: 60 });
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await rateLimit(key, { limit: 1, windowSeconds: 60 })).ok, false);
    }
  });

  it("counts each key on its own", async () => {
    const a = freshKey();
    const b = freshKey();
    await rateLimit(a, { limit: 1, windowSeconds: 60 });
    assert.equal((await rateLimit(a, { limit: 1, windowSeconds: 60 })).ok, false);
    assert.equal((await rateLimit(b, { limit: 1, windowSeconds: 60 })).ok, true, "one person's limit is not everybody's");
  });

  it("lets them back in when the window has passed", async () => {
    const key = freshKey();
    // A window of zero seconds is already over by the next call.
    await rateLimit(key, { limit: 1, windowSeconds: 0 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal((await rateLimit(key, { limit: 1, windowSeconds: 0 })).ok, true);
  });

  it("does not lock everybody out when the cache is unreachable", async () => {
    // Fails open past the in-process counter, deliberately: a limiter that
    // locks people out of their own accounts because a cache is down has done
    // more damage than the attack it guards against.
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:1";
    process.env.UPSTASH_REDIS_REST_TOKEN = "nope";
    const result = await rateLimit(freshKey(), { limit: 5, windowSeconds: 60 });
    assert.equal(result.ok, true);
  });
});

describe("who is asking", () => {
  it("takes the client from the front of x-forwarded-for, not a proxy", () => {
    assert.equal(requesterKey(new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" })), "203.0.113.7");
  });

  it("falls back to x-real-ip, then to one shared bucket", () => {
    assert.equal(requesterKey(new Headers({ "x-real-ip": "203.0.113.9" })), "203.0.113.9");
    // Everybody in one bucket is the safe direction — the alternative is every
    // request looking like a different person and no limit at all.
    assert.equal(requesterKey(new Headers()), "unknown");
  });
});

describe("what somebody is told", () => {
  it("says how long, because 'try again later' does not", () => {
    assert.equal(tooManyMessage(60), "Too many attempts. Try again in 1 minute.");
    assert.equal(tooManyMessage(300), "Too many attempts. Try again in 5 minutes.");
    assert.equal(tooManyMessage(7200), "Too many attempts. Try again in about 2 hours.");
    // Never "try again in 0 minutes".
    assert.equal(tooManyMessage(1), "Too many attempts. Try again in 1 minute.");
  });
});

describe("the password rule", () => {
  it("is the same rule wherever a password is set", () => {
    // Signing up used to accept one character while changing it demanded
    // eight, so the weakest passwords on the site were the ones people
    // started with and never changed.
    assert.equal(passwordProblem("x".repeat(MIN_PASSWORD_LENGTH)), null);
    assert.ok(passwordProblem("x".repeat(MIN_PASSWORD_LENGTH - 1)));
    assert.ok(passwordProblem(""));
    assert.ok(passwordProblem(undefined));
  });
});
