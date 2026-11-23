import type { MetadataRoute } from "next";
import { currentBrand } from "@/lib/site-brand";

// Itineraries opens in the browser from an invitation. The Android app is distributed through Google Play.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await currentBrand();
  const itineraries = brand === "itineraries";
  return {
    name: itineraries ? "White Glove Itineraries" : "White Glove Kosher Travel",
    short_name: "White Glove",
    description: itineraries
      ? "Open your itinerary, travel wallet, and trip group chat."
      : "Kosher food, destinations, shuls and practical travel information while you travel.",
    ...(itineraries ? { id: "/" } : {}),
    start_url: itineraries ? "/app" : "/travel",
    display: itineraries ? "browser" : "standalone",
    background_color: "#15204A",
    theme_color: "#15204A",
    orientation: "portrait",
    categories: ["travel", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

