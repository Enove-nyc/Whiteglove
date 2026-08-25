import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { othersToTell, type Collaborator } from "@/lib/trip-roles";

/**
 * Telling the other people on a trip.
 *
 * Until now only the owner heard anything, from a note or an edit. On a trip
 * three people are planning together, one of them asking "can we not do Uman
 * on the Friday?" reached exactly one of the other two, and a stop moved by an
 * editor reached nobody at all.
 *
 * The whole risk here is the opposite failure: a notification that goes to too
 * many people about too little stops being read, and takes the ones that
 * mattered with it. So who hears is a rule with a reason, and it is tested
 * harder than the sending is.
 */

const collaborator = (person: string, role: Collaborator["role"]): Collaborator => ({ person, role });

describe("who hears", () => {
  const owner = "owner@example.com";
  const list = [
    collaborator("editor@example.com", "editor"),
    collaborator("commenter@example.com", "commenter"),
    collaborator("viewer@example.com", "viewer"),
  ];

  it("tells the people who can contribute", () => {
    assert.deepEqual(othersToTell(list, owner, "someone@example.com").sort(), [
      "commenter@example.com",
      "editor@example.com",
    ]);
  });

  it("never tells a viewer", () => {
    // Somebody given "can view" was shown a plan. They are an audience, and an
    // audience did not ask to hear each time a stop was renamed.
    assert.ok(!othersToTell(list, owner, "x@example.com").includes("viewer@example.com"));
  });

  it("never tells the person who just did it", () => {
    // An email describing what somebody has this moment done themselves is the
    // fastest way to teach them to ignore the next one.
    assert.ok(!othersToTell(list, owner, "editor@example.com").includes("editor@example.com"));
    assert.deepEqual(othersToTell(list, owner, "EDITOR@Example.com "), ["commenter@example.com"]);
  });

  it("never tells the owner here", () => {
    // They are told separately and by name, on their own trip, whether or not
    // they contribute to it. Sending both would be two emails about one edit.
    const withOwner = [...list, collaborator(owner, "editor")];
    assert.ok(!othersToTell(withOwner, owner, "x@example.com").includes(owner));
  });

  it("tells nobody twice", () => {
    const twice = [collaborator("a@example.com", "editor"), collaborator("A@Example.com", "commenter")];
    assert.equal(othersToTell(twice, owner, "x@example.com").length, 1);
  });

  it("keeps the address as it was stored, having compared it case-insensitively", () => {
    const stored = [collaborator("Chaya@Example.com", "editor")];
    assert.deepEqual(othersToTell(stored, owner, "x@example.com"), ["Chaya@Example.com"]);
  });

  it("says nobody when there is nobody", () => {
    assert.deepEqual(othersToTell([], owner, "x@example.com"), []);
    assert.deepEqual(othersToTell([collaborator("  ", "editor")], owner, "x@example.com"), []);
  });
});

describe("an edit reaches them", () => {
  const ROUTE = readFileSync("app/api/account/itinerary/shared/route.ts", "utf8");

  it("sends to the contributors, through the rule rather than its own filter", () => {
    assert.match(ROUTE, /othersToTell\(readCollaborators\(data\.itineraryCollaborators\), owner, editor\)/);
    assert.match(ROUTE, /sendTripChangedForCollaboratorEmail\(person,/);
  });

  it("one bad address does not stop the rest of the list", () => {
    assert.match(ROUTE, /\.catch\(\s*\(\) => undefined,?\s*\)/);
  });

  it("skips somebody with nowhere to send to", () => {
    assert.match(ROUTE, /if \(isPhoneIdentity\(person\)\) continue;/);
  });
});

describe("a note reaches them, without its words", () => {
  const ROUTE = readFileSync("app/api/account/itinerary/comments/route.ts", "utf8");

  it("tells them a note was left, and on what", () => {
    assert.match(ROUTE, /othersToTell\(readCollaborators\(data\.itineraryCollaborators\), owner, from\)/);
    assert.match(ROUTE, /left \$\{summary\}/);
  });

  it("does NOT forward what the note said", () => {
    // THE ONE THAT MATTERS HERE. The owner gets the words because it is their
    // trip. A note can be a question about somebody's money or their family,
    // and copying it to everybody ever added to the trip is not what writing
    // it in one place meant. They open the trip and read it there.
    const loop = ROUTE.slice(ROUTE.indexOf("for (const person of othersToTell"));
    assert.doesNotMatch(loop, /comment\.body/, "the note's own words must not go to other collaborators");
  });

  it("still emails the owner the words themselves", () => {
    assert.match(ROUTE, /sendTripNoteEmail\(owner, \{ fromName, tripTitle, note: comment\.body/);
  });

  it("an owner with no address no longer stops everybody else being told", () => {
    // It used to return early on a phone-number owner, which was right when
    // the owner was the only recipient and became a bug the moment they were
    // not.
    const fn = ROUTE.slice(ROUTE.indexOf("async function notifyOwner"));
    const guard = fn.indexOf("if (!isPhoneIdentity(owner))");
    const others = fn.indexOf("othersToTell");
    assert.ok(guard > 0 && others > 0, "both the owner guard and the others loop should be present");
    assert.ok(guard < others, "the owner guard must wrap only the owner's own email");
    assert.doesNotMatch(fn.slice(0, guard), /if \(isPhoneIdentity\(owner\)\) return;/);
  });
});

describe("what a collaborator is told is worded for them", () => {
  const EMAIL = readFileSync("lib/email.ts", "utf8");
  const fn = EMAIL.slice(
    EMAIL.indexOf("export async function sendTripChangedForCollaboratorEmail"),
    EMAIL.indexOf("export async function sendPasswordResetEmail"),
  );

  it("does not tell them to change somebody else's sharing settings", () => {
    // The owner's version offers to take the permission back, which is true
    // for them and nonsense to a fellow collaborator — they cannot change
    // anybody's access, and telling them they can is worse than saying
    // nothing.
    assert.doesNotMatch(fn, /you gave them permission/i);
    assert.doesNotMatch(fn, /sharing settings/i);
  });

  it("escapes everything a person supplied", () => {
    for (const value of ["opts.fromName", "opts.tripTitle", "opts.summary", "opts.url"]) {
      assert.match(fn, new RegExp(`escapeHtml\\(${value.replace(".", "\\.")}`), `${value} must be escaped`);
    }
  });
});
