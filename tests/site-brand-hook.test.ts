import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeOf } from "./helpers/source";

const HOOK = codeOf("components/useSiteBrand.ts");
const NAVBAR = codeOf("components/Navbar.tsx");
const FOOTER = codeOf("components/Footer.tsx");

/**
 * Which brand a client component is being shown as, answered once.
 *
 * The Navbar read the hostname through useSyncExternalStore; the Footer
 * rendered "kosher" and corrected itself in an effect. The second is what
 * React's lint rule refuses, and it failed `eslint` on a component every
 * single page loads — while ignoring the deployment's own brand setting that
 * the Navbar had always honoured.
 */

describe("one hook answers which brand this is", () => {
  it("both the header and the footer ask it", () => {
    assert.match(NAVBAR, /useSiteBrand\(brandProp\)/);
    assert.match(FOOTER, /useSiteBrand\(brandProp\)/);
  });

  it("neither keeps its own copy of the answer any more", () => {
    for (const [name, source] of [["Navbar", NAVBAR], ["Footer", FOOTER]] as const) {
      assert.doesNotMatch(source, /useSyncExternalStore/, `${name} still reads the host itself`);
      assert.doesNotMatch(source, /brandForHost/, `${name} still reads the host itself`);
    }
  });

  it("the footer no longer corrects itself after rendering", () => {
    // A synchronous setState in an effect is a second render nobody asked for,
    // and this one ran on every page of the site.
    assert.doesNotMatch(FOOTER, /setBrand/);
  });

  it("the order is prop, then the deployment's setting, then the hostname", () => {
    assert.match(HOOK, /return brandProp \?\? built \?\? fromHost;/);
    assert.match(HOOK, /configuredBrand\(\)/);
  });

  it("the server is told which value it used, so hydration is honest", () => {
    // The third argument is the server snapshot. Without it React has no way
    // to render this without a mismatch.
    assert.match(HOOK, /useSyncExternalStore\(\s*NO_CHANGE,[\s\S]*?\(\) => built \?\? "kosher",/);
  });
});
