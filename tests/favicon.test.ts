import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";

/**
 * The tab icon is the logo — the artwork, not a drawing of it.
 *
 * It took five goes to get here, and each wrong turn is worth a check so it is
 * not taken again: a coloured tile behind it, the compass rose standing in for
 * the whole mark, and a hand-drawn version that was legible and was not the
 * logo. All of it is now built from public/logo-mark.png by
 * scripts/build-icons.mjs.
 *
 * These tests read the committed files rather than rebuilding them, so they
 * need no image library. Rebuilding needs sharp, which arrives with Next and is
 * not a dependency this repo declares.
 */

const ICO = "app/favicon.ico";
const ICON = "app/icon.png";
const MARK = "public/logo-mark.png";

/** The width, height, and colour type out of a PNG's IHDR. */
function pngHeader(png: Buffer) {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "not a PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20), colourType: png[25] };
}

/** Every frame inside an .ico, as its own PNG. */
function icoFrames(ico: Buffer) {
  assert.equal(ico.readUInt16LE(0), 0, "reserved");
  assert.equal(ico.readUInt16LE(2), 1, "type: icon");
  return Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
    const at = 6 + i * 16;
    const offset = ico.readUInt32LE(at + 12);
    return { size: ico[at] || 256, png: ico.subarray(offset, offset + ico.readUInt32LE(at + 8)) };
  });
}

describe("the tab icon", () => {
  it("is built from the logo artwork, which is in the repo", () => {
    // The one thing that must not go missing. Without it the icons cannot be
    // rebuilt, and the next person has nothing to work from but the output.
    assert.ok(existsSync(MARK), `${MARK} is missing — scripts/build-icons.mjs has nothing to build from`);
    const { width, height, colourType } = pngHeader(readFileSync(MARK));
    assert.ok(width > 400 && height > 400, `the artwork is only ${width}x${height} — too small to build 512px icons from`);
    assert.equal(colourType, 6, "the artwork has no alpha channel, so it still has a white background baked in");
  });

  it("is not a drawing of the logo any more", () => {
    // app/icon.svg was a redrawn hand and compass. A browser prefers an SVG
    // over everything else, so leaving it in place would keep showing the
    // drawing however good the PNGs are.
    assert.ok(!existsSync("app/icon.svg"), "app/icon.svg is back — a browser will prefer it over the artwork");
  });

  it("carries the sizes a browser actually asks for", () => {
    assert.deepEqual(icoFrames(readFileSync(ICO)).map((f) => f.size), [16, 32, 48, 64]);
  });

  it("has no background behind it", () => {
    // Every complaint about this icon has been about a coloured square: first
    // blue, then gold. Every frame must be able to be transparent.
    for (const frame of icoFrames(readFileSync(ICO))) {
      assert.equal(pngHeader(frame.png).colourType, 6, `the ${frame.size}px frame is not RGBA`);
    }
    assert.equal(pngHeader(readFileSync(ICON)).colourType, 6, "app/icon.png is not RGBA");
  });

  it("really is transparent, not white painted on", () => {
    // Colour type 6 only means it COULD be transparent. The corner of the
    // largest frame is the thing that was actually wrong before.
    const largest = icoFrames(readFileSync(ICO)).at(-1);
    assert.ok(largest, "no frames");
    // Each row starts with its filter byte, so the first pixel is at 1.
    const idat = findChunk(largest.png, "IDAT");
    const rows = inflateSync(idat);
    // Byte 0 of each row is the filter; the first pixel follows it.
    assert.equal(rows[4], 0, `the top-left pixel has alpha ${rows[4]} — there is a background behind the mark`);
  });

  it("is the same shape in every frame", () => {
    // A tab icon that changes shape as it scales reads as two different
    // icons. Every frame is square and comes from the same artwork.
    for (const frame of icoFrames(readFileSync(ICO))) {
      const { width, height } = pngHeader(frame.png);
      assert.equal(width, frame.size);
      assert.equal(height, frame.size);
    }
  });
});

/** The bytes of the first chunk of this type. */
function findChunk(png: Buffer, type: string): Buffer {
  let at = 8;
  while (at < png.length) {
    const length = png.readUInt32BE(at);
    const name = png.subarray(at + 4, at + 8).toString("latin1");
    if (name === type) return png.subarray(at + 8, at + 8 + length);
    at += 12 + length;
  }
  throw new Error(`no ${type} chunk`);
}
