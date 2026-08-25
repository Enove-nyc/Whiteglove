import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { emptyItinerary, type ItinActivity, type Itinerary } from "@/data/itinerary";
import {
  addStop,
  daysOf,
  describeEdits,
  editStop,
  moveToDay,
  moveWithinDay,
  newStopId,
  NO_DATE,
  removeStop,
  withDays,
} from "@/lib/shared-trip-edit";

/**
 * Changing somebody else's trip, when they said you could.
 *
 * "Can edit" was offered on the sharing screen, honoured by the server, and
 * reachable from nowhere: the endpoint that enforces it was called by nothing
 * in the entire site. Somebody granted it read "You can change it" and got the
 * same read-only page a viewer gets.
 *
 * These are the rules behind the panel that closes that. They matter more than
 * most because every one of them writes to a trip belonging to somebody who is
 * not in the room.
 */

function stop(over: Partial<ItinActivity> = {}): ItinActivity {
  return { id: "s1", name: "Lizhensk", date: "2026-06-10", ...over } as ItinActivity;
}

function trip(activities: ItinActivity[]): Itinerary {
  return { ...emptyItinerary(), activities };
}

describe("the days an editor sees", () => {
  it("groups by date and keeps undated stops last, never dropping them", () => {
    // An undated stop is one still to be placed. Sorting it first would put
    // the unplanned thing at the top of somebody's trip; dropping it would
    // delete a stop the owner had entered.
    const days = daysOf(trip([stop({ id: "a" }), stop({ id: "b", date: "" }), stop({ id: "c", date: "2026-06-09" })]));
    assert.deepEqual(days.map((d) => d.date), ["2026-06-09", "2026-06-10", NO_DATE]);
    assert.equal(days.flatMap((d) => d.stops).length, 3);
  });

  it("orders a day by its stored order, then by time", () => {
    const days = daysOf(
      trip([
        stop({ id: "late", startTime: "16:00" }),
        stop({ id: "early", startTime: "09:00" }),
        stop({ id: "first", order: 0, startTime: "23:00" }),
      ]),
    );
    assert.deepEqual(days[0].stops.map((s) => s.id), ["first", "early", "late"]);
  });

  it("does not shuffle a trip where nobody has ever reordered anything", () => {
    // Every stop with no order and no time must come back the way the owner
    // sees it. Sorting on a missing field is how opening a panel silently
    // rearranges somebody's day.
    const ids = ["one", "two", "three"];
    const days = daysOf(trip(ids.map((id) => stop({ id }))));
    assert.deepEqual(days[0].stops.map((s) => s.id), ids);
  });
});

describe("writing the days back", () => {
  it("stamps each stop's position, or a reorder does not survive the save", () => {
    // THE BUG THIS PREVENTS. Two stops with no order come back sorted by time,
    // which is exactly what somebody was overriding when they moved one. Save
    // without stamping and the trip looks unchanged on reload.
    const days = daysOf(trip([stop({ id: "a", startTime: "09:00" }), stop({ id: "b", startTime: "16:00" })]));
    const moved = moveWithinDay(days, "2026-06-10", "b", -1);
    const after = withDays(trip([]), moved);
    assert.deepEqual(after.activities?.map((s) => [s.id, s.order]), [["b", 0], ["a", 1]]);
  });

  it("writes each stop's date from the day it sits on", () => {
    const days = daysOf(trip([stop({ id: "a" }), stop({ id: "b", date: "2026-06-11" })]));
    const after = withDays(trip([]), moveToDay(days, "a", "2026-06-11"));
    assert.equal(after.activities?.find((s) => s.id === "a")?.date, "2026-06-11");
  });

  it("leaves everything else on the itinerary alone", () => {
    // An editor is changing stops. Flights, lodging, the title and the dates
    // are the owner's, and a save that quietly rewrote them would be the
    // feature doing something nobody asked for.
    const original = { ...trip([stop()]), title: "Poland", startDate: "2026-06-09", endDate: "2026-06-14" };
    const after = withDays(original, daysOf(original));
    assert.equal(after.title, "Poland");
    assert.equal(after.startDate, "2026-06-09");
    assert.equal(after.endDate, "2026-06-14");
  });
});

