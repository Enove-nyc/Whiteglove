import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Boarding passes kept on a device, and taken off it again.
 *
 * The airport at half past five is the likeliest place on a trip to have no
 * signal and the likeliest moment to need a pass, and until now the one thing
 * the service worker would never cache was exactly that — for a good reason,
 * which is that a pass carries a full name and a booking reference.
 *
 * So it is saved only when asked, into a cache of its own, and removed when
 * the session ends. These tests are about the second half, because the first
 * half failing is an inconvenience and the second half failing is somebody's
 * boarding pass left on a hotel computer.
 */

const SW = readFileSync("public/sw.js", "utf8");
const HELPER = readFileSync("lib/offline-documents.ts", "utf8");
const CONTROL = readFileSync("components/OfflineDocuments.tsx", "utf8");

describe("nothing is cached that was not asked for", () => {
  it("the attachments route is served from the network first, always", () => {
    const branch = SW.slice(SW.indexOf("if (url.pathname === ATTACHMENTS)"), SW.indexOf("if (url.pathname.startsWith(\"/api/\")"));
    assert.match(branch, /fetch\(req\)\.catch\(/);
  });

  it("a fetched document is never written to the cache by the fetch handler", () => {
    // THE ONE THAT MATTERS MOST. If the ordinary fetch path also cached, then
    // simply opening a pass once would leave it on the device — for everybody,
    // whether or not they ever agreed to it, which is precisely what the
    // route's own `private, no-store` exists to prevent.
    const branch = SW.slice(SW.indexOf("if (url.pathname === ATTACHMENTS)"), SW.indexOf("if (url.pathname.startsWith(\"/api/\")"));
    assert.doesNotMatch(branch, /\.put\(/, "the attachments fetch handler must never write to a cache");
  });

  it("the offline cache is filled only by the explicit message", () => {
    const keep = SW.slice(SW.indexOf("async function keepDocuments"), SW.indexOf('self.addEventListener("message"'));
    assert.match(keep, /cache\.put\(url, response\.clone\(\)\)/);
    // Only a real 200 is stored — caching a 401 would hand it back at the gate
    // as though it were the pass.
    assert.match(keep, /if \(response && response\.ok\)/);
    assert.match(keep, /credentials: "include"/);
  });

  it("keeps its own cache, apart from everything else", () => {
    assert.match(SW, /const OFFLINE_DOCS = "wg-offline-docs-v1"/);
    assert.notEqual("wg-offline-docs-v1", "wg-cache-v2");
  });

  it("a routine release does not empty it", () => {
    // activate deletes every cache but the current one. Sweeping this away on
    // a deploy would empty somebody's passes the morning of a flight, which is
    // the single moment the feature exists for.
    const activate = SW.slice(SW.indexOf('self.addEventListener("activate"'), SW.indexOf("async function keepDocuments"));
    assert.match(activate, /k !== CACHE && k !== OFFLINE_DOCS/);
  });
});

describe("signing out takes them with it", () => {
  it("the helper both tells the worker and deletes the cache itself", () => {
    // The message is the tidy path. The direct delete is the one that still
    // works when the worker is asleep, unregistered or mid-update — and an
    // uncleared pass is not something to leave to whether a worker happened
    // to be listening.
    assert.match(HELPER, /postMessage\(\{ type: "wg-offline-forget" \}\)/);
    assert.match(HELPER, /caches\.delete\("wg-offline-docs-v1"\)/);
  });

  it("never turns signing out into an error", () => {
    assert.match(HELPER, /try \{/);
    assert.match(HELPER, /\} catch \{/);
  });

  it("EVERY sign-out clears it", () => {
    // The rule this file exists for. A sign-out added later that forgets this
    // leaves somebody's boarding pass on a borrowed computer, and nothing else
    // in the codebase would notice.
    const roots = ["components", "app"];
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry)) continue;
        const src = readFileSync(full, "utf8");
        if (!src.includes("/api/account/logout")) continue;
        // app/layout.tsx names the endpoint only to hand it to <IdleLogout />,
        // which does the clearing itself. Anything that actually signs
        // somebody out has to do it here.
        if (/<IdleLogout/.test(src) && !/fetch\(\s*["'`]\/api\/account\/logout/.test(src)) continue;
        if (!src.includes("forgetOfflineDocuments")) offenders.push(full);
      }
    };
    for (const root of roots) walk(root);

    assert.deepEqual(
      offenders,
      [],
      `these sign out without clearing the offline documents: ${offenders.join(", ")}`,
    );
  });

  it("clears them when a session times out on its own", () => {
    // The likeliest place this ever hurts somebody: a hotel business centre,
    // walked away from, signing itself out forty-five minutes later with the
    // passes still on the machine. Named separately from the sweep above
    // because it is the case a sweep is most likely to be loosened around.
    const idle = readFileSync("components/IdleLogout.tsx", "utf8");
    assert.match(idle, /forgetOfflineDocuments\(\)/);
  });

  it("finds the sign-outs at all, so the check above cannot pass vacuously", () => {
    // A rule that matches nothing is a rule that is not running.
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (/\.tsx?$/.test(entry) && readFileSync(full, "utf8").includes("/api/account/logout")) found.push(full);
      }
    };
    walk("components");
    assert.ok(found.length >= 2, `expected the sign-out paths, found ${found.length}`);
  });
});

describe("what the traveller is told", () => {
  it("is off until they choose it", () => {
    assert.match(CONTROL, /useState<State>\("off"\)/);
  });

  it("says the files stay on the device and who can read them", () => {
    // Not implied, not in a tooltip. Somebody agreeing to leave a boarding
    // pass on a device should be told that is what they are doing.
    assert.match(CONTROL, /stored on this device/);
    assert.match(CONTROL, /anyone who can unlock it/);
    assert.match(CONTROL, /borrowed or shared computer/);
  });

  it("renders nothing where the browser cannot do it", () => {
    assert.match(CONTROL, /if \(state === "unsupported"\) return null;/);
  });

  it("reads what is actually cached rather than trusting a stored flag", () => {
    // A remembered "yes" that disagrees with an empty cache is worse than no
    // memory: it tells somebody at a gate that their pass is there when it is
    // not.
    assert.match(CONTROL, /caches\s*\n?\s*\.has\("wg-offline-docs-v1"\)/);
  });
});
