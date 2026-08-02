import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { OUT, SOURCE, buildIco } from "../scripts/build-favicon.mjs";

/**
 * The tab icon is the logo, and there is one drawing of it.
 *
 * app/icon.svg is that drawing; app/favicon.ico is rasterised from it. Two
 * files means two chances to be out of date, and a browser picks whichever it
 * prefers — so a stale .ico would show the old mark on some machines and the
 * new one on others, which is the exact confusion this arrangement exists to
 * prevent. Nothing but a check catches somebody editing the SVG and not
 * running the script.
 */

describe("the tab icon", () => {
  it("is the .ico that the SVG says it should be", () => {
    const built = buildIco().bytes as Buffer;
    const committed = readFileSync(OUT);
    assert.equal(
      Buffer.compare(built, committed),
      0,
      `${OUT} does not match ${SOURCE}. Run: node scripts/build-favicon.mjs`,
    );
  });

  it("carries the sizes a browser actually asks for", () => {
    const ico = readFileSync(OUT);
    assert.equal(ico.readUInt16LE(0), 0, "reserved");
    assert.equal(ico.readUInt16LE(2), 1, "type: icon");
    const sizes: number[] = [];
    for (let i = 0; i < ico.readUInt16LE(4); i++) sizes.push(ico[6 + i * 16] || 256);
    assert.deepEqual(sizes, [16, 32, 48, 64]);
  });

  it("has no background behind it", () => {
    // Every complaint about this icon has been about a coloured square: first
    // blue, then gold. The corner of every frame must be nothing at all.
    const ico = readFileSync(OUT);
    for (let i = 0; i < ico.readUInt16LE(4); i++) {
      const at = 6 + i * 16;
      const png = ico.subarray(ico.readUInt32LE(at + 12), ico.readUInt32LE(at + 12) + ico.readUInt32LE(at + 8));
      // An RGBA PNG: colour type 6 in the IHDR, so transparency is possible.
      assert.equal(png[25], 6, `frame ${ico[at] || 256}px is not RGBA`);
    }
  });

  it("is well-formed XML, so a browser will actually draw it", () => {
    // Served as image/svg+xml, this file is parsed as XML — stricter than
    // HTML. A comment containing two hyphens in a row ends there, the rest of
    // the file becomes rubbish, and the browser draws NO icon. It is silent
    // everywhere except the tab, which is the one place nobody is looking.
    // This has happened once already, from writing "var(--gold)" in a comment.
    const svg = readFileSync(SOURCE, "utf8");
    for (const comment of svg.match(/<!--[\s\S]*?-->/g) ?? []) {
      const inside = comment.slice(4, -3);
      assert.ok(!inside.includes("--"), `a comment contains "--", which ends it early:\n${inside.slice(0, 200)}`);
    }
    // Nothing left unclosed, and no stray comment openers outside one.
    assert.equal((svg.match(/<!--/g) ?? []).length, (svg.match(/-->/g) ?? []).length, "unbalanced comment markers");
    assert.ok(svg.trimEnd().endsWith("</svg>"), "the file does not end with </svg>");
  });

  it("is drawn in the logo's gold", () => {
    // In public/logo.png only the "White Glove" wordmark is navy — the hand
    // and the compass are gold. This was navy for one commit because it was
    // traced from public/logo-hand-navy.png, a recoloured copy used as a
    // bullet in the page body, which is not the mark.
    const svg = readFileSync(SOURCE, "utf8").replace(/<!--[\s\S]*?-->/g, "");
    const inks = new Set(svg.match(/(?:stroke|fill)="#[0-9a-f]{6}"/gi) ?? []);
    const gold = [...inks].filter((ink) => /#aa8b52/i.test(ink));
    assert.ok(gold.length > 0, "the mark is not drawn in --gold #aa8b52");
    for (const ink of inks) {
      // Cream is the glove and the compass face, which are white in the logo.
      assert.ok(/#aa8b52|#fffdf9/i.test(ink), `${ink} is neither the logo's gold nor its cream`);
    }
  });

  it("is the hand and compass, not the rose on its own", () => {
    // The rose belongs to the map: it is the marker on every pin and the key
    // in the legend. Where the site names itself, it is the whole logo.
    const svg = readFileSync(SOURCE, "utf8");
    const shapes = svg.replace(/<!--[\s\S]*?-->/g, "").match(/<(path|circle)\b/g) ?? [];
    assert.ok(shapes.length >= 5, `expected the glove, the cuff, the finger, the compass and its rose — found ${shapes.length}`);
  });

  it("is drawn only with what the rasteriser understands", () => {
    // buildIco throws on any other path command. This says so out loud, so the
    // next person to reach for an arc finds out here rather than from a stack
    // trace during a build.
    const svg = readFileSync(SOURCE, "utf8").replace(/<!--[\s\S]*?-->/g, "");
    for (const d of svg.match(/\sd="([^"]*)"/g) ?? []) {
      const letters = new Set(d.match(/[a-zA-Z](?![^"]*=)/g)?.filter((c) => c !== "d") ?? []);
      for (const letter of letters) {
        assert.ok(["M", "L", "C", "Z"].includes(letter), `path uses "${letter}", which scripts/build-favicon.mjs cannot draw`);
      }
    }
  });
});
