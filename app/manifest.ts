import type { MetadataRoute } from "next";

// Web app manifest — makes the site installable as an app (and Play Store-ready
// once wrapped as a Trusted Web Activity).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "White Glove Itineraries",
    short_name: "White Glove",
    description: "Thoughtfully planned kosher travel and Jewish heritage journeys — kevarim, kosher food, minyanim, and trip planning.",
    start_url: "/",
    display: "standalone",
    background_color: "#14213d",
    theme_color: "#14213d",
    orientation: "portrait",
    categories: ["travel", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
