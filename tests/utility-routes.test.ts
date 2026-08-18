import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import nextConfig from "@/next.config";
import VersionPage, { metadata as versionMetadata } from "@/app/version/page";
import { STARTING_POINTS } from "@/lib/starting-points";

describe("the old planning address", () => {
  it("redirects permanently to the current recommendations flow", async () => {
    const redirects = (await nextConfig.redirects!()) as Array<{
      source: string;
      destination: string;
      permanent: boolean;
    }>;
    const planning = redirects.find((entry) => entry.source === "/planning");

    assert.deepEqual(planning, { source: "/planning", destination: "/plan", permanent: true });
    assert.ok(
      STARTING_POINTS.some((point) => point.href === planning.destination),
      "the planning redirect does not land on a current starting point",
    );
  });
});

describe("the version route", () => {
  it("remains the Railway health check", () => {
    const railway = JSON.parse(readFileSync("railway.json", "utf8")) as {
      deploy?: { healthcheckPath?: string };
    };
    assert.equal(railway.deploy?.healthcheckPath, "/version");
  });

  it("shows only a simple customer-safe status page", () => {
    const html = renderToStaticMarkup(VersionPage());

    assert.match(html, /Site status/);
    assert.match(html, /White Glove is available\./);
    assert.match(html, /href="\/"/);
    assert.doesNotMatch(html, /Vercel|deployment|developer|build|commit|branch|environment|troubleshoot/i);
    assert.deepEqual(versionMetadata.robots, { index: false, follow: false });
  });
});
