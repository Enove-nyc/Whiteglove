import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { mergeDayCounts, mergeDestinationDayBuckets, RECENT_DAYS } from "@/lib/site-analytics";

/**
 * When a page was opened, not only how often.
 *
 * The reports screen could always say a town had been opened forty times. It
 * could never say whether that was last week or two years ago — and those are
 * not the same job. "111 towns with nothing published" is a list to work
 * through; which of them people are opening NOW is the order to work through
 * it in, and a since-forever counter cannot answer it.
 *
 * The care here is the same as everywhere else on this screen: what is not
 * known is said. Day-by-day counting starts when it starts, and a zero shown
 * before then would be inventing an absence rather than reporting one.
 */

describe("merging the day buckets", () => {
  it("adds a page up across the days", () => {
    const merged = mergeDayCounts([
      [{ label: "/a", count: 2 }, { label: "/b", count: 1 }],
      [{ label: "/a", count: 3 }],
    ]);
    assert.deepEqual(merged, [{ label: "/a", count: 5 }, { label: "/b", count: 1 }]);
  });

  it("breaks ties alphabetically, so the same data always reads the same way", () => {
    // Otherwise the order depends on whichever bucket answered first, and the
    // screen reshuffles between two identical loads.
    const merged = mergeDayCounts([[{ label: "/b", count: 1 }], [{ label: "/a", count: 1 }]]);
    assert.deepEqual(merged.map((row) => row.label), ["/a", "/b"]);
  });

  it("handles no days, and days with nothing in them", () => {
    assert.deepEqual(mergeDayCounts([]), []);
    assert.deepEqual(mergeDayCounts([[], []]), []);
  });

  it("is the ONE merge, with the destination list expressed through it", () => {
    // Two copies of the tie-breaking is how the front page and the reports
    // screen quietly start disagreeing about the same week of data.
    const days = [[{ label: "krakow", count: 2 }], [{ label: "uman", count: 2 }]];
    assert.deepEqual(mergeDestinationDayBuckets(days), mergeDayCounts(days).map((row) => row.label));
    assert.deepEqual(mergeDestinationDayBuckets(days), ["krakow", "uman"]);
  });
});

describe("what is written when a page is opened", () => {
  const SRC = readFileSync("lib/site-analytics.ts", "utf8");
  const fn = SRC.slice(SRC.indexOf("export async function trackPageView"), SRC.indexOf("export async function countingPagesSince"));

  it("keeps the since-forever counters exactly as they were", () => {
    // The totals have been counting all along and are the longer record. A
    // change here would quietly reset the one number this screen has always
    // been able to show.
    assert.match(fn, /incr\/white-glove:visits:all/);
    assert.match(fn, /zincrby\/white-glove:pages\/1\//);
  });

  it("adds a day bucket, and expires it AFTER incrementing", () => {
    // EXPIRE on a key that does not exist yet is a no-op, so the increment has
    // to land first — the same order the destination buckets already use.
    const incr = fn.indexOf("zincrby/${dayKey}");
    const expire = fn.indexOf("expire/${dayKey}");
    assert.ok(incr > 0 && expire > 0);
    assert.ok(incr < expire);
  });

  it("keeps a day for longer than the window that reads it", () => {
    // Or the oldest day in a 30-day view has expired by the time it is asked
    // for, and the figure quietly under-reports.
    assert.match(SRC, /const PAGE_BUCKET_TTL_SECONDS = \(RECENT_DAYS \+ 5\)/);
    assert.equal(RECENT_DAYS, 30);
  });

  it("records the day counting began, once and never again", () => {
    // setnx, not set: overwriting it every page view would make "since" mean
    // today, forever, and the screen would always claim no history.
    assert.match(fn, /setnx\/\$\{PAGES_SINCE_KEY\}/);
  });
});

describe("what the screen says before there is any history", () => {
  const PAGE = readFileSync("app/admin/reports/page.tsx", "utf8");

  it("shows no recent figure at all until counting has begun", () => {
    // A zero here would say "nobody comes" when it means "nobody was
    // counting" — the same mistake as ranking a page nobody has opened, which
    // this screen already refuses to make.
    assert.match(PAGE, /\{report\.recentSince && \(/);
    assert.match(PAGE, /in \{report\.recentDays\} days/);
  });

  it("says when it will start, rather than leaving a blank column", () => {
    assert.match(PAGE, /start filling in\s*\n?\s*tomorrow/);
  });

  it("says how far back 'recently' actually reaches, once it does", () => {
    assert.match(PAGE, /reach back to \{report\.recentSince\}/);
    assert.match(PAGE, /go back further/);
  });
});