describe("moving a stop", () => {
  const days = () => daysOf(trip([stop({ id: "a" }), stop({ id: "b" }), stop({ id: "c", date: "2026-06-11" })]));

  it("swaps within the day", () => {
    assert.deepEqual(moveWithinDay(days(), "2026-06-10", "b", -1)[0].stops.map((s) => s.id), ["b", "a"]);
  });

  it("refuses to move past either end rather than wrapping around", () => {
    assert.deepEqual(moveWithinDay(days(), "2026-06-10", "a", -1)[0].stops.map((s) => s.id), ["a", "b"]);
    assert.deepEqual(moveWithinDay(days(), "2026-06-10", "b", 1)[0].stops.map((s) => s.id), ["a", "b"]);
  });

  it("moves to another day, onto the end of it", () => {
    const after = moveToDay(days(), "a", "2026-06-11");
    assert.deepEqual(after.find((d) => d.date === "2026-06-10")?.stops.map((s) => s.id), ["b"]);
    assert.deepEqual(after.find((d) => d.date === "2026-06-11")?.stops.map((s) => s.id), ["c", "a"]);
  });

  it("will not send a stop to a day that is not on the trip", () => {
    // Otherwise a mistyped or stale value removes it from the day it is on and
    // puts it nowhere — a deletion dressed as a move.
    const after = moveToDay(days(), "a", "2029-01-01");
    assert.equal(after.flatMap((d) => d.stops).length, 3);
    assert.ok(after.some((d) => d.stops.some((s) => s.id === "a")));
  });

  it("moving to the day it is already on changes nothing", () => {
    const after = moveToDay(days(), "a", "2026-06-10");
    assert.deepEqual(after.flatMap((d) => d.stops).map((s) => s.id).sort(), ["a", "b", "c"]);
  });
});

describe("editing and adding", () => {
  it("changes only the three fields an editor may touch", () => {
    const days = daysOf(trip([stop({ keverSlug: "lizhensk", phone: "+48 111", coordinates: "50,22" })]));
    const after = withDays(trip([]), editStop(days, "s1", { name: "Lizhensk — morning" }));
    const changed = after.activities?.[0];
    assert.equal(changed?.name, "Lizhensk — morning");
    // The record it came from, and how to reach it, are not an editor's to
    // rewrite through a text box.
    assert.equal(changed?.keverSlug, "lizhensk");
    assert.equal(changed?.phone, "+48 111");
    assert.equal(changed?.coordinates, "50,22");
  });

  it("an emptied time or note is removed rather than stored as an empty string", () => {
    const days = daysOf(trip([stop({ startTime: "09:00", notes: "bring a key" })]));
    const after = withDays(trip([]), editStop(days, "s1", { startTime: "  ", notes: "" }));
    assert.equal(after.activities?.[0].startTime, undefined);
    assert.equal(after.activities?.[0].notes, undefined);
  });

  it("adds a stop to a real day, and refuses a blank name or an unknown day", () => {
    const days = daysOf(trip([stop()]));
    assert.equal(addStop(days, "2026-06-10", "Uman", "new-1")[0].stops.length, 2);
    assert.equal(addStop(days, "2026-06-10", "   ", "new-2")[0].stops.length, 1);
    assert.equal(addStop(days, "2029-01-01", "Uman", "new-3").flatMap((d) => d.stops).length, 1);
  });

  it("marks an added stop's id as coming from a collaborator", () => {
    // The owner opening their own planner should be able to tell that somebody
    // else put it there, and the id is the one field that survives every round
    // trip through the endpoint.
    assert.match(newStopId(() => "abc"), /^shared-/);
  });

  it("removes a stop without touching the others", () => {
    const days = daysOf(trip([stop({ id: "a" }), stop({ id: "b" })]));
    assert.deepEqual(removeStop(days, "a")[0].stops.map((s) => s.id), ["b"]);
  });

  it("never mutates what it was given", () => {
    // A failed save must leave the editor's screen as it was, rather than
    // showing changes that were never stored.
    const before = daysOf(trip([stop({ id: "a" }), stop({ id: "b" })]));
    const snapshot = JSON.stringify(before);
    removeStop(before, "a");
    moveWithinDay(before, "2026-06-10", "b", -1);
    editStop(before, "a", { name: "changed" });
    addStop(before, "2026-06-10", "Uman", "x");
    assert.equal(JSON.stringify(before), snapshot);
  });
});

