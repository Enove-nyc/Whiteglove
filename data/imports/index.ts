import { whiteGloveEuropeCandidates } from "@/data/imports/white-glove-europe-batch/candidates";
import { sourceCatalog as europeSources } from "@/data/imports/white-glove-europe-batch/sources";
import { whiteGloveFillCandidates } from "@/data/imports/white-glove-fill-batch/candidates";
import { sourceCatalog as fillSources } from "@/data/imports/white-glove-fill-batch/sources";
import { whiteGloveGlobalCandidates } from "@/data/imports/white-glove-global-batch/candidates";
import { sourceCatalog as globalSources } from "@/data/imports/white-glove-global-batch/sources";
import { worldwideBatch2Candidates } from "@/data/imports/worldwide-batch-2/candidates";
import { sourceCatalog as worldwideSources } from "@/data/imports/worldwide-batch-2/sources";
import type { BulkContentCandidateInput, BulkContentKind } from "@/lib/bulk-content";

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

/**
 * WHY THERE IS A TRANSLATION HERE AT ALL.
 *
 * This list was empty from the day the file was added, so /admin/imports drew
 * an empty table while /admin/imports/needs-review — which imports the four
 * pack files directly rather than reading this list — showed all 1,695 of the
 * same records. Three of the packs even carry a note, visible on that screen,
 * telling the owner to "open Bulk imports to stage and review": they pointed at
 * a page that had never been told they exist.
 *
 * They were never registered because the packs and this registry describe a
 * candidate differently, and nothing lines up by accident. The packs say
 * `sourceAttribution`, `sourceRights` and `destination`; the registry wants
 * `attribution`, `license` and `region`. The Europe pack calls its kind field
 * `kind` while the other three call it `importKind`, and three of them call the
 * town `locality` where Europe calls it `city`. So each pack needs its own
 * short mapping, which is what follows.
 *
 * The needs-review screen got away without one because it only needs eleven
 * fields to draw a row. Staging needs every field publishing later depends on,
 * which is why the mapping is written out in full rather than cast.
 */

/** Fields every pack spells the same way, whatever else differs. */
type SharedPackFields = {
  category: string;
  name: string;
  aliases: readonly string[];
  destination: string;
  country: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceAttribution: string;
  sourceEvidence: string;
};

/**
 * The one thing a pack candidate may not carry over unchecked.
 *
 * `kind` reaches BulkContentKind by name — the packs already emit ATTRACTION,
 * PRACTICAL and PLACE_TO_STAY, which are three of its four values. A string
 * that is not one of them must NOT be quietly forced into a real kind: the
 * staging rule rejects an unsupported type on purpose, and a bad cast here
 * would file the record under the wrong one instead, where it would look
 * reviewed. Passing it through unchanged lets that rule do its job.
 */
function packKind(kind: string): BulkContentKind {
  return kind as BulkContentKind;
}

/**
 * The candidates hold no address, coordinates, summary or destination link —
 * the packs collect provenance, deliberately, and leave the traveller-facing
 * details to be written or checked. Those absences become publish blockers
 * rather than staging errors, which is exactly the state "needs review" means.
 */
function candidateFrom(
  pack: SharedPackFields,
  kind: string,
  city: string,
  license: string,
): BulkContentCandidateInput {
  return {
    kind: packKind(kind),
    category: pack.category,
    name: pack.name,
    aliases: [...pack.aliases],
    city,
    region: pack.destination || null,
    country: pack.country,
    sourceUrl: pack.sourceUrl,
    sourceId: pack.sourceId,
    sourceName: pack.sourceName,
    attribution: pack.sourceAttribution,
    license,
    sourceEvidence: pack.sourceEvidence,
  };
}

// Every source in every pack repeats this sentence as its `rights`. The Europe
// pack also stores it per candidate, so that one uses its own copy and the
// other three fall back to the shared wording rather than inventing a licence.
const RESEARCH_ONLY =
  "Research links only — no source text, imagery, reviews, prices, hours or contacts are stored.";

/**
 * A package draws on dozens of separate official sources, so there is no single
 * honest "source terms" URL to give: Europe cites 34, global 65. Each candidate
 * keeps its own real source link, which is where provenance actually lives.
 * This is left empty rather than filled with one source standing in for the
 * rest, and the admin screen omits the link when it is empty.
 */
function batchFor(slug: string, name: string, sourceCount: number) {
  return {
    slug,
    name,
    sourceName: `${sourceCount} official tourism, municipal and Jewish community sources`,
    sourceUrl: "",
    attribution: "Compiled by White Glove; every candidate carries its own source and attribution.",
    license: RESEARCH_ONLY,
  };
}

export const BUILT_IN_CONTENT_IMPORT_PACKAGES: readonly BuiltInContentImportPackage[] = [
  {
    schemaVersion: 1,
    batch: batchFor(
      "white-glove-europe-batch",
      "White Glove Europe research pack",
      Object.keys(europeSources).length,
    ),
    generatedAt: "2026-08-11",
    // Europe is the odd one out twice over: `kind` rather than `importKind`,
    // `city` rather than `locality`, and it is the only pack that records a
    // per-candidate `sourceRights`.
    candidates: whiteGloveEuropeCandidates.map((candidate) =>
      candidateFrom(candidate, candidate.kind, candidate.city, candidate.sourceRights || RESEARCH_ONLY),
    ),
  },
  {
    schemaVersion: 1,
    batch: batchFor(
      "white-glove-global-batch",
      "White Glove global research pack",
      Object.keys(globalSources).length,
    ),
    generatedAt: "2026-08-11",
    candidates: whiteGloveGlobalCandidates.map((candidate) =>
      candidateFrom(candidate, candidate.importKind, candidate.locality, RESEARCH_ONLY),
    ),
  },
  {
    schemaVersion: 1,
    batch: batchFor(
      "white-glove-fill-batch",
      "White Glove complementary fill pack",
      Object.keys(fillSources).length,
    ),
    generatedAt: "2026-08-11",
    candidates: whiteGloveFillCandidates.map((candidate) =>
      candidateFrom(candidate, candidate.importKind, candidate.locality, RESEARCH_ONLY),
    ),
  },
  {
    schemaVersion: 1,
    batch: batchFor(
      "worldwide-batch-2",
      "Worldwide editorial review pack",
      Object.keys(worldwideSources).length,
    ),
    generatedAt: "2026-08-11",
    // This pack also feeds the Trello review board, which reads the pack file
    // directly and is unaffected by its being stageable here as well.
    candidates: worldwideBatch2Candidates.map((candidate) =>
      candidateFrom(candidate, candidate.importKind, candidate.locality, RESEARCH_ONLY),
    ),
  },
];
