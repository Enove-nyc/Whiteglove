import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { AIRPORTS, METRO_AREAS } from "../data/airports";
import { airportsInMetro, metroMatches, resolveEndpoint } from "../lib/flight-endpoint";
import { explainDuffelError } from "../app/api/flights/search/route";
import { redact } from "../lib/redact";

// Two faults, both of them the same fault twice over: the code knew something
// and did not say it.
//
//   1. A failed search said "Duffel could not complete this flight search right
//      now" and threw Duffel's own reply away unread. A wrong token and a route
//      with no flights looked identical, and neither could be fixed.
//   2. "London" was read as whichever airport code happened to be at the end of
//      the box, so four of London's five airports were never searched and
//      nothing said so.

describe("a city with more than one airport", () => {
  test("London resolves to the whole area, not to Heathrow", () => {
    const place = resolveEndpoint("London");
    assert.equal(place?.code, "LON");
    assert.equal(place?.wholeCity, true);
    // The five that used to be four-fifths invisible.
    assert.deepEqual([...place!.airports].sort(), ["LCY", "LGW", "LHR", "LTN", "STN"]);
  });

  test("the picker's own label round-trips", () => {
    // What the dropdown writes into the box has to come back out as the same
    // place, or picking from the list would search something else. This failed
    // the first time it was run: the picker wrote "London — all airports" and
    // the resolver could not read it, so a picked city fell through to nothing.
    for (const [code, area] of Object.entries(METRO_AREAS)) {
      assert.equal(resolveEndpoint(`${area.label} (${code})`)?.code, code, `${area.label} (${code})`);
      // Also without the code, for a value stored before it was added.
      assert.equal(resolveEndpoint(area.label)?.code, code, area.label);
    }
  });

  test("New York, Paris, Chicago, Washington and Milan all cover their airports", () => {
    for (const [city, expected] of [
      ["New York", ["EWR", "JFK", "LGA"]],
      ["Paris", ["CDG", "ORY"]],
      ["Chicago", ["MDW", "ORD"]],
      ["Milan", ["LIN", "MXP"]],
    ] as const) {
      const place = resolveEndpoint(city);
      assert.equal(place?.wholeCity, true, city);
      assert.deepEqual([...place!.airports].sort(), [...expected], city);
    }
  });

  test("a named airport still searches only that airport", () => {
    // The whole-city default must not take the choice away from somebody who
    // made one — a connection booked into Gatwick is a different trip.
    const place = resolveEndpoint("London (LGW)");
    assert.equal(place?.code, "LGW");
    assert.equal(place?.wholeCity, false);
  });

  test("a metropolitan code is never also one of its own airports", () => {
    // Istanbul and Kyiv are left out for exactly this reason: their city code
    // doubles as an airport code, so sending it would quietly search one
    // airport while claiming to search the city.
    for (const code of Object.keys(METRO_AREAS)) {
      assert.ok(!AIRPORTS.some((a) => a.code === code), `${code} is also an airport code`);
    }
  });

  test("every metropolitan code actually has airports behind it", () => {
    for (const code of Object.keys(METRO_AREAS)) {
      assert.ok(airportsInMetro(code).length >= 2, `${code} needs at least two airports to be worth offering`);
    }
  });

  test("the picker offers the city above the airports", () => {
    assert.deepEqual(metroMatches("london").map((m) => m.code), ["LON"]);
    assert.deepEqual(metroMatches("lhr").map((m) => m.code), ["LON"]);
    // A one-airport city gets no whole-city option, because there is nothing
    // to combine.
    assert.deepEqual(metroMatches("krakow"), []);
  });
});

describe("a single airport", () => {
  test("a bare code is taken as typed", () => {
    assert.equal(resolveEndpoint("KRK")?.code, "KRK");
    assert.equal(resolveEndpoint("KRK")?.wholeCity, false);
  });

  test("a code we do not carry is passed through rather than refused", () => {
    // Duffel knows far more airports than this list does. Refusing an unknown
    // code would make the box narrower than the service behind it.
    assert.equal(resolveEndpoint("ZZZ")?.code, "ZZZ");
  });

  test("nothing recognisable resolves to nothing, not to a guess", () => {
    assert.equal(resolveEndpoint(""), null);
    assert.equal(resolveEndpoint("   "), null);
    assert.equal(resolveEndpoint("qqzzxx"), null);
    assert.equal(resolveEndpoint(undefined), null);
  });
});

describe("what a failed search tells you", () => {
  const body = (code: string, title: string, message: string) =>
    JSON.stringify({ errors: [{ code, title, message, type: "authentication_error" }] });

  test("a rejected token names the variable and the two Duffel modes", () => {
    const out = explainDuffelError(401, body("invalid_api_token", "Invalid token", "The token is not valid"));
    assert.match(out.message, /did not accept the access token/);
    assert.match(out.detail!, /DUFFEL_ACCESS_TOKEN/);
    assert.match(out.detail!, /duffel_test_/);
    assert.match(out.detail!, /redeploy/);
  });

  test("a rate limit is told apart from a broken key", () => {
    assert.match(explainDuffelError(429, "{}").message, /rate-limiting/);
  });

  test("Duffel's own words come through on a refused search", () => {
    const out = explainDuffelError(422, JSON.stringify({ errors: [{ title: "Invalid origin", message: "XXX is not an airport" }] }));
    assert.match(out.detail!, /Invalid origin/);
    assert.match(out.detail!, /XXX is not an airport/);
  });

  test("Duffel being down is not reported as our fault", () => {
    assert.match(explainDuffelError(503, "").message, /Duffel's own service/);
  });

  test("a reply that is not JSON still produces something usable", () => {
    const out = explainDuffelError(418, "<html>gateway</html>");
    assert.match(out.message, /HTTP 418/);
  });

  test("a 403 is explained, not just numbered", () => {
    // Found by running it: an invalid token came back 403, and the fallback
    // printed the number with nothing to do about it.
    const out = explainDuffelError(403, "");
    assert.match(out.message, /refused the request/);
    assert.ok(out.detail && out.detail.length > 40);
  });

  test("every status carries something to act on", () => {
    for (const status of [400, 401, 403, 422, 429, 500, 502, 503, 418]) {
      const out = explainDuffelError(status, "{}");
      assert.notEqual(out.message, "Duffel could not complete this flight search right now.");
      assert.ok(out.detail, `HTTP ${status} left the reader with nowhere to go`);
    }
  });
});

describe("the token cannot reach the browser", () => {
  test("a Duffel token quoted back in an error is struck out", () => {
    // Duffel echoes the request on some refusals. Before this, DUFFEL_API_KEY
    // was on the redaction list and DUFFEL_ACCESS_TOKEN — the name actually
    // used — was not, so the token would have gone straight out.
    const token = "duffel_test_abcdefghijklmnop1234567890";
    process.env.DUFFEL_ACCESS_TOKEN = token;
    try {
      const out = redact(`Authorization: Bearer ${token} was rejected`);
      assert.ok(!out.includes(token));
      assert.match(out, /\[redacted\]/);
    } finally {
      delete process.env.DUFFEL_ACCESS_TOKEN;
    }
  });

  test("struck out even when this deployment does not hold it", () => {
    // The pattern has to stand on its own — a token echoed from somewhere else
    // is still a token.
    const out = redact("token duffel_live_zyxwvutsrqponml0987654321 rejected");
    assert.ok(!out.includes("duffel_live_zyxwvutsrqponml0987654321"));
  });
});
