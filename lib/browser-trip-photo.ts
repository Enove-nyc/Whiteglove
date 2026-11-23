import { ALLOWED_TYPES, MAX_ATTACHMENT_BYTES, dataUrlBytes } from "@/lib/attachments";

export const photoTypes = Object.keys(ALLOWED_TYPES).filter((type) => type.startsWith("image/")).join(",");

export async function encodePhoto(file: File, sizes = [1600, 1200, 900, 600]): Promise<string> {
  if (!photoTypes.split(",").includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP photo.");
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare that photo.");
    for (const maxSide of sizes) {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      if (dataUrlBytes(dataUrl) <= MAX_ATTACHMENT_BYTES) return dataUrl;
    }
    throw new Error("Could not make that photo small enough. Try a smaller picture.");
  } finally {
    image.close();
  }
}

