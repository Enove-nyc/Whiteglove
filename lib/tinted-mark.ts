import { GLOVE_MARK_INTRINSIC, GLOVE_MARK_SRC } from "@/lib/map-icons";

/**
 * The glove mark tinted into an image URL, for a renderer that will only take
 * one — Google Maps.
 *
 * Google's marker icon is a URL, so it cannot mask and colour the artwork the
 * way the legend chips and the Leaflet markers do in CSS. Rather than bake a
 * PNG per kind ahead of time — a second colour table, free to drift from
 * MAP_STYLE, and a build step to remember — the browser paints the same line
 * art in the same colour and hands Google the result. There is no disc behind
 * it here either.
 *
 * Drawn well above the size it is shown at and scaled down by the map, so the
 * pin stays sharp on a retina screen. One image per colour, kept for the life
 * of the page: six of them at most, however many hundred markers there are.
 */

const TINT_HEIGHT = 192;

const tinted = new Map<string, string>();
let artwork: Promise<HTMLImageElement> | null = null;

function loadArtwork(): Promise<HTMLImageElement> {
  if (!artwork) {
    artwork = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`${GLOVE_MARK_SRC} could not be loaded`));
      image.src = GLOVE_MARK_SRC;
    });
  }
  return artwork;
}

export async function tintedMarkUrl(color: string): Promise<string> {
  const already = tinted.get(color);
  if (already) return already;

  const image = await loadArtwork();
  const height = TINT_HEIGHT;
  const width = Math.round((height * GLOVE_MARK_INTRINSIC.width) / GLOVE_MARK_INTRINSIC.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const paint = canvas.getContext("2d");
  if (!paint) throw new Error("this browser gave no 2d canvas to tint the mark on");

  paint.drawImage(image, 0, 0, width, height);
  // Replace every colour in the artwork and keep its alpha, which is what makes
  // this a tint of the line art rather than a coloured box behind it.
  paint.globalCompositeOperation = "source-in";
  paint.fillStyle = color;
  paint.fillRect(0, 0, width, height);

  const url = canvas.toDataURL("image/png");
  tinted.set(color, url);
  return url;
}
