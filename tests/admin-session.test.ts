import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminIdentity, describeAdmin, readWho, signWho } from "@/lib/admin-session";

/**
 * Who is signed into the admin.
 *
 * Until now: nobody in particular. One shared password, one shared cookie,
 * identical for everybody who has ever held it — so the sign-in log said
 * "admin code" for every person alive and the header could say nothing.
 *
 * It also made the team screen's grant untrue. Marking somebody an
 * administrator put a link to the admin on their account page, and the
 * middleware bounced them to a password prompt they had never been given the
 * password for. The grant did nothing at all.
 *
 * The part that has to be right is the signature. An unsigned name would let
 * anybody holding the shared password relabel themselves as the owner.
 */

describe("the name on an admin session", () => {
  it("goes out and comes back", () => {
    const cookie = signWho("helper@example.com");
    assert.ok(cookie);
    assert.equal(readWho(cookie!), "helper@example.com");
  });

  it("is stored lowercased, the way accounts are", () => {
    assert.equal(readWho(signWho("Helper@Example.COM")!), "helper@example.com");
  });

  it("refuses a name nobody signed", () => {
    // The whole point: holding the shared password must not let you claim to
    // be somebody.
    const encoded = Buffer.from("owner@example.com").toString("base64url");
    assert.equal(readWho(`${encoded}.notasignature`), null);
    assert.equal(readWho(encoded), null);
    assert.equal(readWho(`${encoded}.`), null);
  });

  it("refuses a signature lifted from a different name", () => {
    const mac = signWho("helper@example.com")!.split(".")[1];
    const other = Buffer.from("owner@example.com").toString("base64url");
    assert.equal(readWho(`${other}.${mac}`), null);
  });

  it("refuses nonsense rather than throwing on it", () => {
    for (const value of ["", "...", "!!!.!!!", "a.b.c"]) {
      assert.equal(readWho(value), null);
    }
    assert.equal(readWho(undefined), null);
  });

  it("will not sign an empty name", () => {
    assert.equal(signWho(""), null);
    assert.equal(signWho("   "), null);
  });
});

describe("what the admin knows about who is in it", () => {
  it("is nobody at all without the admin cookie", () => {
    // A name cookie on its own grants nothing: the gate is still the admin
    // cookie, and this only says whose session it is.
    assert.equal(adminIdentity(signWho("helper@example.com")!, false), null);
  });

  it("is the shared password when there is no name", () => {
    assert.deepEqual(adminIdentity(undefined, true), { how: "code" });
  });

  it("falls back to the shared password when the name is forged", () => {
    // Not an error and not a lock-out — they do hold a valid admin cookie.
    // They are simply not somebody, which is what the shared password means.
    assert.deepEqual(adminIdentity("rubbish.rubbish", true), { how: "code" });
  });

  it("is the person when the name checks out", () => {
    assert.deepEqual(adminIdentity(signWho("helper@example.com")!, true), {
      how: "account",
      email: "helper@example.com",
    });
  });
});

describe("how it reads on screen", () => {
  it("names the person, or says plainly that it is the shared password", () => {
    assert.equal(describeAdmin({ how: "account", email: "helper@example.com" }), "helper@example.com");
    assert.equal(describeAdmin({ how: "code" }), "Signed in with the shared password");
    assert.equal(describeAdmin(null), "Not signed in");
  });
});
