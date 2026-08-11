import { duplicateKey, type CandidateEntityType } from "./schema";

/**
 * Narrow duplicate snapshot taken from the current built-in vacation content
 * before this isolated pack was created. It covers every current vacation
 * destination and the selected-market records that would otherwise collide.
 *
 * This is intentionally a snapshot instead of an import from data/*.ts so the
 * staging pack remains runnable while the primary importer changes those files.
 */
type ExistingSnapshot = {
  entityType: CandidateEntityType;
  name: string;
  locality: string;
  country: string;
  sourceFile: string;
};

export const existingContentExcludedFromWorldwideBatch2: readonly ExistingSnapshot[] = [
  // Current vacation destinations.
  { entityType: "vacation_destination", name: "Rome", locality: "Rome", country: "Italy", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Paris", locality: "Paris", country: "France", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Venice", locality: "Venice", country: "Italy", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Florence", locality: "Florence", country: "Italy", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "The Dolomites", locality: "Dolomites", country: "Italy", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "The Jungfrau region", locality: "Jungfrau region", country: "Switzerland", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Lucerne", locality: "Lucerne", country: "Switzerland", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Zurich", locality: "Zurich", country: "Switzerland", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "London", locality: "London", country: "United Kingdom", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Amsterdam", locality: "Amsterdam", country: "Netherlands", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Prague", locality: "Prague", country: "Czechia", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Vienna", locality: "Vienna", country: "Austria", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Budapest", locality: "Budapest", country: "Hungary", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Nice and the Côte d'Azur", locality: "Nice", country: "France", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "The Austrian Tyrol", locality: "Innsbruck", country: "Austria", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "The French Alps", locality: "Grenoble", country: "France", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Miami Beach", locality: "Miami Beach", country: "United States", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Hollywood and Hallandale", locality: "Hollywood", country: "United States", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Orlando", locality: "Orlando", country: "United States", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Jerusalem", locality: "Jerusalem", country: "Israel", sourceFile: "data/vacation-destinations.ts" },
  { entityType: "vacation_destination", name: "Kraków", locality: "Kraków", country: "Poland", sourceFile: "data/vacation-destinations.ts" },

  // Selected-market entries already covered by core data.
  { entityType: "attraction", name: "The Acropolis", locality: "Athens", country: "Greece", sourceFile: "data/attractions.ts" },
  {
    entityType: "attraction",
    name: "Rhodes — La Juderia and the Kahal Shalom",
    locality: "Rhodes",
    country: "Greece",
    sourceFile: "data/attractions.ts",
  },
  {
    entityType: "stay_anchor",
    name: "Around the Beth Shalom synagogue, Thiseio",
    locality: "Athens",
    country: "Greece",
    sourceFile: "data/kosher-stays.ts",
  },
];

export const existingContentExcludedDedupeKeys = new Set(
  existingContentExcludedFromWorldwideBatch2.map((record) =>
    duplicateKey(record.entityType, record.name, record.locality, record.country),
  ),
);
