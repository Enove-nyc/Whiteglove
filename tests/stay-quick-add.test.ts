import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  anchorFor,
  destinationSlugFor,
  looksLikeCoordinates,
  missingForPublish,
  savedStayMessage,
  statusForNewStay,
} from "@/lib/stay-quick-add";

/**
 * A PLACE TO STAY CAN BE ADDED FROM A PIN, AND FINISHED LATER.
 *
 * The owner: "I do not want to make it a must. I'd rather do the info
 * afterwards than hold them back." What is missing decides whether a stay is
 * published or waits in review — never whether it can be saved.
 */

const COMPLETE = {
  summary: "Ski-in, ski-out at the base of the tram.",
  anchorName: "Chabad of Wyoming",
  anchorCoords: "43.4799, -110.7624",
  sourceUrl: "https://example.com/hotel",
};

describe("a finished listing publishes exactly as it always did", () => {
  it("is published when everything the site normally asks for is there", () => {
    assert.equal(statusForNewStay(COMPLETE), "PUBLISHED");
    assert.deepEqual(missingForPublish(COMPLETE), []);
  });
});

describe("an unfinished listing waits in review rather than being refused", () => {
  it("names each missing piece, in the order the form shows them", () => {
    assert.deepEqual(missingForPublish({ summary: "", anchorName: "", anchorCoords: "", sourceUrl: "" }), [
      "a one-line summary",
      "the shul or quarter it is measured from",
      "a source",
    ]);
  });

  it("goes to review, never to a third state and never live with a blank", () => {
    assert.equal(statusForNewStay({ ...COMPLETE, summary: "" }), "NEEDS_REVIEW");
    assert.equal(statusForNewStay({ ...COMPLETE, sourceUrl: "" }), "NEEDS_REVIEW");
    assert.equal(statusForNewStay({ ...COMPLETE, anchorCoords: "" }), "NEEDS_REVIEW");
    assert.equal(statusForNewStay({ ...COMPLETE, anchorName: "" }), "NEEDS_REVIEW");
  });

  it("treats an anchor with nonsense coordinates as no anchor", () => {
    assert.equal(statusForNewStay({ ...COMPLETE, anchorCoords: "near the shul" }), "NEEDS_REVIEW");
    assert.equal(looksLikeCoordinates("43.5875, -110.8272"), true);
    assert.equal(looksLikeCoordinates("43.5875"), false);
    assert.equal(looksLikeCoordinates(""), false);
  });
});

describe("the hotel's own pin stands in for an anchor, and says so", () => {
  it("prefers a real anchor when one was given", () => {
    const anchor = anchorFor({ name: "Teton Mountain Lodge", anchorName: "Chabad of Wyoming", anchorCoords: "43.4799, -110.7624", ownCoords: "43.5875, -110.8272" });
    assert.deepEqual(anchor, { anchorName: "Chabad of Wyoming", anchorCoords: "43.4799, -110.7624" });
  });

  it("falls back to the stay's own pin, named as the stay so the editor shows it plainly", () => {
    // The same shape a traveller-submitted stay already takes — see
    // publishSubmittedPlace in lib/content-admin.ts.
    const anchor = anchorFor({ name: "Teton Mountain Lodge", anchorName: "", anchorCoords: "", ownCoords: "43.5875, -110.8272" });
    assert.deepEqual(anchor, { anchorName: "Teton Mountain Lodge", anchorCoords: "43.5875, -110.8272" });
    // …and with a summary and a source it publishes, the same as a
    // traveller-submitted stay does. The editor shows the anchor IS the hotel.
    assert.equal(statusForNewStay({ ...COMPLETE, ...anchor }), "PUBLISHED");
  });

  it("leaves the anchor blank when there is nothing to stand in", () => {
    const anchor = anchorFor({ name: "Somewhere", anchorName: "", anchorCoords: "", ownCoords: "" });
    assert.equal(anchor.anchorCoords, "");
    assert.equal(statusForNewStay({ ...COMPLETE, ...anchor }), "NEEDS_REVIEW");
  });
});

