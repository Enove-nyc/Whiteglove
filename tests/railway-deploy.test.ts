import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * How this site is deployed, and the one setting that took a day to find.
 *
 * Every single deployment sent a "Deploy Crashed!" email while the site itself
 * never went down. The explanation is in the first line of the deploy log:
 * the service mounts a volume. lib/media.ts keeps uploaded adverts and
 * portraits on it, so it is not a leftover and cannot be detached.
 *
 * A volume can only be mounted by one container. Railway's default is to start
 * the new container before stopping the old one, so the new one reaches for a
 * volume the old one is still holding, fails, and is reported as crashed —
 * then retries under the restart policy until the old container lets go. Hence
 * a crash notice on a deploy that succeeds, and deploys that sometimes took
 * twelve minutes instead of three.
 *
 * overlapSeconds: 0 stops the old container first. The cost is a few seconds
 * where the site is not being served, which is the honest price of a volume.
 */
const config = JSON.parse(readFileSync("railway.json", "utf8")) as {
  deploy?: Record<string, unknown>;
};

describe("the deploy configuration", () => {
  it("DOES NOT OVERLAP CONTAINERS, BECAUSE THIS SERVICE HAS A VOLUME", () => {
    assert.equal(config.deploy?.overlapSeconds, 0);
  });

  it("still health-checks a route that answers while the site is locked", () => {
    // /version is reachable behind the site lock on purpose — see middleware.
    assert.equal(config.deploy?.healthcheckPath, "/version");
    const middleware = readFileSync("middleware.ts", "utf8");
    assert.match(middleware, /pathname !== "\/version"/);
  });

  it("restarts a container that genuinely fails, a bounded number of times", () => {
    assert.equal(config.deploy?.restartPolicyType, "ON_FAILURE");
    assert.ok(Number(config.deploy?.restartPolicyMaxRetries) > 0);
  });

  it("keeps the volume's reason for existing findable from here", () => {
    // If media ever stops using the disk, the volume can go and this file's
    // whole justification with it.
    const media = readFileSync("lib/media.ts", "utf8");
    assert.match(media, /\/data\/media/);
  });
});
