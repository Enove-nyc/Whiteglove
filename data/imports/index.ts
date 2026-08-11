import type { BulkContentCandidateInput } from "@/lib/bulk-content";

/**
 * Checked-in source packages that the admin may stage. Adding a new documented
 * batch is intentionally explicit: import it here after reviewing its source,
 * attribution, and licence. The admin will then expose its own Stage button
 * without turning anything public.
 */
export type BuiltInContentImportPackage = {
  schemaVersion: 1;
  batch: {
    slug: string;
    name: string;
    sourceName: string;
    sourceUrl: string;
    attribution: string;
    license: string;
  };
  generatedAt: string;
  candidates: BulkContentCandidateInput[];
};

// Checked-in bulk packs must be source-reviewed before they are registered
// here. The worldwide editorial pack follows its own private review flow and
// is intentionally not a bulk-staging package.
export const BUILT_IN_CONTENT_IMPORT_PACKAGES: readonly BuiltInContentImportPackage[] = [];
