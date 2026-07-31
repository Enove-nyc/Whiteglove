import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ADMIN_AREAS,
  areaForPath,
  canOpen,
  describeAreas,
  grantedAreas,
  mayUse,
  refusalFor,
} from "@/lib/admin-permissions";

/**
 * Restricting an administrator to part of the admin.
 *
 * Until now "admin" was one grant covering everything: a helper entering
 * kevarim also got the finances, the passwords, every visitor's email and
 * phone number, and the switch that closes the site. So the owner's real
 * choice was to hand over all of it or do it himself.
 *
 * Two things have to be right. The narrowing must never happen by accident —
 * every administrator granted before this existed has nothing stored, and a
 * deploy that locked them out would be worse than the problem. And the screens
 * have to be covered: an area map with a hole in it is a restriction that does
 * not restrict.
 */

describe("which area a screen belongs to", () => {
  it("knows the obvious ones", () => {
    assert.equal(areaForPath("/admin/kevarim"), "directory");
    assert.equal(areaForPath("/admin/finances"), "money");
    assert.equal(areaForPath("/admin/photos"), "content");
    assert.equal(areaForPath("/admin/advertisements"), "advertisements");
    assert.equal(areaForPath("/admin/team"), "access");
  });

  it("follows a screen down into its own pages", () => {
    assert.equal(areaForPath("/admin/settings/passwords"), "access");
    assert.equal(areaForPath("/admin/directory/businesses"), "directory");
    assert.equal(areaForPath("/admin/kevarim/edit/rebbe-elimelech"), "directory");
  });

  it("does not let a shorter prefix win over a longer one", () => {
    // "/admin/directory" is a prefix of the string "/admin/directory-listings"
    // but not of the PATH, and getting that wrong would file the listings
    // screen under the wrong area — or, with a hyphen the other way round,
    // open a screen to somebody who was never given it.
    assert.equal(areaForPath("/admin/directory-listings"), "directory");
    assert.equal(areaForPath("/admin/contentious"), null);
    assert.equal(areaForPath("/admin/teamwork"), null);
  });

  it("puts the dashboard and anything unfiled in no area at all", () => {
    assert.equal(areaForPath("/admin"), null);
    assert.equal(areaForPath("/admin/login"), null);
    assert.equal(areaForPath("/admin/something-added-next-year"), null);
  });

  it("does not care about a trailing slash", () => {
    assert.equal(areaForPath("/admin/kevarim/"), "directory");
    assert.equal(areaForPath("/admin/"), null);
  });
});

describe("reading a stored grant", () => {
  it("treats nothing stored as unrestricted", () => {
    // Every administrator who exists today. This is the case that must not
    // change behaviour.
    assert.equal(grantedAreas(undefined), null);
    assert.equal(grantedAreas(null), null);
    assert.equal(grantedAreas([]), null);
  });

  it("treats all five as unrestricted too", () => {
    // Otherwise somebody who ticked every box would be refused a screen that
    // has not been filed under an area — stricter than the owner asked for.
    assert.equal(grantedAreas([...ADMIN_AREAS]), null);
  });

  it("keeps a real narrowing", () => {
    assert.deepEqual(grantedAreas(["directory"]), ["directory"]);
    assert.deepEqual(grantedAreas(["content", "directory"]), ["content", "directory"]);
  });

  it("returns them in a fixed order, whatever order they were stored in", () => {
    assert.deepEqual(grantedAreas(["directory", "content"]), ["content", "directory"]);
  });

  it("drops a word nobody recognises rather than trusting it", () => {
    assert.deepEqual(grantedAreas(["directory", "everything"]), ["directory"]);
    assert.equal(grantedAreas(["everything"]), null, "and a list of only nonsense grants no narrowing, not a lock-out");
  });

  it("ignores a duplicate", () => {
    assert.deepEqual(grantedAreas(["money", "money"]), ["money"]);
  });
});

