import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { tripArrangementOpen } from "@/lib/features";

// The site goes live before the concierge side does. This switch is what
// stands between "we will arrange your trip" and a request sitting in an inbox
// nobody is watching, so the thing worth pinning down is which way it fails.

describe("the trip-arrangement switch", () => {
  afterEach(() => {
    delete process.env.TRIP_ARRANGEMENT;
  });

  it("is off when nobody has said otherwise", () => {
    assert.equal(tripArrangementOpen(), false);
  });

  it("stays off for anything that is not an explicit yes", () => {
    // "true", "on" and the empty string all read like an intention. None of
    // them are the documented value, and a near miss must not open a service
    // that has nobody behind it.
    for (const value of ["", " ", "0", "true", "on", "yes", "no", "false"]) {
      process.env.TRIP_ARRANGEMENT = value;
      assert.equal(tripArrangementOpen(), false, `${JSON.stringify(value)} should not open it`);
    }
  });

  it("opens on exactly 1, whitespace and all", () => {
    process.env.TRIP_ARRANGEMENT = "1";
    assert.equal(tripArrangementOpen(), true);
    process.env.TRIP_ARRANGEMENT = " 1 ";
    assert.equal(tripArrangementOpen(), true);
  });
});
