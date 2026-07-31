/**
 * Draw app/favicon.ico from the same compass rose as app/icon.svg.
 *
 *   node scripts/build-favicon.mjs
 *
 * WHY THIS IS HERE. The old .ico was the whole logo — a gloved hand holding a
 * compass, in fine gold line-work. Transparent, and still wrong: at sixteen
 * pixels those hairlines cannot resolve, so the mark dissolved into a pale gold
 * smudge that reads as a coloured background. A favicon gets one shape, drawn
 * thick.
 *
 * The SVG would be enough for a modern browser, but /favicon.ico is what a
 * browser asks for before it has parsed any HTML, and it is what shows in
 * bookmarks and history. Leaving the old one in place would mean the fix
 * depended on which icon the browser happened to prefer.
 *
 * No image library: the shape is one polygon and one circle, so this rasterises
 * them directly with 4x supersampling and writes the PNGs by hand.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const GOLD = [0xaa, 0x8b, 0x52];
const CREAM = [0xff, 0xfd, 0xf9];

// The rose from lib/map-icons.ts, as points in a 24x24 box.
const ROSE = [
  [12.0, 2.7], [12.75, 10.2], [16.31, 7.69], [13.8, 11.25], [21.3, 12.0], [13.8, 12.75],
  [16.31, 16.31], [12.75, 13.8], [12.0, 21.3], [11.25, 13.8], [7.69, 16.31], [10.2, 12.75],
  [2.7, 12.0], [10.2, 11.25], [7.69, 7.69], [11.25, 10.2],
];
const RING = { cx: 12, cy: 12, r: 11.1, stroke: 1.6 };

/** Is the point inside the polygon? Even-odd crossing test. */
function inPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** One pixel's colour, averaged over SS x SS samples so the edges are smooth. */
function sample(px, py, size) {
  const SS = 4;
  const scale = 24 / size;
  let r = 0, g = 0, b = 0, a = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const x = (px + (sx + 0.5) / SS) * scale;
      const y = (py + (sy + 0.5) / SS) * scale;
      const d = Math.hypot(x - RING.cx, y - RING.cy);
      let colour = null;
      if (inPolygon(x, y, ROSE)) colour = GOLD;                                   // the rose
      else if (Math.abs(d - RING.r) <= RING.stroke / 2) colour = GOLD;            // the ring
      else if (d < RING.r - RING.stroke / 2) colour = CREAM;                      // inside it
      if (colour) { r += colour[0]; g += colour[1]; b += colour[2]; a += 255; }
    }
  }
  const n = SS * SS;
  if (!a) return [0, 0, 0, 0];
  // Un-premultiply: the colour is the average of the samples that had one.
  const covered = a / 255;
  return [Math.round(r / covered), Math.round(g / covered), Math.round(b / covered), Math.round(a / n)];
}

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
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

function png(size) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = sample(x, y, size);
      const at = y * (stride + 1) + 1 + x * 4;
      raw[at] = r; raw[at + 1] = g; raw[at + 2] = b; raw[at + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const SIZES = [16, 32, 48, 64];
const frames = SIZES.map((size) => ({ size, data: png(size) }));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);              // type: icon
header.writeUInt16LE(frames.length, 4);
let offset = 6 + frames.length * 16;
const entries = frames.map(({ size, data }) => {
  const e = Buffer.alloc(16);
  e[0] = size === 256 ? 0 : size;
  e[1] = size === 256 ? 0 : size;
  e[4] = 1;                              // colour planes
  e.writeUInt16LE(32, 6);                // bits per pixel
  e.writeUInt32LE(data.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += data.length;
  return e;
});

writeFileSync("app/favicon.ico", Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]));
console.log(`app/favicon.ico — ${SIZES.join(", ")}px, ${offset} bytes`);
