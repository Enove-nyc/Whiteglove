import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  apartmentFromInput,
  apartmentId,
  apartmentProblem,
  listApartmentProviders,
  type ApartmentInput,
} from "@/lib/kosher-apartments";
import { ADMIN_HOST_SEGMENTS } from "@/lib/admin-host";
import { areaForPath } from "@/lib/admin-permissions";
import { allAdminDestinations } from "@/lib/admin-nav";

const good: ApartmentInput = {
  name: "Kosher Apartments Jerusalem",
  area: "Jerusalem",
  note: "Short-term flats near the Old City.",
  url: "https://example.org",
  phone: null,
  whatsapp: null,
};

describe("adding a kosher-apartment provider from the admin", () => {
  it("accepts a complete provider", () => {
    assert.equal(apartmentProblem(good), null);
  });

  it("refuses one without a name or an area", () => {
    assert.match(apartmentProblem({ ...good, name: "  " }) ?? "", /name/i);
    assert.match(apartmentProblem({ ...good, area: "" }) ?? "", /where/i);
  });

  it("insists on at least one way to reach them", () => {
    const noContact: ApartmentInput = { ...good, url: null, phone: null, whatsapp: null };
    assert.match(apartmentProblem(noContact) ?? "", /website|phone|whatsapp/i);
    // Any one of the three is enough.
    assert.equal(apartmentProblem({ ...noContact, phone: "+972 555 1234" }), null);
    assert.equal(apartmentProblem({ ...noContact, whatsapp: "+972 555 1234" }), null);
  });

  it("insists a website, when given, is a real web address", () => {
    assert.match(apartmentProblem({ ...good, url: "example.org" }) ?? "", /web address/i);
    assert.equal(apartmentProblem({ ...good, url: "http://example.org" }), null);
  });

  it("turns input into a listing, trimmed, flagged as added, with a stable id", () => {
    const listing = apartmentFromInput({ ...good, name: "  Kosher Apartments Jerusalem  " });
    assert.equal(listing.name, "Kosher Apartments Jerusalem");
    assert.equal(listing.added, true);
    assert.equal(listing.id, apartmentId(good));
    // The same area and name always give the same id, so re-adding replaces
    // rather than duplicating.
    assert.equal(apartmentId(good), apartmentId({ ...good, url: "https://other.example" }));
  });

  it("gives an accented name a clean ascii id", () => {
    const id = apartmentId({ ...good, area: "Zürich", name: "Wohnungen" });
    assert.match(id, /^apartment-added-[a-z0-9-]+$/);
  });

  it("ships an empty built-in list — the owner fills it, nothing is invented", () => {
    assert.deepEqual(listApartmentProviders(), []);
  });
});

describe("the admin screen is wired in", () => {
  it("is served as a bare path on the admin host", () => {
    assert.ok((ADMIN_HOST_SEGMENTS as readonly string[]).includes("kosher-apartments"));
  });

  it("is filed under the directory permission area", () => {
    assert.equal(areaForPath("/admin/kosher-apartments"), "directory");
  });

  it("is reachable from the admin nav", () => {
    assert.ok(allAdminDestinations().some((d) => d.href === "/admin/kosher-apartments"));
  });
});
