import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { coordinateProblem, describeCoordinate, FAR_KM, farFromAddress, kmApart } from "@/lib/place-coordinates";

/**
 * Whether a coordinate somebody typed can be where they say it is.
 *
 * A coordinate here is what the planner measures from, what the map pins and
 * what "navigate here" hands to Google Maps. A wrong one does not look wrong —
 * it sends somebody to a field forty kilometres from the kever they drove all
 * day for. The guard at the bottom is about the other half: an address that was
 * typed rather than picked is one nothing has resolved.
 */

// Real places, so the distances below are real distances.
const LIZHENSK = "50.2622,22.4204";
const LIZHENSK_TOWN = "50.2650,22.4200";
const KRAKOW = "50.0512,19.9448";

describe("what cannot be saved", () => {
  it("takes a blank, because not knowing is a true thing to record", () => {
    // The standing rule on the kever screen: leave it blank unless you know
    // the actual grave. That has to be allowed, not nagged about.
    assert.equal(coordinateProblem(""), null);
    assert.equal(coordinateProblem(undefined), null);
    assert.equal(coordinateProblem("   "), null);
  });

  it("takes a real coordinate, in either spelling", () => {
    assert.equal(coordinateProblem(LIZHENSK), null);
    assert.equal(coordinateProblem("50.251139, 22.422611"), null);
    // The degrees/minutes/seconds form Google Maps shows.
    assert.equal(coordinateProblem("50°15'04.1\"N 22°25'21.4\"E"), null);
  });

  it("refuses something that is not a coordinate, and says what to paste", () => {
    const said = String(coordinateProblem("near the gate"));
    assert.match(said, /not a coordinate/);
    assert.match(said, /50\.251139/, "does not show what one looks like");
  });

  it("refuses numbers that are not a place on earth, and says to check the order", () => {
    // Latitude and longitude the wrong way round is the commonest way to get
    // this wrong, and out-of-range is how it shows.
    assert.match(String(coordinateProblem("22.42, 500")), /not a place on earth/);
    assert.match(String(coordinateProblem("95, 22")), /latitude first/);
  });

  it("refuses 0, 0 by name — what an empty form produces", () => {
    // It reads like a real value on a screen, which is exactly the danger.
    assert.match(String(coordinateProblem("0, 0")), /Atlantic/);
  });
});

describe("is it anywhere near the address", () => {
  it("says nothing when it is", () => {
    assert.equal(farFromAddress(LIZHENSK, LIZHENSK_TOWN), null);
    assert.ok((kmApart(LIZHENSK, LIZHENSK_TOWN) ?? 99) < 1);
  });

  it("asks when it is not, and says how far", () => {
    // Kraków to Lizhensk is about 180 km. A coordinate that far from its own
    // address is a transposed digit far more often than it is a surprise.
    const said = String(farFromAddress(KRAKOW, LIZHENSK, "Górna 16, Leżajsk"));
    assert.match(said, /1[78]\d km/);
    assert.match(said, /Górna 16, Leżajsk/);
  });

  it("ASKS RATHER THAN REFUSES", () => {
    // The person typing may know where the grave is when the map does not,
    // which happens constantly on these routes. Refusing would lose that to
    // catch the typo.
    const said = String(farFromAddress(KRAKOW, LIZHENSK));
    assert.match(said, /If that is right, carry on/);
    assert.ok(!/cannot|refuse|invalid/i.test(said), said);
  });

  it("says nothing when there is nothing to compare", () => {
    assert.equal(farFromAddress(LIZHENSK, undefined), null);
    assert.equal(farFromAddress(undefined, LIZHENSK), null);
    assert.equal(farFromAddress("not a coordinate", LIZHENSK), null);
  });

  it("does not nag about a town-centre address and a grave on the outskirts", () => {
    // The ordinary case. A few kilometres is a normal beis hachaim, and a
    // screen that questions every one of them teaches somebody to ignore it.
    const fiveKmNorth = "50.3072,22.4204";
    assert.ok((kmApart(LIZHENSK, fiveKmNorth) ?? 0) > 4, "the fixture is not far enough apart to be a real test");
    assert.equal(farFromAddress(fiveKmNorth, LIZHENSK), null);
    assert.ok(FAR_KM >= 20, "the threshold has been set tight enough to nag");
  });
});

describe("what a screen is told", () => {
  it("says nothing when there is nothing to say", () => {
    // A form that congratulates somebody on typing a number teaches them to
    // stop reading it.
    assert.deepEqual(describeCoordinate(LIZHENSK, LIZHENSK_TOWN), { tone: "none", says: "" });
    assert.equal(describeCoordinate("").tone, "none");
  });

  it("puts a real problem above a question", () => {
    // 0,0 is 5,000 km from anywhere, so both would fire. The refusal is the
    // one worth showing.
    const said = describeCoordinate("0, 0", LIZHENSK);
    assert.equal(said.tone, "problem");
    assert.match(said.says, /Atlantic/);
  });

  it("asks the question when the coordinate is fine but distant", () => {
    assert.equal(describeCoordinate(KRAKOW, LIZHENSK).tone, "question");
  });
});

/* ---- the one that keeps this honest ------------------------------------- */

/**
 * Screens where somebody types an address or a coordinate.
 *
 * The public itinerary builder is excluded on purpose: a traveller typing their
 * own hotel into their own trip is not filing a record the site publishes, and
 * it already offers the address picker beside the box.
 */
const ADMIN_FORMS = ["components/KeverEditor.tsx", "components/AdminContentManager.tsx", "components/AddEntryForms.tsx", "components/DestinationEditor.tsx", "components/HechsherEditor.tsx"];

describe("nothing is typed that should be picked", () => {
  it("every admin form that takes an address offers the picker", () => {
    // A hand-typed address is one nothing has resolved: it may not exist, and
    // half of these are Polish and Ukrainian street names with diacritics a
    // keyboard gets wrong in a way no page ever notices.
    const missing: string[] = [];
    for (const path of ADMIN_FORMS) {
      const src = readFileSync(path, "utf8");
      const takesAddress = /name="address"|label="Address"|>Address</.test(src);
      const offersPicker = /AddressAutocomplete|AddressAndCoordinate/.test(src);
      if (takesAddress && !offersPicker) missing.push(path);
    }
    assert.deepEqual(missing, [], `these take an address as free text: ${missing.join(", ")}`);
  });

  it("no long list is left on a plain dropdown", () => {
    // SearchableSelect exists for exactly this. A native <select> holding 146
    // batei hachaim is a scroll, not a choice — you cannot type "Lizhensk" and
    // land on it, you hunt. Short fixed lists (statuses, roles) stay native,
    // which is what the component's own note says.
    const long = ["cemeteries", "destinations", "listings", "locations", "kevarim"];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!path.endsWith(".tsx")) continue;
        const src = readFileSync(path, "utf8");
        for (const block of src.match(/<select\b[\s\S]*?<\/select>/g) ?? []) {
          for (const name of long) {
            if (new RegExp(`\\b${name}\\s*\\.map\\(`).test(block)) offenders.push(`${path} (${name})`);
          }
        }
      }
    };
    for (const dir of ["app", "components"]) walk(dir);
    assert.deepEqual(offenders, [], `a long list inside a plain <select>: ${offenders.join(", ")}`);
  });
});
