import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ADMIN_ACTION_KINDS,
  ADMIN_ACTION_WORDS,
  describeAction,
  describeActor,
  isWeighty,
  KEEP_DAYS,
  stillLogged,
  type AdminAction,
} from "@/lib/admin-actions";

/**
 * Who changed the locks.
 *
 * The site had two logs and neither answered this. The sign-in log says who
 * came in; the change log says what a page says and what it said before.
 * Between them sat every action somebody takes when they should not be there
 * at all — granting an account the finances, changing the site password,
 * turning two-factor off — leaving no trace in either.
 *
 * Two-factor without this is half a control: a second factor anybody through
 * the door can quietly remove, with nothing recording that they did.
 */

const STORE = readFileSync("lib/admin-actions-store.ts", "utf8");
const LOG = readFileSync("lib/admin-actions.ts", "utf8");
const PAGE = readFileSync("app/admin/settings/security/page.tsx", "utf8");

function action(over: Partial<AdminAction> = {}): AdminAction {
  return { at: "2026-08-25T10:00:00.000Z", actor: { how: "account", email: "helper@example.com" }, kind: "access-granted", ...over };
}

describe("the record cannot be tidied away by whoever is in it", () => {
  it("has no clear function at all", () => {
    // THE ONE THAT MAKES IT AN AUDIT LOG. The sign-in log has a "forget these"
    // button, which is right for a list of visits and exactly wrong here: a
    // record the recorded party can erase is not a record.
    assert.doesNotMatch(STORE, /export async function clear/i);
    assert.doesNotMatch(STORE, /\bdel\//, "nothing here may delete the list");
  });

  it("offers no control for it on the screen either", () => {
    // A control, not the word — the copy on that panel says in so many words
    // that there is deliberately no way to clear this.
    const section = PAGE.slice(PAGE.indexOf("admin-actions-heading"));
    assert.doesNotMatch(section, /<button|<form|onClick/);
  });

  it("caps the list rather than emptying it", () => {
    assert.match(STORE, /ltrim\/\$\{encodeURIComponent\(KEY\)\}\/0\/\$\{KEEP_COUNT - 1\}/);
  });
});

describe("who did it comes from the session, never from the caller", () => {
  it("reads the actor through currentAdmin and takes no name as an argument", () => {
    // An audit log that lets the caller say who it was records whatever the
    // caller claims, which is worse than no log: it will confidently name the
    // wrong person.
    assert.match(STORE, /export async function currentActor/);
    assert.match(STORE, /const \{ identity \} = await currentAdmin\(\)/);
    const record = STORE.slice(STORE.indexOf("export async function recordAdminAction"));
    assert.doesNotMatch(record.slice(0, 400), /actor[?]?:\s*AdminActor/, "recordAdminAction must not accept an actor");
  });

  it("records nothing rather than recording 'unknown'", () => {
    const record = STORE.slice(STORE.indexOf("export async function recordAdminAction"));
    assert.match(record, /if \(!actor\) return;/);
  });

  it("names the shared password as itself rather than leaving a blank", () => {
    // A blank reads as "we do not know". The truth is "we do know, and it is
    // nobody in particular", which is a different and more useful thing.
    assert.equal(describeActor({ how: "shared" }), "Somebody with the shared password");
    assert.equal(describeActor({ how: "account", email: "a@b.com" }), "a@b.com");
  });
});

describe("recording never breaks the thing it records", () => {
  it("swallows its own failures", () => {
    // Somebody removing a compromised account's access, with the store having
    // a bad minute, must still have removed it. A missing line is bad; a grant
    // that silently did not happen is worse and is discovered at the worst
    // possible moment.
    const record = STORE.slice(STORE.indexOf("export async function recordAdminAction"), STORE.indexOf("/**\n * Newest first"));
    assert.match(record, /try \{/);
    assert.match(record, /\} catch \{/);
  });

  it("is called AFTER the action succeeded, at every site", () => {
    // A log of attempts would say somebody removed an account when the write
    // had failed.
    const cases: Array<[string, RegExp]> = [
      ["app/api/admin/two-factor/route.ts", /if \(!result\.ok\) return[^]*?recordAdminAction\(\{ kind: "two-factor-on"/],
      ["app/api/admin/site-lock/route.ts", /if \(!saved\) return[^]*?recordAdminAction/],
      ["app/api/admin/password/route.ts", /if \(!result\.ok\) \{[^]*?\}\s*[^]*?recordAdminAction/],
      ["app/admin/team/actions.ts", /if \(result\.ok\) \{\s*await recordAdminAction/],
    ];
    for (const [file, pattern] of cases) {
      assert.match(readFileSync(file, "utf8"), pattern, `${file} should record only after the action succeeded`);
    }
  });
});

describe("every action that changes who can get in is recorded", () => {
  it("covers turning two-factor off — the most important line here", () => {
    const src = readFileSync("app/api/admin/two-factor/route.ts", "utf8");
    assert.match(src, /kind: "two-factor-off"/);
    assert.match(src, /kind: "two-factor-on"/);
    assert.match(src, /kind: "recovery-codes-new"/);
  });

  it("covers granting, changing and removing access", () => {
    const src = readFileSync("app/admin/team/actions.ts", "utf8");
    assert.match(src, /kind: existed \? "access-changed" : "access-granted"/);
    assert.match(src, /kind: "access-removed"/);
    // Read before the write, or a new grant and an adjustment are the same
    // line afterwards.
    assert.ok(src.indexOf("const existed") < src.indexOf("await saveTeamMember"));
  });

  it("covers passwords, without ever carrying one", () => {
    // A log naming the scope answers "who changed the admin code last
    // Tuesday". One carrying the value would be a list of every password the
    // site has ever had, sitting in the store.
    const src = readFileSync("app/api/admin/password/route.ts", "utf8");
    assert.match(src, /kind: "password-changed"/);
    assert.doesNotMatch(src, /recordAdminAction\([^)]*newPassword/);
    assert.doesNotMatch(src, /detail:[^\n]*[Pp]assword\s*\}/);
  });

  it("covers closing and opening the site", () => {
    const src = readFileSync("app/api/admin/site-lock/route.ts", "utf8");
    assert.match(src, /kind: body\.locked \? "site-closed" : "site-opened"/);
  });

  it("records the clearing of the OTHER log, in the one that cannot be cleared", () => {
    // Otherwise the single action that erases the evidence is the one action
    // that leaves none.
    const src = readFileSync("app/api/admin/access-log/route.ts", "utf8");
    assert.match(src, /kind: "signin-log-cleared"/);
    assert.match(src, /kind: "sessions-revoked"/);
  });

  /**
   * MATCHED BY MODULE, NOT BY NAME, and that is not fussiness.
   *
   * `removeTeamMember` exists twice and means two different things:
   * lib/admin-roles' one takes away somebody's access to THIS SITE, and
   * lib/account-store's one removes a staff login from an ADVISOR's own
   * business account. The first belongs in this log; the second is a
   * customer's own housekeeping and would fill the owner's security screen
   * with other people's staff changes. A sweep matching the bare name flags
   * the wrong file and teaches whoever sees it to loosen the rule.
   */
  const ADMIN_CHANGERS: Array<[module: string, call: RegExp]> = [
    ["@/lib/admin-roles", /\b(saveTeamMember|removeTeamMember)\(/],
    ["@/lib/access-passwords", /\bsetAccessPassword\(/],
    ["@/lib/signin-log", /\b(revokeAllAccess|clearSignIns)\(/],
    ["@/lib/site-analytics", /\bsetSiteLock\(/],
    ["@/lib/admin-2fa-store", /\bclearTwoFactor\(/],
  ];

  it("finds no admin route changing access that forgets to record", () => {
    const offenders: string[] = [];
    let checked = 0;
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry)) continue;
        const src = readFileSync(full, "utf8");
        const changes = ADMIN_CHANGERS.some(([module, call]) => src.includes(`from "${module}"`) && call.test(src));
        if (!changes) continue;
        checked += 1;
        if (!src.includes("recordAdminAction")) offenders.push(full);
      }
    };
    walk("app");
    assert.ok(checked >= 4, `expected to find the routes that change access, checked ${checked}`);
    assert.deepEqual(offenders, [], `these change who can get in without recording it: ${offenders.join(", ")}`);
  });
});

describe("what a line says", () => {
  it("reads as a sentence about a person", () => {
    assert.equal(
      describeAction(action({ kind: "two-factor-off", subject: "the shared admin password" })),
      "helper@example.com turned two-factor OFF for the shared admin password.",
    );
    assert.equal(
      describeAction(action({ actor: { how: "shared" }, kind: "site-closed", subject: undefined })),
      "Somebody with the shared password closed the site to the public.",
    );
  });

  it("has words for every kind, so none can render blank", () => {
    for (const kind of ADMIN_ACTION_KINDS) {
      assert.ok(ADMIN_ACTION_WORDS[kind]?.trim(), `${kind} has no words`);
    }
  });

  it("marks the ones worth noticing", () => {
    assert.equal(isWeighty("two-factor-off"), true);
    assert.equal(isWeighty("access-removed"), true);
    assert.equal(isWeighty("two-factor-on"), false, "turning it ON is good news, not a warning");
  });
});

describe("how long a line lasts", () => {
  it("drops anything past the window", () => {
    const now = Date.parse("2026-08-25T00:00:00.000Z");
    const fresh = action({ at: new Date(now - 5 * 86_400_000).toISOString() });
    const old = action({ at: new Date(now - (KEEP_DAYS + 1) * 86_400_000).toISOString() });
    assert.deepEqual(stillLogged([fresh, old], now), [fresh]);
  });

  it("drops a line with an unreadable date rather than showing it forever", () => {
    assert.deepEqual(stillLogged([action({ at: "not a date" })], Date.now()), []);
  });

  it("ages out in the store, not while a page renders", () => {
    // Date.now() during render is not a pure render, and the retention rule
    // belongs with whatever keeps the rows rather than with each screen.
    assert.match(STORE, /return stillLogged\(out, Date\.now\(\)\)/);
    assert.doesNotMatch(PAGE, /Date\.now\(\)/);
  });
});

describe("it says which log this is", () => {
  it("names the other two and what each is for", () => {
    // Three logs answering three questions is only clear if the file says so;
    // otherwise the next person adds a fourth.
    assert.match(LOG, /signin-log/);
    assert.match(LOG, /changes\.ts/);
  });
});