describe("a city with no destination page gets one, in review", () => {
  it("makes the slug the admin would have typed", () => {
    assert.equal(destinationSlugFor("Teton Village"), "teton-village");
    assert.equal(destinationSlugFor("  Rome "), "rome");
    assert.equal(destinationSlugFor("Saint-Émilion"), "saint-emilion");
    assert.equal(destinationSlugFor("—"), "");
  });

  it("is made through createDestination, which lands every new row in review", () => {
    // The standing rule that unfinished sections stay hidden is kept by the
    // status the destination is created with, not by refusing to create it.
    const src = readFileSync("lib/content-admin.ts", "utf8");
    const helper = src.slice(src.indexOf("export async function ensureDestinationForCity"), src.indexOf("export async function", src.indexOf("export async function ensureDestinationForCity") + 10));
    assert.match(helper, /createDestination\(/);
    assert.match(helper, /catch \{\s*return null;/, "a destination that cannot be made must not lose the stay");
    const creator = src.slice(src.indexOf("export async function createDestination"), src.indexOf("export async function ensureDestinationForCity"));
    assert.match(creator, /status: "NEEDS_REVIEW"/);
  });

  it("matches an existing city without a country, so 'Rome, —' finds Rome", () => {
    const src = readFileSync("lib/content-admin.ts", "utf8");
    const helper = src.slice(src.indexOf("export async function ensureDestinationForCity"));
    assert.match(helper, /country\.trim\(\) !== "—"/);
    assert.match(helper, /mode: "insensitive"/);
  });
});

describe("the admin form asks for a name and a city, and nothing else as a must", () => {
  const form = readFileSync("components/AddEntryForms.tsx", "utf8");
  // Anchored on the heading, not the first mention of the words: the same
  // phrase appears earlier as a tab label, ahead of the cemetery and
  // attraction forms, and a slice from there would count their fields too.
  const stay = form.slice(form.indexOf(">Add somewhere to stay</h2>"), form.indexOf("Choose <strong>Confirmed</strong>"));

  it("requires only name and city", () => {
    const required = [...stay.matchAll(/name="([a-zA-Z]+)"[^>]*\brequired\b/g)].map((m) => m[1]);
    assert.deepEqual(required.sort(), ["city", "name"]);
  });

  it("offers a field for the hotel's own pin", () => {
    assert.match(stay, /name="coordinates"/);
  });

  it("says so in words, the way the cemetery form does", () => {
    assert.match(stay, /Only a name and city are required/);
  });
});

describe("the action does not gate on the rest either", () => {
  const src = readFileSync("app/admin/add/actions.ts", "utf8");
  const action = src.slice(src.indexOf("export async function addKosherStayAction"));

  it("refuses only a missing name or city", () => {
    const refusals = [...action.matchAll(/return \{ ok: false, message: "([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(refusals, ["Please sign in as an administrator.", "A name is required.", "A city is required."]);
  });

  it("decides the status from what is there, and starts the destination after saving", () => {
    assert.match(action, /statusForNewStay\(/);
    assert.match(action, /ensureDestinationForCity\(city, country\)/);
  });
});

describe("what the owner is told", () => {
  it("says it is live when it is, and what is still needed when it is not", () => {
    assert.match(savedStayMessage("X", "PUBLISHED", [], null), /^Added “X”\. It is in the where-to-stay list/);
    assert.match(savedStayMessage("X", "NEEDS_REVIEW", ["a source"], null), /Saved “X” for review — it still needs a source before it shows/);
  });

  it("mentions a destination it started, and only then", () => {
    assert.match(savedStayMessage("X", "PUBLISHED", [], "Teton Village"), /A destination page for Teton Village was started for you, in review\./);
    assert.doesNotMatch(savedStayMessage("X", "PUBLISHED", [], null), /destination page/);
  });
});