describe("may they use this area", () => {
  it("lets an unrestricted person use all of them", () => {
    for (const area of ADMIN_AREAS) assert.equal(mayUse(null, area), true);
  });

  it("lets a narrowed person use only theirs", () => {
    assert.equal(mayUse(["directory"], "directory"), true);
    assert.equal(mayUse(["directory"], "money"), false);
    assert.equal(mayUse(["directory"], "access"), false);
  });
});

describe("may they open this screen", () => {
  const helper = grantedAreas(["directory"]);

  it("opens what they were given", () => {
    assert.equal(canOpen(helper, "/admin/kevarim"), true);
    assert.equal(canOpen(helper, "/admin/shomrim"), true);
    assert.equal(canOpen(helper, "/admin/directory/businesses"), true);
  });

  it("shuts the rest — including the money and the way in", () => {
    assert.equal(canOpen(helper, "/admin/finances"), false);
    assert.equal(canOpen(helper, "/admin/settings/passwords"), false);
    assert.equal(canOpen(helper, "/admin/accounts"), false);
    assert.equal(canOpen(helper, "/admin/team"), false);
    assert.equal(canOpen(helper, "/admin/advertisements"), false);
  });

  it("always opens the dashboard and the sign-in", () => {
    // One is where they land; refusing the other would mean they could never
    // sign in at all.
    assert.equal(canOpen(helper, "/admin"), true);
    assert.equal(canOpen(helper, "/admin/login"), true);
  });

  it("shuts a screen that belongs to no area", () => {
    // The safe direction for anything added later and not filed.
    assert.equal(canOpen(helper, "/admin/something-added-next-year"), false);
    assert.equal(canOpen(null, "/admin/something-added-next-year"), true);
  });

  it("opens everything for somebody unrestricted", () => {
    assert.equal(canOpen(null, "/admin/finances"), true);
    assert.equal(canOpen(null, "/admin/settings/passwords"), true);
  });
});

describe("what it says", () => {
  it("names the door, and never says 'not found'", () => {
    assert.match(refusalFor("money"), /^Money is not part of/);
    assert.match(refusalFor(null), /^This screen is not part of/);
    for (const area of ADMIN_AREAS) assert.doesNotMatch(refusalFor(area), /not found/i);
  });

  it("says 'everything' rather than listing five", () => {
    assert.equal(describeAreas(null), "Everything in the admin");
    assert.equal(describeAreas(["directory"]), "Places and kevarim");
    assert.match(describeAreas(["content", "money"]), /Words and pictures · Money/);
  });
});

/**
 * The map has to cover the admin.
 *
 * areaForPath decides from a list written by hand. A folder added later and
 * not added to that list belongs to no area, which means a narrowed helper is
 * refused it — safe — but it also means nobody notices the list has gone
 * stale, and the next hand-written entry is guessed rather than checked.
 *
 * The gate is the other half: it lives in a layout inside each folder, because
 * a server layout is not told which path it is rendering and the one-place
 * version would have to be handed the path by the middleware. A folder with no
 * layout has no gate at all.
 */
describe("every admin folder", () => {
  const adminDir = path.join(process.cwd(), "app", "admin");
  const folders = readdirSync(adminDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("("))
    .map((entry) => entry.name)
    // The sign-in screen is open to everybody by definition.
    .filter((name) => name !== "login");

  it("found some, so the walk itself is not silently passing", () => {
    assert.ok(folders.length > 10, `expected the admin to have many folders, found ${folders.length}`);
  });

  for (const folder of folders) {
    it(`${folder} is filed under an area and gated by it`, () => {
      const area = areaForPath(`/admin/${folder}`);
      assert.ok(area, `app/admin/${folder} is in no area — add it to AREA_PATHS in lib/admin-permissions.ts`);

      const layout = path.join(adminDir, folder, "layout.tsx");
      let source: string;
      try {
        source = readFileSync(layout, "utf8");
      } catch {
        assert.fail(`app/admin/${folder} has no layout.tsx, so nothing checks the area before its screens render`);
      }
      assert.match(
        source,
        new RegExp(`<AreaGate area="${area}"`),
        `app/admin/${folder}/layout.tsx does not gate on "${area}", which is the area its path is filed under`,
      );
    });
  }
});
