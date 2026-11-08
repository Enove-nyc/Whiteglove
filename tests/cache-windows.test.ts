import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { BUILT_IN_CONTENT, PURGED_ON_WRITE } from "@/lib/cache-windows";

/**
 * THE SIXTY-SECOND WINDOW WAS A BILL, NOT A FEATURE.
 *
 * Six content routes rebuilt themselves every minute. None of them needed to:
 * every write that changes one of them purges it by name, so an edit appears
 * at once whatever this window says. What the minute actually bought was a
 * rebuild for nearly every crawler request — 43,851 of them in seven days,
 * around the clock, against 809 sitemap addresses — which is what kept the
 * database from ever going idle. Neon bills for being awake.
 *
 * NEXT READS `revalidate` STATICALLY, so each route writes the number out
 * rather than importing it — an imported constant fails the build outright,
 * which is the good version of a config that silently does not apply. This
 * file is the one place the number is explained, and these tests are what hold
 * the six routes to it.
 *
 * THIS FILE IS THE CONTRACT. A long window is only safe while the purge
 * exists. If someone removes a revalidatePath, the page would sit a day out of
 * date and nothing else would say so. So the purge is asserted here, beside
 * the window that depends on it.
 */

const PURGED = [
  // route file                                 the purge that makes its window safe
  ["app/cemeteries/[cemetery]/page.tsx", "app/admin/kevarim/actions.ts", "/cemeteries/${slug}"],
  ["app/[city]/page.tsx", "app/admin/destinations/actions.ts", "/${slug}"],
  ["app/destinations/[destination]/page.tsx", "app/admin/destinations/actions.ts", null],
  ["app/heritage/towns/[place]/page.tsx", "app/admin/destinations/actions.ts", null],
] as const;

const BUILT_IN = ["app/tzaddikim/[person]/page.tsx", "app/tzaddikim/page.tsx"] as const;

describe("the content pages are not rebuilt every minute any more", () => {
  it("the two windows are a day", () => {
    assert.equal(PURGED_ON_WRITE, 86_400);
    assert.equal(BUILT_IN_CONTENT, 86_400);
  });

  for (const [route] of PURGED) {
    it(`${route} takes the purged-on-write window`, () => {
      const src = readFileSync(route, "utf8");
      assert.match(src, /export const revalidate = 86_400;/);
      assert.equal(PURGED_ON_WRITE, 86_400, "the routes write 86_400; this constant must agree");
      // The file says where the rule lives, since the number cannot import it.
      assert.match(src, /lib\/cache-windows\.ts/);
    });
  }

  for (const route of BUILT_IN) {
    it(`${route} takes the built-in-content window`, () => {
      const src = readFileSync(route, "utf8");
      assert.match(src, /export const revalidate = 86_400;/);
      assert.equal(BUILT_IN_CONTENT, 86_400, "the routes write 86_400; this constant must agree");
    });
  }

  it("no content route is left on the old sixty seconds", () => {
    // A route that still rebuilds every minute is either a page nobody purges
    // — which is a bug worth seeing — or one that was missed here.
    const stragglers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(path);
        else if (entry.name === "page.tsx" && /export const revalidate = 60;/.test(readFileSync(path, "utf8"))) {
          stragglers.push(path);
        }
      }
    };
    walk("app");
    assert.deepEqual(stragglers, [], `still rebuilding every minute: ${stragglers.join(", ")}`);
  });
});

describe("a page only gets the long window because something purges it", () => {
  for (const [route, action] of PURGED) {
    it(`${route} is purged by ${action}`, () => {
      const src = readFileSync(action, "utf8");
      assert.match(src, /revalidatePath\(/, `${action} purges nothing at all`);
    });
  }

  it("the heritage town page is purged by name, through its href helper", () => {
    // Easy to miss by grepping for the literal path: the editor builds it with
    // heritageTownHref(slug) rather than writing "/heritage/towns/..." out.
    const src = readFileSync("app/admin/destinations/actions.ts", "utf8");
    assert.match(src, /revalidatePath\(heritageTownHref\(slug\)\)/);
  });

  it("the tzaddikim pages read no database, which is why they need no purge", () => {
    // If one ever starts reading the store, it needs a purge and must move to
    // PURGED_ON_WRITE — this is the test that would catch it.
    for (const route of BUILT_IN) {
      const src = readFileSync(route, "utf8");
      assert.doesNotMatch(src, /prisma|getPublished|readStored/, `${route} now reads the store`);
    }
  });
});

describe("the loudest crawlers are asked to stop", () => {
  const robots = readFileSync("app/robots.ts", "utf8");

  it("names the four that send no readers", () => {
    assert.match(robots, /const NO_READERS_IN_RETURN = \["Bytespider", "TikTokSpider", "DotBot", "Amazonbot"\]/);
    assert.match(robots, /\.map\(\(userAgent\) => \(\{ userAgent, disallow: "\/" \}\)\)/);
  });

  it("leaves the ones that bring readers, and the owner's own tools, alone", () => {
    // Google, Bing and Applebot bring visitors; OpenAI's and Anthropic's bring
    // the answers people ask instead of searching; Semrush and Ahrefs are his.
    for (const keep of ["Googlebot", "Bingbot", "Applebot", "OAI-SearchBot", "ClaudeBot", "SemrushBot", "AhrefsBot"]) {
      assert.ok(!robots.includes(`"${keep}"`), `${keep} must not be turned away`);
    }
  });

  it("still lets everything else in, and still hides the private paths", () => {
    assert.match(robots, /userAgent: "\*",\s*allow: "\/",\s*disallow: PRIVATE_PATHS\.flatMap\(disallowFor\),/);
  });
});
