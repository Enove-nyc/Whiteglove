import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  describeSave,
  FAILED,
  OFFLINE,
  SAVED,
  SAVED_FOR_MS,
  SAVING,
  saveJson,
  saveOutcome,
  saveProblem,
  saveWentWrong,
} from "@/lib/save-state";

/**
 * WHAT A SAVE SAYS, AND — THE REAL BUG — THAT IT SAYS ANYTHING AT ALL.
 *
 * Counting the site's own words is what found this. "Saving…" appeared
 * sixty-four times across the components and "Saved." eight, so most saves
 * here went busy, came back, and never confirmed themselves. There were six
 * different sentences for one failure. And nothing outside the client app knew
 * the device had lost its connection, so a save attempted with no signal
 * blamed the site.
 *
 * Underneath all of that was something worse than wording. Most of these
 * handlers were written as a bare `await fetch(...)` with no try around it.
 * fetch REJECTS when the request never reaches a server, a rejection inside an
 * async click handler goes nowhere, and the setSaving(false) after it never
 * runs — so the button reads "Saving…" until the page is reloaded, with no
 * message, on exactly the connections this site is used on.
 */

/**
 * Every `await fetch(` in a file that no try{} is open over.
 *
 * Brace depth rather than a look for the word "try", because the property that
 * matters is whether a try is STILL OPEN at that point — a try that closed two
 * functions ago catches nothing, and a `.catch()` chained on the call is fine.
 * The same reasoning as the capped-grid rule's nesting check.
 *
 * Comments must already be stripped, or a `try` inside prose counts.
 */
function unguardedFetches(source: string): string[] {
  const lines = source.split("\n");
  const out: string[] = [];
  const openTries: number[] = [];
  let depth = 0;

  for (const line of lines) {
    for (let i = 0; i < line.length; i += 1) {
      if (line.startsWith("await fetch(", i)) {
        // Chained .catch() on the call itself is a guard of its own.
        const rest = line.slice(i);
        if (!openTries.length && !/\)\s*\.catch\(|\.catch\(/.test(rest)) out.push(line.trim().slice(0, 80));
      }
      if (line[i] === "{") {
        depth += 1;
        // A `try` immediately before this brace opens a guarded region.
        if (/\btry\s*$/.test(line.slice(0, i))) openTries.push(depth);
      } else if (line[i] === "}") {
        if (openTries.length && openTries[openTries.length - 1] === depth) openTries.pop();
        depth -= 1;
      }
    }
  }
  return out;
}

describe("the four sentences", () => {
  it("has one of each, and they are not the same sentence", () => {
    const all = [SAVING, SAVED, OFFLINE, FAILED];
    assert.equal(new Set(all).size, 4);
    for (const said of all) assert.ok(said.length > 3);
  });

  it("says offline as a fact about the device, not a fault of the site", () => {
    // "Could not save" reads as the site being broken or the work being lost,
    // and earns a second and third press of the same button.
    assert.match(OFFLINE, /offline/i);
    assert.doesNotMatch(OFFLINE, /error|failed|wrong|sorry/i);
  });

  it("prints nothing at all while idle", () => {
    // So a form nobody has touched carries no empty line under it.
    assert.equal(describeSave({ kind: "idle" }), null);
  });

  it("prints each of the others", () => {
    assert.equal(describeSave({ kind: "saving" }), SAVING);
    assert.equal(describeSave({ kind: "saved" }), SAVED);
    assert.equal(describeSave({ kind: "offline" }), OFFLINE);
    assert.equal(describeSave({ kind: "failed", message: "Nope." }), "Nope.");
  });

  it("counts offline as something having gone wrong, because nothing saved", () => {
    assert.equal(saveWentWrong({ kind: "offline" }), true);
    assert.equal(saveWentWrong({ kind: "failed", message: "x" }), true);
    assert.equal(saveWentWrong({ kind: "saved" }), false);
    assert.equal(saveWentWrong({ kind: "saving" }), false);
  });

  it("clears the confirmation after a few seconds, and not instantly", () => {
    // Long enough to be read by somebody who looked away as they pressed;
    // short enough that a stale "Saved." is not sitting over the next edit.
    assert.ok(SAVED_FOR_MS >= 2000 && SAVED_FOR_MS <= 8000);
  });
});

describe("working out which of them applies", () => {
  it("says saved when it saved", () => {
    assert.deepEqual(saveOutcome({ ok: true }), { kind: "saved" });
  });

  it("PUTS OFFLINE FIRST, ahead of anything the response said", () => {
    // It is the one cause the visitor can do something about, and the only one
    // where pressing the button again now is guaranteed to do nothing.
    assert.deepEqual(saveProblem({ online: false, status: 500, serverSaid: "boom" }), { kind: "offline" });
  });

  it("keeps what the route actually said, over the generic sentence", () => {
    // A name already taken, a plan's limit reached, a field the form got
    // wrong. This is a floor, not a gag.
    assert.deepEqual(saveProblem({ status: 400, serverSaid: "That name is taken." }), {
      kind: "failed",
      message: "That name is taken.",
    });
  });

  it("ignores an empty or blank server sentence rather than showing it", () => {
    assert.equal(saveProblem({ status: 500, serverSaid: "   " }).kind, "failed");
    assert.deepEqual(saveProblem({ status: 500, serverSaid: "  " }), { kind: "failed", message: FAILED });
  });

  it("does NOT tell a signed-out visitor to try again", () => {
    // Pressing it again produces the identical nothing. The session ended
    // while the tab sat open, which happens whenever the session secret or the
    // admin password changes.
    const said = saveProblem({ status: 401 });
    assert.match(said.kind === "failed" ? said.message : "", /sign in again/i);
    assert.doesNotMatch(said.kind === "failed" ? said.message : "", /try again/i);
  });

  it("assumes online when nobody said, rather than guessing offline", () => {
    // A wrong "you are offline" is worse than a generic failure: it sends
    // somebody to check their wifi when the fault is ours.
    assert.deepEqual(saveProblem({ status: 500 }), { kind: "failed", message: FAILED });
  });
});

describe("the save that cannot throw", () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const withFetch = async <T>(impl: typeof fetch, run: () => Promise<T>): Promise<T> => {
    const real = globalThis.fetch;
    globalThis.fetch = impl;
    try {
      return await run();
    } finally {
      globalThis.fetch = real;
    }
  };

  it("returns the body on success", async () => {
    const result = await withFetch(
      async () => json({ tripName: "Rome" }),
      () => saveJson<{ tripName: string }>("/x", { method: "POST" }, true),
    );
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.data?.tripName, "Rome");
  });

  it("RETURNS the failure rather than throwing it, when fetch rejects", async () => {
    // This is the whole point. A thrown rejection inside an async click
    // handler goes nowhere and the button never comes back.
    const result = await withFetch(
      async () => {
        throw new TypeError("Failed to fetch");
      },
      () => saveJson("/x", { method: "POST" }, false),
    );
    assert.equal(result.ok, false);
    assert.deepEqual(result.ok === false && result.state, { kind: "offline" });
  });

  it("does not blame the signal when the device says it is online", async () => {
    const result = await withFetch(
      async () => {
        throw new TypeError("Failed to fetch");
      },
      () => saveJson("/x", { method: "POST" }, true),
    );
    assert.equal(result.ok === false && result.state.kind, "failed");
  });

  it("KEEPS THE BODY OF A REFUSAL, which is sometimes the useful part", async () => {
    // The sign-in form's example: an unverified account is refused WITH
    // verificationRequired, and the form switches to the code screen off that
    // flag. Throwing the body away turns that into "please try again".
    const result = await withFetch(
      async () => json({ error: "Verify your email first.", verificationRequired: true }, 403),
      () => saveJson<{ verificationRequired?: boolean }>("/x", { method: "POST" }, true),
    );
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.data?.verificationRequired, true);
    assert.equal(result.ok === false && result.state.kind === "failed" && result.state.message, "Verify your email first.");
  });

  it("survives a response that is not JSON at all", async () => {
    const result = await withFetch(
      async () => new Response("<html>502</html>", { status: 502 }),
      () => saveJson("/x", { method: "POST" }, true),
    );
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.state.kind === "failed" && result.state.message, FAILED);
  });
});

