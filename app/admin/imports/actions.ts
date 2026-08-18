"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import {
  BULK_CONTENT_KINDS,
  contentImportCandidatePath,
  type BulkContentCandidateInput,
  type BulkContentKind,
} from "@/lib/bulk-content";
import {
  confirmLinkedKosherImportCandidate,
  keepBothContentImportCandidate,
  mergeContentImportCandidate,
  publishContentImportCandidate,
  setContentImportCandidateStatus,
  stageBuiltInContentBatch,
  updateContentImportCandidate,
} from "@/lib/content-imports";
import { isValidAccessToken } from "@/lib/secure-access";
import { VACATION_SOURCES_TAG } from "@/lib/vacation-sources";

export type ContentImportActionResult = { ok: boolean; message: string };

async function requireAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get("white_glove_admin")?.value;
  return isValidAccessToken("admin", cookie);
}

function text(formData: FormData, key: string, maximum = 4_000): string {
  const value = formData.get(key);
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > maximum) throw new Error(`${key} is too long.`);
  return result;
}

function nullable(formData: FormData, key: string, maximum?: number): string | null {
  const value = text(formData, key, maximum);
  return value || null;
}

function sourceEvidence(formData: FormData): unknown {
  const value = text(formData, "sourceEvidence", 10_000);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function candidateInput(formData: FormData): BulkContentCandidateInput {
  const kind = text(formData, "kind", 40);
  if (!BULK_CONTENT_KINDS.includes(kind as BulkContentKind)) throw new Error("Choose a supported content type.");
  return {
    kind: kind as BulkContentKind,
    category: nullable(formData, "category", 100),
    name: text(formData, "name", 240),
    aliases: text(formData, "aliases", 1_000).split(",").map((item) => item.trim()).filter(Boolean),
    city: text(formData, "city", 160),
    region: nullable(formData, "region", 160),
    country: text(formData, "country", 160),
    destinationSlug: nullable(formData, "destinationSlug", 160),
    address: nullable(formData, "address", 500),
    coordinates: nullable(formData, "coordinates", 80),
    website: nullable(formData, "website", 2_000),
    summary: nullable(formData, "summary", 1_500),
    anchorName: nullable(formData, "anchorName", 240),
    anchorCoords: nullable(formData, "anchorCoords", 80),
    kosherClaim: nullable(formData, "kosherClaim", 40),
    kosherSourceUrl: nullable(formData, "kosherSourceUrl", 2_000),
    sourceUrl: text(formData, "sourceUrl", 2_000),
    sourceId: text(formData, "sourceId", 300),
    sourceName: text(formData, "sourceName", 240),
    attribution: text(formData, "attribution", 500),
    license: nullable(formData, "license", 300),
    sourceEvidence: sourceEvidence(formData),
  };
}

function revalidatePublishedTripContent() {
  revalidatePath("/things-to-do");
  revalidatePath("/hotels");
  revalidatePath("/stops");
  revalidatePath("/itinerary");
  revalidatePath("/destinations");
  revalidatePath("/destinations/[destination]", "page");
  revalidatePath("/");
  updateTag(VACATION_SOURCES_TAG);
}

export async function stageBuiltInContentBatchAction(
  _previous: ContentImportActionResult | null,
  formData: FormData,
): Promise<ContentImportActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  try {
    const result = await stageBuiltInContentBatch(text(formData, "batchSlug", 160));
    revalidatePath("/admin/imports");
    return {
      ok: true,
      message: result.created
        ? `Staged ${result.created} source-backed candidates for review.`
        : `All ${result.total} source candidates are already in the review queue.`,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "The source batch could not be staged." };
  }
}

export async function reviewContentImportCandidateAction(
  _previous: ContentImportActionResult | null,
  formData: FormData,
): Promise<ContentImportActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const id = text(formData, "id", 120);
  const intent = text(formData, "intent", 40);
  if (!id) return { ok: false, message: "Missing import candidate." };

  try {
    if (intent === "reject" || intent === "reopen" || intent === "duplicate") {
      const status = intent === "reject" ? "REJECTED" : intent === "duplicate" ? "DUPLICATE" : "NEEDS_REVIEW";
      await setContentImportCandidateStatus(id, status);
      revalidatePath("/admin/imports");
      revalidatePath("/admin/imports/needs-review");
      revalidatePath(`/admin/imports/${id}`);
      return {
        ok: true,
        message:
          intent === "reject"
            ? "Candidate rejected. It remains in the private audit trail."
            : intent === "duplicate"
              ? "Marked as a duplicate. Both records were kept."
              : "Candidate returned to the review queue.",
      };
    }
    if (intent === "keep-both") {
      await keepBothContentImportCandidate(id);
      revalidatePath("/admin/imports");
      revalidatePath("/admin/imports/needs-review");
      revalidatePath(`/admin/imports/${id}`);
      return { ok: true, message: "Kept both. This pair will not be flagged again." };
    }
    if (intent === "merge") {
      const merged = await mergeContentImportCandidate(id);
      revalidatePath("/admin/imports");
      revalidatePath("/admin/imports/needs-review");
      revalidatePath(`/admin/imports/${id}`);
      return {
        ok: true,
        message: merged.aliasesAdded
          ? `Merged unique names onto ${merged.kept}. This candidate was kept as a duplicate record.`
          : `Marked as a duplicate of ${merged.kept}. Nothing was deleted.`,
      };
    }

    const updated = await updateContentImportCandidate(id, candidateInput(formData));
    if (intent === "confirm-linked") {
      const linked = await confirmLinkedKosherImportCandidate(id);
      revalidatePublishedTripContent();
      revalidatePath("/admin/imports");
      revalidatePath("/admin/imports/needs-review");
      revalidatePath(`/admin/imports/${id}`);
      revalidatePath(contentImportCandidatePath(updated.sourceId, updated.id));
      return { ok: true, message: `Linked to the verified public ${linked.kind} listing. This import row is complete.` };
    }
    if (intent === "publish") {
      const published = await publishContentImportCandidate(id);
      revalidatePublishedTripContent();
      revalidatePath("/admin/imports");
      revalidatePath(`/admin/imports/${id}`);
      revalidatePath(contentImportCandidatePath(updated.sourceId));
      return { ok: true, message: `Published as ${published.kind}. The public directories and search were refreshed.` };
    }

    revalidatePath("/admin/imports");
    revalidatePath(`/admin/imports/${id}`);
    revalidatePath(contentImportCandidatePath(updated.sourceId));
    return { ok: true, message: "Candidate saved. It remains private until you publish it." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "The review change could not be saved." };
  }
}
