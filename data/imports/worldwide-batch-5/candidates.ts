import part1 from "./_data-part1.json";
import part2 from "./_data-part2.json";
import part3 from "./_data-part3.json";
import part4 from "./_data-part4.json";
import part5 from "./_data-part5.json";
import part6 from "./_data-part6.json";
import {
  sourceBackedCandidate,
  type CandidateEntityType,
  type CandidateDraftRow,
  type CandidateInput,
  type WorldwideBatch5Candidate,
} from "./schema";
import { sourceCatalog } from "./sources";

const requiredBeforePublication = {
  vacation_destination: [
    "Destination editorial fields and facets reviewed",
    "Destination readiness checks pass against imported practical content",
  ],
  attraction: [
    "Customer-facing summary verified against the cited source",
    "Confirm suitable for Orthodox / Torah-observant travelers (Jewish welcome; kosher label not required; reject clubs, nightlife, mixed concerts, and similar)",
    "Address and visit details confirmed before public release",
  ],
  stay_anchor: [
    "Where to stay area note and coordinates confirmed from a primary source",
    "Editorial review confirms the area remains useful for places to stay",
  ],
  shul: [
    "Minyan times and visitor access confirmed",
    "Address and security entry rules verified",
  ],
  mikvah: [
    "Appointment rules and hours confirmed directly",
    "Address and access instructions verified",
  ],
  beis_hachaim: [
    "Access hours and shomer contact confirmed",
    "Customer-facing cemetery / kever wording reviewed",
  ],
  practical_travel_resource: [
    "Resource scope and current access route reviewed",
    "Editorial review confirms practical framing only",
  ],
  kosher_travel_resource: [
    "Resource scope and current access route reviewed",
    "Editorial review confirms it is not presented as a food or accommodation provider",
  ],
} as const satisfies Readonly<Record<CandidateEntityType, readonly string[]>>;

function draft(input: CandidateDraftRow): WorldwideBatch5Candidate {
  return sourceBackedCandidate(sourceCatalog, {
    ...input,
    publicationReadiness: "NEEDS_REVIEW",
    requiredBeforePublication: requiredBeforePublication[input.entityType],
  } satisfies CandidateInput);
}

const rows = [
  ...(part1 as CandidateDraftRow[]),
  ...(part2 as CandidateDraftRow[]),
  ...(part3 as CandidateDraftRow[]),
  ...(part4 as CandidateDraftRow[]),
  ...(part5 as CandidateDraftRow[]),
  ...(part6 as CandidateDraftRow[]),
] as const;

/**
 * Private NEEDS_REVIEW candidates (~14974).
 * Prefills listingLabel, bulk category, customer-facing summary and address for verification.
 * Does not publish. Chunked JSON keeps the TypeScript entrypoint loadable.
 */
export const worldwideBatch5Candidates: readonly WorldwideBatch5Candidate[] = rows.map(draft);
