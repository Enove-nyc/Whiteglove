import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

/**
 * Bake one PNG per map kind: the hand+compass mark tinted in that kind's colour,
 * seated on a neutral cream disc for contrast on dark tiles.
 *
 * Kind identity lives in the mark itself — not in a coloured ring around it.
 * Regenerate after changing MAP_STYLE colours in lib/map-icons.ts:
 *   node scripts/build-map-pins.mjs
 */

const styles = {
  center: "#172d52",
  kever: "#aa8b52",
  attraction: "#b4472a",
  stay: "#2b6d80",
  kosher: "#2f7d54",
  airport: "#7a6a92",
};

const markPath = "public/map-glove-pin.png";
const outDir = "public/map-pins";
fs.mkdirSync(outDir, { recursive: true });

const width = 56;
const height = 78;
const cx = width / 2;
const cy = 30;
const r = 26;

function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Recolour the gold line art to `hex`, keeping alpha (soft edges) and a little
 * of the original luminance so the stroke still has weight rather than going flat.
 */
async function tintMark(markBuffer, hex) {
  const { r, g, b } = hexToRgb(hex);
  const { data, info } = await sharp(markBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Gold sits around 0.55–0.8 luminance; normalise so the target colour reads at full strength.
  const goldMid = 0.68;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      continue;
    }
    const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    const t = Math.min(1.15, Math.max(0.35, lum / goldMid));
    data[i] = Math.min(255, Math.round(r * t));
    data[i + 1] = Math.min(255, Math.round(g * t));
    data[i + 2] = Math.min(255, Math.round(b * t));
  }
  return sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

const markBase = await sharp(markPath).resize({ height: 72, fit: "inside" }).png().toBuffer();
const markMeta = await sharp(markBase).metadata();
const mw = markMeta.width ?? 46;
const mh = markMeta.height ?? 72;
const left = Math.round((width - mw) / 2);
const top = Math.max(2, Math.round(cy - mh * 0.42));

// Neutral cream disc only — same for every kind. No kind-coloured stroke.
const disc = Buffer.from(
  [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fffdf9"/>`,
    `</svg>`,
  ].join(""),
);

for (const [kind, color] of Object.entries(styles)) {
  const mark = await tintMark(markBase, color);
  await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: disc, top: 0, left: 0 },
      { input: mark, top, left },
    ])
    .png()
    .toFile(path.join(outDir, `${kind}.png`));
}

console.log("pins written", Object.keys(styles).join(", "));
