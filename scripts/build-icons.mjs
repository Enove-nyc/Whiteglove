/**
 * Build every icon the site ships, from the logo artwork itself.
 *
 *   node scripts/build-icons.mjs
 *
 * WHAT THIS REPLACED. The tab icon used to be a drawing of the logo rather
 * than the logo — a simplified hand and compass, redrawn thick enough to
 * survive sixteen pixels. It was legible and it was not the mark. This uses
 * public/logo-mark.png, which is the artwork, and does the two things that
 * actually let fine line-work shrink.
 *
 * TRANSPARENCY BY UN-BLENDING, not by keying. The artwork arrives as gold line
 * work painted on white. Turning "near enough to white" into nothing leaves a
 * pale fringe on every antialiased edge, which is what a smudge on the tab is
 * made of. Instead each pixel is treated as ink laid over white at some
 * coverage, and that coverage is solved for — giving a real alpha channel. The
 * colour is then set to the logo's gold rather than recovered per pixel,
 * because recovering it from a JPEG's edges returns noise, and the noise reads
 * as an olive tint at small sizes.
 *
 * THICKENED BEFORE SHRINKING. A stroke in the artwork is about six pixels in a
 * frame nine hundred wide. Shrunk to a tab icon it is a fraction of one pixel,
 * and a fraction of a pixel is drawn as pale grey rather than as a line. So the
 * ink is dilated first — every pixel takes the strongest coverage near it, so
 * strokes grow outward without softening — by more for the smaller sizes. The
 * drawing keeps its shape; only its weight changes.
 *
 * THE WHOLE MARK, EVERYWHERE. An earlier version cropped the "N" above the
 * compass off the tab icon, on the reasoning that it is the sparsest part and
 * the first to disappear anyway, and that losing it lets everything else be
 * bigger. It does — and it also stops the icon being the logo. Every size now
 * carries the whole thing, and the weight is the only thing that changes.
 *
 * WHAT EACH SIZE IS ACTUALLY FOR. app/icon.png is 180 pixels and is what a
 * modern browser takes; at that size the artwork needs almost nothing done to
 * it and is the mark exactly as drawn. The .ico is the fallback a browser asks
 * for before it has parsed any HTML. Its 32-pixel frame is what a 2x display
 * really draws for a 16-pixel favicon, and that one reads. The 16-pixel frame
 * is soft however it is treated — a drawing this fine cannot resolve in 256
 * pixels, and no amount of weight changes that. It is there so an old display
 * gets the mark rather than nothing.
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import sharp from "sharp";

const SRC = "public/logo-mark.png";
const GOLD = [0xa8, 0x84, 0x46];
/** The home-screen tile. iOS ignores transparency and composites onto black. */
const TILE = [0x14, 0x21, 0x3d];

/**
 * The artwork as gold ink with a real alpha, optionally fattened and cropped.
 *
 * `dilate` is in source pixels, so the same number means the same amount of
 * growth whatever it is later shrunk to.
 */
async function ink({ dilate = 0 } = {}) {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let a = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) a[p] = data[i + 3];
  if (dilate > 0) a = grow(a, w, h, dilate);

  const out = Buffer.alloc(w * h * 4);
  for (let i = 0, p = 0; i < out.length; i += 4, p++) {
    out[i] = GOLD[0];
    out[i + 1] = GOLD[1];
    out[i + 2] = GOLD[2];
    out[i + 3] = a[p];
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/** Dilation: each pixel takes the strongest coverage within `r`. Separable. */
function grow(alpha, w, h, r) {
  const line = (src, W, H) => {
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let best = 0;
        for (let d = -r; d <= r; d++) {
          const xx = x + d;
          if (xx >= 0 && xx < W && src[y * W + xx] > best) best = src[y * W + xx];
        }
        out[y * W + x] = best;
      }
    }
    return out;
  };
  const flip = (src, W, H) => {
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[x * H + y] = src[y * W + x];
    return out;
  };
  return flip(line(flip(line(alpha, w, h), w, h), h, w), h, w);
}

const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const square = (img, size, background = clear) => img.resize(size, size, { fit: "contain", background });

/* ---- the tab icon ------------------------------------------------------ */

/**
 * How hard each frame is pushed.
 *
 * More weight the smaller it gets, because the same stroke has fewer pixels to
 * land on — and no more than that. Past a point the strokes merge and the
 * drawing stops being the drawing, which is worse than being faint: a soft
 * version of the logo is still the logo, and a blob is not.
 */
const ICO_FRAMES = [
  { size: 16, dilate: 14 },
  { size: 32, dilate: 8 },
  { size: 48, dilate: 7 },
  { size: 64, dilate: 5 },
];

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** A PNG written by hand, so the .ico holds exactly these bytes. */
function png(raw, size) {
  const stride = size * 4;
  const rows = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    rows[y * (stride + 1)] = 0; // filter: none
    raw.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function buildIco() {
  const frames = [];
  for (const { size, dilate } of ICO_FRAMES) {
    const raw = await square(await ink({ dilate }), size).raw().toBuffer();
    frames.push({ size, data: png(raw, size) });
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);
  let offset = 6 + frames.length * 16;
  const entries = frames.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size;
    e[1] = size;
    e[4] = 1; // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
}

/* ---- run it ------------------------------------------------------------ */

if (process.argv[1]?.endsWith("build-icons.mjs")) {
  writeFileSync("app/favicon.ico", await buildIco());
  console.log(`app/favicon.ico — ${ICO_FRAMES.map((f) => f.size).join(", ")}px`);

  // The tab's own PNG, which a modern browser prefers over the .ico. Large
  // enough that the artwork needs almost nothing done to it — this one is the
  // mark as drawn, and it is the one most people will actually see.
  await square(await ink({ dilate: 3 }), 180).png().toFile("app/icon.png");
  console.log("app/icon.png — 180px");

  // Home-screen icons. Opaque on purpose: iOS does not honour transparency in
  // an apple-touch-icon, it composites onto black, and a gold mark on black is
  // not the logo. The mark sits inside a margin so the tile's rounding does
  // not clip it.
  for (const [file, size] of [["public/apple-touch-icon.png", 180], ["public/icon-192.png", 192], ["public/icon-512.png", 512]]) {
    const inner = Math.round(size * 0.68);
    const mark = await square(await ink({ dilate: 2 }), inner).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: { r: TILE[0], g: TILE[1], b: TILE[2], alpha: 1 } } })
      .composite([{ input: mark, gravity: "centre" }])
      .png()
      .toFile(file);
    console.log(`${file} — ${size}px`);
  }

  // Maskable: Android crops it to whatever shape the launcher uses, so the
  // mark sits well inside the safe circle rather than at the tile's edge.
  const maskable = await square(await ink({ dilate: 2 }), 260).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: { r: TILE[0], g: TILE[1], b: TILE[2], alpha: 1 } } })
    .composite([{ input: maskable, gravity: "centre" }])
    .png()
    .toFile("public/icon-maskable-512.png");
  console.log("public/icon-maskable-512.png — 512px");
}
