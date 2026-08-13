import type { SourceDefinition } from "./schema";

export const sourceCatalog = {
  nesiyatova: {
    name: "Nesiya Tova",
    url: "https://app.nesiyatova.com/",
    type: "heritage_directory",
    attribution: "Nesiya Tova",
    evidence:
      "Public Nesiya Tova place directory (mkmphone) for named batei chayim, mikvaos and hachnasas orchim. Phones are copied only when the source lists them.",
    lastChecked: "2026-08-13",
  },
} as const satisfies Readonly<Record<string, SourceDefinition>>;
