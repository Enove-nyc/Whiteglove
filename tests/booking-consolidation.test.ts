import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nextConfig from "@/next.config";
import { withRenamedSections } from "@/lib/edge-lock";

// /book and /booking were two travel-booking pages. There is one now, and
// these are the two things that had to survive the merge.

describe("the old booking addresses", () => {
  it("redirect permanently to the page that replaced them", async () => {
    const redirects = (await nextConfig.redirects!()) as Array<{ source: string; destination: string; permanent: boolean }>;
    const find = (source: string) => redirects.find((entry) => entry.source === source);

    // Permanent, so a search engine carries the old page's ranking across
    // instead of treating /book as a stranger competing with /booking.
    assert.deepEqual(find("/booking"), { source: "/booking", destination: "/book", permanent: true });
    assert.deepEqual(find("/booking/review"), { source: "/booking/review", destination: "/book/review", permanent: true });
  });

  it("do not redirect to somewhere that redirects again", async () => {
    const redirects = (await nextConfig.redirects!()) as Array<{ source: string; destination: string }>;
    for (const entry of redirects) {
      assert.equal(
        redirects.some((other) => other.source === entry.destination),
        false,
        `${entry.source} redirects to ${entry.destination}, which redirects again`,
      );
    }
  });
});

describe("a section that was locked before it was renamed", () => {
  it("stays locked at its new address", () => {
    // The rename must not quietly open a section the owner had closed.
    assert.deepEqual(withRenamedSections(["/booking"]), ["/booking", "/book"]);
    assert.deepEqual(withRenamedSections(["/booking/"]), ["/booking/", "/book"]);
  });

  it("leaves everything else exactly as it was, once", () => {
    assert.deepEqual(withRenamedSections(["/cemeteries", "/stops"]), ["/cemeteries", "/stops"]);
    assert.deepEqual(withRenamedSections(["/booking", "/book"]), ["/booking", "/book"]);
    assert.deepEqual(withRenamedSections(["/book", "/booking"]), ["/book", "/booking"]);
    assert.deepEqual(withRenamedSections([" ", ""]), []);
  });
});
