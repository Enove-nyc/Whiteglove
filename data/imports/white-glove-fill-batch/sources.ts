import type { SourceDefinition } from "./schema";

export const sourceCatalog = {
  "chicago-choose": {
    name: "Choose Chicago — Attractions",
    url: "https://www.choosechicago.com/things-to-do/attractions/",
    type: "official_tourism",
    attribution: "Choose Chicago",
    evidence: "Official Chicago visitor guide naming major museums, parks, architecture and lakefront attractions.",
    lastChecked: "2026-08-11",
  },
  "chicago-crc": {
    name: "Chicago Rabbinical Council",
    url: "https://www.crcweb.org/",
    type: "official_kosher_certifier",
    attribution: "Chicago Rabbinical Council",
    evidence: "Official Chicago kosher-certifier consumer resource.",
    lastChecked: "2026-08-11",
  },
  "seoul-visit": {
    name: "VisitSeoul — Attractions",
    url: "https://english.visitseoul.net/attractions",
    type: "official_tourism",
    attribution: "Seoul Tourism Organization",
    evidence: "Official Seoul attractions catalogue for palaces, markets, parks and cultural sites.",
    lastChecked: "2026-08-11",
  },
  "seoul-chabad": {
    name: "Chabad of Korea",
    url: "https://www.chabadkorea.com/",
    type: "official_community",
    attribution: "Chabad of Korea",
    evidence: "Official Seoul Jewish community visitor resource.",
    lastChecked: "2026-08-11",
  },
  "hk-discover": {
    name: "Discover Hong Kong — Attractions",
    url: "https://www.discoverhongkong.com/eng/explore/attractions.html",
    type: "official_tourism",
    attribution: "Hong Kong Tourism Board",
    evidence: "Official Hong Kong attractions guide for harbour, peaks, parks and cultural sites.",
    lastChecked: "2026-08-11",
  },
  "hk-ohel-leah": {
    name: "Ohel Leah Synagogue",
    url: "https://ohelleah.org/",
    type: "official_community",
    attribution: "Ohel Leah Synagogue",
    evidence: "Official Hong Kong Jewish community synagogue and visitor information source.",
    lastChecked: "2026-08-11",
  },
  "nz-auckland": {
    name: "Destination Auckland — Things to Do",
    url: "https://www.aucklandnz.com/visit/say-hello-to-auckland/things-to-do",
    type: "official_tourism",
    attribution: "Auckland Unlimited / Destination Auckland",
    evidence: "Official Auckland visitor guide naming harbourside, volcanic and cultural attractions.",
    lastChecked: "2026-08-11",
  },
  "nl-amsterdam-extra": {
    name: "I amsterdam — See and Do",
    url: "https://www.iamsterdam.com/en/see-and-do",
    type: "official_tourism",
    attribution: "amsterdam&partners / I amsterdam",
    evidence: "Official Amsterdam attractions guide used for additional attraction candidates beyond the existing destination record.",
    lastChecked: "2026-08-11",
  },
  "nl-nihs": {
    name: "NIHS — Jewish Cultural Quarter",
    url: "https://jck.nl/en",
    type: "official_museum",
    attribution: "Jewish Cultural Quarter Amsterdam",
    evidence: "Official Amsterdam Jewish museum and cultural quarter visitor source.",
    lastChecked: "2026-08-11",
  },
} as const satisfies Readonly<Record<string, SourceDefinition>>;

export type SourceKey = keyof typeof sourceCatalog;
