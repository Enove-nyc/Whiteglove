/**
 * Draw app/favicon.ico from app/icon.svg.
 *
 *   node scripts/build-favicon.mjs
 *
 * WHY THIS IS HERE. A modern browser will take the SVG, but /favicon.ico is
 * what one asks for before it has parsed any HTML, and it is what shows in
 * bookmarks and history. Two files means two chances to be out of date, and
 * the tab would then show whichever the browser happened to prefer. So there
 * is one drawing — app/icon.svg — and this reads it.
 *
 * IT PARSES ONLY WHAT THAT FILE USES: absolute M / L / C / Z paths, and one
 * circle. Not an SVG renderer, and it should not become one. If the icon ever
 * needs something this cannot draw, the honest fix is to draw the icon within
 * what this understands — a tab icon is sixteen pixels and has no use for
 * gradients or transforms — or to replace this with a real rasteriser.
 *
 * Strokes are drawn as distance-to-the-path rather than as an outline, which
 * is why the round joins and caps in the SVG come out round here without any
 * special handling: every point within half a stroke-width of the line is in.
 */
import { deflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SOURCE = "app/icon.svg";
export const OUT = "app/favicon.ico";
const SIZES = [16, 32, 48, 64];
/** Straight-line segments per curve. Plenty: the whole icon is 24 units wide. */
const CURVE_STEPS = 24;

/* ---- reading the drawing ---------------------------------------------- */

function attr(tag, name) {
  const found = tag.match(new RegExp(`${name}="([^"]*)"`));
  return found ? found[1] : null;
}

function colour(value) {
  if (!value || value === "none") return null;
  const hex = value.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** A cubic bezier as points, endpoints included. */
function curve(p0, p1, p2, p3) {
  const points = [];
  for (let i = 1; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS;
    const u = 1 - t;
    points.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return points;
}

/** A path's `d` as a list of points, and whether it closes. */
function flatten(d) {
  // Any single letter, or a number. A letter this does not know reaches the
  // throw below rather than being quietly skipped, which would draw the wrong
  // shape and say nothing about it.
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? [];
  const points = [];
  let closed = false;
  let at = [0, 0];
  let i = 0;
  const number = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === "M" || command === "L") {
      at = [number(), number()];
      points.push(at);
    } else if (command === "C") {
      const p1 = [number(), number()];
      const p2 = [number(), number()];
      const p3 = [number(), number()];
      points.push(...curve(at, p1, p2, p3));
      at = p3;
    } else if (command === "Z") {
      closed = true;
    } else {
      throw new Error(`${SOURCE}: this only understands M, L, C and Z — found "${command}"`);
    }
  }
  return { points, closed };
}

/**
 * The drawing, in the order it is painted.
 *
 * Order matters and is the file's: the glove is drawn first and the compass
 * over it, the way the logo has the compass in front of the hand.
 */
function readIcon() {
  const svg = readFileSync(SOURCE, "utf8");
  const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!viewBox) throw new Error(`${SOURCE}: expected a viewBox starting at 0 0`);
  const shapes = [];
  // Comments first, so a path mentioned inside one is never mistaken for one.
  for (const tag of svg.replace(/<!--[\s\S]*?-->/g, "").match(/<(path|circle)\b[^>]*>/g) ?? []) {
    const common = {
      fill: colour(attr(tag, "fill")),
      stroke: colour(attr(tag, "stroke")),
      width: Number(attr(tag, "stroke-width") ?? 0),
    };
    if (tag.startsWith("<circle")) {
      shapes.push({ ...common, kind: "circle", cx: Number(attr(tag, "cx")), cy: Number(attr(tag, "cy")), r: Number(attr(tag, "r")) });
    } else {
      shapes.push({ ...common, kind: "path", ...flatten(attr(tag, "d")) });
    }
  }
  return { size: Number(viewBox[1]), shapes };
}

/* ---- drawing it -------------------------------------------------------- */

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

/** Distance from the point to the nearest of the path's segments. */
function distanceToPath(x, y, points, closed) {
  let best = Infinity;
  const last = closed ? points.length : points.length - 1;
  for (let i = 0; i < last; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = dx * dx + dy * dy;
    // How far along the segment the closest point is, kept on the segment so
    // the ends are round rather than reaching past themselves.
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length));
    best = Math.min(best, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
  }
  return best;
}

/** The colour at one point in the drawing's own units, or null for nothing. */
function colourAt(x, y, shapes) {
  let found = null;
  for (const shape of shapes) {
    if (shape.kind === "circle") {
      const d = Math.hypot(x - shape.cx, y - shape.cy);
      if (shape.stroke && Math.abs(d - shape.r) <= shape.width / 2) found = shape.stroke;
      else if (shape.fill && d < shape.r) found = shape.fill;
    } else {
      if (shape.stroke && distanceToPath(x, y, shape.points, shape.closed) <= shape.width / 2) found = shape.stroke;
      else if (shape.fill && shape.closed && inPolygon(x, y, shape.points)) found = shape.fill;
    }
  }
  return found;
}

/** One pixel, averaged over SS x SS samples so the edges are smooth. */
function sample(px, py, size, icon) {
  const SS = 4;
  const scale = icon.size / size;
  let r = 0, g = 0, b = 0, hits = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const found = colourAt((px + (sx + 0.5) / SS) * scale, (py + (sy + 0.5) / SS) * scale, icon.shapes);
      if (found) { r += found[0]; g += found[1]; b += found[2]; hits++; }
    }
  }
  if (!hits) return [0, 0, 0, 0];
  // Un-premultiply: the colour is the average of the samples that had one.
  return [Math.round(r / hits), Math.round(g / hits), Math.round(b / hits), Math.round((hits / (SS * SS)) * 255)];
}

/* ---- writing the file -------------------------------------------------- */

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

function png(size, icon) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = sample(x, y, size, icon);
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

/**
 * The .ico that app/icon.svg says it should be.
 *
 * Exported so a test can build it and compare against the committed file —
 * the drift this whole arrangement exists to prevent is somebody editing the
 * SVG and not running this, which no amount of commenting catches.
 */
export function buildIco() {
  const icon = readIcon();
  const frames = SIZES.map((size) => ({ size, data: png(size, icon) }));

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

  return { bytes: Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]), shapes: icon.shapes.length, sizes: SIZES };
}

// Only when run as a command, so importing it does not write to the repo.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { bytes, shapes, sizes } = buildIco();
  writeFileSync(OUT, bytes);
  console.log(`${OUT} — from ${SOURCE}, ${shapes} shapes, ${sizes.join(", ")}px, ${bytes.length} bytes`);
}