describe("what the editor is shown before they save", () => {
  it("counts what actually changed", () => {
    const before = trip([stop({ id: "a" }), stop({ id: "b" })]);
    const days = daysOf(before);
    const after = withDays(before, addStop(removeStop(editStop(days, "a", { name: "New name" }), "b"), "2026-06-10", "Uman", "n1"));
    const said = describeEdits(before, after);
    assert.match(said, /1 stop added/);
    assert.match(said, /1 removed/);
    assert.match(said, /1 changed/);
  });

  it("says nothing changed when nothing has", () => {
    // FOUND BY THIS TEST. withDays stamps `order` on every stop, because that
    // is the only thing that makes a reorder survive a save — so comparing the
    // raw field reported a move for every stop that never had one. Opening the
    // panel and touching nothing said "1 moved" and offered a save: untrue,
    // and a needless write to somebody else's trip.
    const before = trip([stop()]);
    assert.equal(describeEdits(before, withDays(before, daysOf(before))), "Nothing changed yet");
  });

  it("still reports a real move, now that it is judged by position", () => {
    const before = trip([stop({ id: "a" }), stop({ id: "b" })]);
    const moved = withDays(before, moveWithinDay(daysOf(before), "2026-06-10", "b", -1));
    assert.match(describeEdits(before, moved), /moved/);
  });

  it("reports a move between days", () => {
    const before = trip([stop({ id: "a" }), stop({ id: "c", date: "2026-06-11" })]);
    const moved = withDays(before, moveToDay(daysOf(before), "a", "2026-06-11"));
    assert.match(describeEdits(before, moved), /1 moved/);
  });
});

describe("the panel and the endpoint", () => {
  const PANEL = readFileSync("components/SharedTripEditor.tsx", "utf8");
  const ROUTE = readFileSync("app/api/account/itinerary/shared/route.ts", "utf8");
  const PAGE = readFileSync("app/i/[shareId]/page.tsx", "utf8");

  it("is on the shared page at all — the thing that was missing", () => {
    // The whole defect: a role the server honoured and no screen ever used.
    assert.match(PAGE, /<SharedTripEditor shareId=\{shareId\}/);
  });

  it("shows nothing unless the SERVER says this person may edit", () => {
    // The browser is exactly where somebody would claim to be an editor.
    assert.match(PANEL, /if \(!data\.itinerary \|\| !data\.canEdit\) return null;/);
    assert.match(PANEL, /if \(!loaded \|\| !days\) return null;/);
  });

  it("refuses a save over a trip that moved underneath it", () => {
    // Two people can be in one trip at once — that is what an editor IS.
    // Without this, whoever saves last silently wins: the owner adds four
    // stops, an editor saves a copy fetched before any of them, and the four
    // are gone with nothing said to either of them.
    assert.match(PANEL, /expectedUpdatedAt: loaded\.itinerary\.updatedAt/);
    assert.match(ROUTE, /kept\.itinerary\.updatedAt !== body\.expectedUpdatedAt/);
    assert.match(ROUTE, /staleCopy: true/);
    assert.match(ROUTE, /status: 409/);
  });

  it("reloads rather than retrying blindly when the copy was stale", () => {
    assert.match(PANEL, /if \(data\?\.staleCopy\) await reload\(\);/);
  });

  it("still merges the owner's attachments back on every save", () => {
    // Pre-existing and the reason an editor could never have been given the
    // raw endpoint: they hold a copy with no boarding passes, so saving it
    // as-is would delete the owner's own.
    assert.match(ROUTE, /mergeKeepingAttachments\(kept\.itinerary, body\.itinerary\)/);
  });

  it("still refuses a non-editor at the endpoint, not only in the panel", () => {
    assert.match(ROUTE, /if \(!found\.access\.canEdit\)/);
    assert.match(ROUTE, /status: 403/);
  });
});
