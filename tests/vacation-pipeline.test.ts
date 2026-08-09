import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { attractions } from "@/data/attractions";
import { kosherEateries } from "@/data/kosher-eateries";
import { kosherAreas, kosherStays } from "@/data/kosher-stays";
import { TRIP_THEMES, vacationDestinations } from "@/data/vacation-destinations";
import { NEW_THEME_THRESHOLD, PIPELINE, PIPELINE_GROUPS, candidatesIn } from "@/data/vacation-pipeline";
import { backlog, missingByCheck, readinessOf, readinessOfAll } from "@/lib/destination-readiness";
import type { VacationSources } from "@/lib/vacation-ideas";

/**
 * The rule that keeps the list from growing the wrong way.
 *
 * The pressure on a thin list is to make it longer, and the cheapest way to do
 * that here is to write destination records. It is also the worst way: every
 * practical claim on a destination page is DERIVED from the eateries, quarters,
 * stays and attractions the site holds, so a record that joins to nothing
 * renders honest empty states. Twenty of those would make the site bigger and
 * worth less.
 *
 * So the bar is code (lib/destination-readiness.ts), the queue is data
 * (data/vacation-pipeline.ts), and this is what stops either being quietly
 * stepped over.
 */

const SOURCES: VacationSources = {
  attractions,
  stays: kosherStays,
  areas: kosherAreas,
  eateries: kosherEateries,
};

/**
 * Published destinations that do not clear all five checks.
 *
 * A SNAPSHOT OF KNOWN DEBT, not an allowance. Adding a thin destination fails
 * this test; so does fixing one of these without taking it off the list, which
 * is deliberate — that is how the list stays honest rather than growing
 * quietly. Each entry says what it is missing and what would remove it.
 */
const KNOWN_THIN: Record<string, string> = {
  // Four of five. Nothing to stay in on record in Interlaken, Grindelwald or
  // Wengen — the page leans entirely on the Zurich base. Comes off this list
  // the day one stay or quarter in the valley is recorded.
  "jungfrau-region": "somewhere-to-stay",
};

describe("the publication bar", () => {
  it("REFUSES A DESTINATION THAT CANNOT ANSWER THE FIVE QUESTIONS", () => {
    // The checks are the five things a kosher traveler needs before a place is
    // worth a page: what to eat, what happens on Shabbos, where to sleep, what
    // to do, and how to get there.
    const invented = readinessOf(
      {
        slug: "nowhere",
        name: "Nowhere",
        country: "Nowhere",
        cities: ["A town nothing joins to"],
        themes: ["beach"],
        seasons: ["summer"],
        whyGo: "x",
        bestFor: ["x"],
        suggestedLength: "x",
        overview: "x",
        whyVisit: ["x"],
        bestTime: "x",
        suits: "x",
        transport: "Fly there.",
        cautions: ["x"],
      },
      SOURCES,
    );
    assert.equal(invented.publishable, false);
    assert.equal(invented.met, 0);
    assert.deepEqual(
      invented.checks.filter((check) => !check.met).map((check) => check.id),
      ["kosher-food", "shabbos", "somewhere-to-stay", "something-to-do", "getting-there"],
    );
    // And it says what to do about it, naming the file the work lands in.
    assert.match(invented.checks[0].detail, /data\/kosher-eateries\.ts/);
  });

  it("counts a base town for food and NOT for where to sleep", () => {
    // The alpine case is the site's best sentence and it is not an answer to
    // every question: the butcher being two hours away in Zurich does not tell
    // anybody where their bed is.
    const jungfrau = readinessOfAll(vacationDestinations, SOURCES).find((entry) => entry.slug === "jungfrau-region");
    assert.ok(jungfrau);
    const byId = new Map(jungfrau.checks.map((check) => [check.id, check]));
    assert.equal(byId.get("kosher-food")?.met, true);
    assert.equal(byId.get("somewhere-to-stay")?.met, false);
  });

  it("HOLDS EVERY PUBLISHED DESTINATION TO IT, with the debt named", () => {
    const thin = backlog(readinessOfAll(vacationDestinations, SOURCES));
    const actual = Object.fromEntries(
      thin.map((entry) => [entry.slug, entry.checks.filter((check) => !check.met).map((check) => check.id).join(", ")]),
    );
    assert.deepEqual(
      actual,
      KNOWN_THIN,
      "a destination is below the publication bar and is not on the known-thin list — publish the evidence first, or add it here with a reason",
    );
  });

  it("reports where the whole list is thin, biggest gap first", () => {
    const gaps = missingByCheck(readinessOfAll(vacationDestinations, SOURCES));
    assert.equal(gaps.length, 5);
    for (let i = 1; i < gaps.length; i += 1) assert.ok(gaps[i - 1].missing >= gaps[i].missing);
  });
});

