import thingsToDo from "@/public/photos/homepage/things-to-do.webp";
import whereToStay from "@/public/photos/homepage/where-to-stay.webp";
import kosherFood from "@/public/photos/homepage/kosher-food.webp";
import heritage from "@/public/photos/homepage/heritage.webp";
import mapPhoto from "@/public/photos/homepage/map.webp";
import localHelp from "@/public/photos/homepage/local-help.webp";
import sources from "@/data/homepage-photo-sources.json";

export type HomePhotoKey = "things-to-do" | "where-to-stay" | "kosher-food" | "heritage" | "map" | "local-help";
export const HOME_PHOTOGRAPHS = sources;
const IMAGES = { "things-to-do": thingsToDo, "where-to-stay": whereToStay, "kosher-food": kosherFood, heritage, map: mapPhoto, "local-help": localHelp };
export const HOME_PHOTOS = Object.fromEntries(sources.map((photo) => [photo.key, { ...photo, image: IMAGES[photo.key as HomePhotoKey] }])) as Record<HomePhotoKey, (typeof sources)[number] & { image: typeof thingsToDo }>;