describe("the surfaces a traveller actually saves from", () => {
  /**
   * Named one by one rather than by a scan, because these are the ones somebody
   * uses on a phone, abroad, on a connection that is not theirs — which is the
   * case the bare `await fetch` handled worst. A scan would also drift: the
   * point is not that some file somewhere is safe, it is that each of THESE is.
   *
   * The rest of the site still has the old shape in places, mostly on admin
   * screens the owner uses on his own desk. Those are worth converting and are
   * not what this is holding.
   */
  const converted = [
    ["components/useAddToItinerary.tsx", "putting a place on a trip"],
    ["components/AccountSettings.tsx", "your name, email and picture"],
    ["components/reviews/ReviewForm.tsx", "leaving a rating"],
    ["components/TripComments.tsx", "commenting on a shared trip"],
    ["components/TripGroupTools.tsx", "voting on a shared trip"],
    ["components/SendPlaceIn.tsx", "sending a place in"],
    ["components/LoginForm.tsx", "signing in"],
  ] as const;

  for (const [file, what] of converted) {
    it(`${what} cannot leave a button stuck`, () => {
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      assert.match(source, /saveJson|OFFLINE/, `${file} no longer goes through lib/save-state.ts`);
      for (const line of unguardedFetches(source)) {
        assert.fail(`${file} has an awaited fetch with nothing to catch it: ${line}`);
      }
    });
  }

  it("tells the visitor the connection went, not that the site broke", () => {
    // The three suitcase surfaces all printed "That did not save — try again"
    // from a bare failure kind. The phase carries the right sentence now.
    for (const file of ["components/DetailActionRow.tsx", "components/DestinationActions.tsx", "components/AddToItineraryButton.tsx"]) {
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      assert.match(source, /phase\.message/, `${file} writes its own failure sentence again`);
    }
    assert.match(readFileSync("components/useAddToItinerary.tsx", "utf8"), /online \? FAILED : OFFLINE/);
  });
});