describe("the queue", () => {
  it("covers every group that was asked for", () => {
    const labels = PIPELINE_GROUPS.map((group) => group.label.toLowerCase()).join(" | ");
    for (const asked of [
      "south florida",
      "orlando",
      "new york",
      "los angeles",
      "israel",
      "caribbean",
      "mediterranean",
      "ski",
      "seasonal",
      "weekend",
    ]) {
      assert.ok(labels.includes(asked), `no group covers ${asked}`);
    }
  });

  it("PUBLISHES NOTHING BY ITSELF", () => {
    // A candidate is a work item. Nothing in the pipeline file renders, and no
    // slug in it may collide with a published destination.
    const published = new Set(vacationDestinations.map((destination) => destination.slug));
    for (const candidate of PIPELINE) {
      assert.equal(published.has(candidate.slug), false, `${candidate.slug} is both queued and published`);
    }
  });

  it("MAKES NO CLAIM ABOUT ANY OF THEM", () => {
    // The failure this guards: a queue entry that says "great kosher food in
    // Miami Beach" is a published claim with no record behind it, sitting in a
    // file nobody thinks of as content.
    const source = readFileSync("data/vacation-pipeline.ts", "utf8");
    for (const candidate of PIPELINE) {
      for (const need of candidate.needs) {
        assert.doesNotMatch(need, /\bis kosher\b|\bglatt\b|\bcertified\b|\bhas a minyan\b/i, `${candidate.slug}: ${need}`);
      }
    }
    assert.doesNotMatch(source, /[€$£]\s?\d/, "the pipeline quotes a price");
  });

  it("names the towns before the research starts", () => {
    // The commonest way a destination page comes out empty is a city spelled
    // one way in data/attractions.ts and another in the destination record.
    for (const candidate of PIPELINE) {
      assert.ok(candidate.cities.length > 0, candidate.slug);
      assert.ok(candidate.needs.length > 0, candidate.slug);
      assert.ok(candidate.seasons.length > 0, candidate.slug);
      assert.ok(PIPELINE_GROUPS.some((group) => group.id === candidate.group), `${candidate.slug} is in no group`);
    }
  });

  it("puts the routes people actually ask for first", () => {
    assert.equal(PIPELINE_GROUPS[0].id, "south-florida");
    assert.ok(candidatesIn("south-florida").length >= 2);
    assert.ok(candidatesIn("israel-regions").length >= 3, "Israel has one destination and it is a pilgrimage");
  });
});

describe("new categories", () => {
  it("adds one only when there is something behind it", () => {
    assert.ok(NEW_THEME_THRESHOLD >= 3);
    const existing = new Set<string>(TRIP_THEMES.map((theme) => theme.value));
    for (const group of PIPELINE_GROUPS) {
      if (!group.newTheme) continue;
      assert.equal(
        existing.has(group.newTheme.value),
        false,
        `${group.newTheme.value} is already a filter and nothing is behind it`,
      );
    }
  });

  it("keeps every existing category non-empty", () => {
    // The hub does not render a filter with nothing behind it, but a category
    // that is empty in the data is still a promise somebody wrote down.
    for (const theme of TRIP_THEMES) {
      const count = vacationDestinations.filter((destination) => destination.themes.includes(theme.value)).length;
      assert.ok(count > 0, `${theme.label} has no destinations at all`);
    }
  });

  it("KNOWS BEACH AND RESORT IS THE THIN ONE", () => {
    // Stated as a fact rather than left implicit: this is why the front page
    // hides the counts, and it is what the queue is mostly for.
    const beach = vacationDestinations.filter((destination) => destination.themes.includes("beach")).length;
    assert.ok(beach < NEW_THEME_THRESHOLD, "beach is no longer thin — the front page can show its count again");
    const beachCandidates = PIPELINE.filter((candidate) =>
      PIPELINE_GROUPS.find((group) => group.id === candidate.group)?.themes.includes("beach"),
    );
    assert.ok(beachCandidates.length >= 5, "the thinnest category has the smallest queue");
  });
});
