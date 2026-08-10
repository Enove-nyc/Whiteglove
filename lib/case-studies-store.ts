/**
 * Admin-managed case studies. Public list is only complete + approved + permitted.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import {
  caseStudyCompleteness,
  caseStudyIsPublic,
  sortCaseStudiesForPublic,
  type CaseStudy,
  type CaseStudyDraft,
} from "@/data/case-studies";

const KEY = "white-glove:case-studies";
export const CASE_STUDIES_TAG = "case-studies";

export function caseStudiesStoreAvailable() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cleanList(raw: unknown): CaseStudy[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index): CaseStudy | null => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      if (typeof e.id !== "string" || typeof e.attribution !== "string") return null;
      return {
        id: e.id,
        attribution: asString(e.attribution),
        anonymised: Boolean(e.anonymised),
        location: asString(e.location),
        tripType: asString(e.tripType),
        quote: asString(e.quote),
        tripRequest: asString(e.tripRequest),
        whatSolved: asString(e.whatSolved),
        outcome: asString(e.outcome),
        itineraryHref: asString(e.itineraryHref),
        permissionRecorded: Boolean(e.permissionRecorded),
        approved: Boolean(e.approved),
        approvedAt: asString(e.approvedAt),
        sortOrder: typeof e.sortOrder === "number" && Number.isFinite(e.sortOrder) ? e.sortOrder : index,
        createdAt: asString(e.createdAt) || new Date(0).toISOString(),
        updatedAt: asString(e.updatedAt) || new Date(0).toISOString(),
      };
    })
    .filter((entry): entry is CaseStudy => entry !== null);
}

async function readAll(): Promise<CaseStudy[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    return cleanList(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function writeAll(list: CaseStudy[]): Promise<boolean> {
  return (await redis(`set/${KEY}`, JSON.stringify(list))) !== null;
}

const cachedPublic = unstable_cache(
  async (): Promise<CaseStudy[]> => sortCaseStudiesForPublic((await readAll()).filter(caseStudyIsPublic)),
  ["case-studies-public"],
  { tags: [CASE_STUDIES_TAG], revalidate: 3600 },
);

export async function readPublicCaseStudies(): Promise<CaseStudy[]> {
  if (!caseStudiesStoreAvailable()) return [];
  return cachedPublic();
}

export async function readCaseStudiesFresh(): Promise<CaseStudy[]> {
  if (!caseStudiesStoreAvailable()) return [];
  return sortCaseStudiesForPublic(await readAll());
}

function stale() {
  updateTag(CASE_STUDIES_TAG);
  revalidatePath("/about");
  revalidatePath("/");
  revalidatePath("/case-studies");
  revalidatePath("/admin/settings/proof");
  revalidatePath("/sitemap.xml");
}

function newId() {
  return `cs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function upsertCaseStudy(draft: CaseStudyDraft): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!caseStudiesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };

  const list = await readAll();
  const now = new Date().toISOString();
  const existing = draft.id ? list.find((s) => s.id === draft.id) : undefined;

  const next: CaseStudy = {
    id: existing?.id ?? draft.id ?? newId(),
    attribution: (draft.attribution ?? "").trim(),
    anonymised: Boolean(draft.anonymised),
    location: (draft.location ?? "").trim(),
    tripType: (draft.tripType ?? "").trim(),
    quote: (draft.quote ?? "").trim(),
    tripRequest: (draft.tripRequest ?? "").trim(),
    whatSolved: (draft.whatSolved ?? "").trim(),
    outcome: (draft.outcome ?? "").trim(),
    itineraryHref: (draft.itineraryHref ?? "").trim(),
    permissionRecorded: Boolean(draft.permissionRecorded),
    approved: Boolean(draft.approved),
    approvedAt: "",
    sortOrder: existing
      ? (typeof draft.sortOrder === "number" && Number.isFinite(draft.sortOrder)
          ? draft.sortOrder
          : existing.sortOrder)
      : list.length,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  // Withdrawing permission removes the study from every public surface.
  if (!next.permissionRecorded) {
    next.approved = false;
    next.approvedAt = "";
  }

  // Approval is gated — incomplete or unpermitted studies cannot go public.
  if (next.approved) {
    const problem = caseStudyCompleteness(next);
    if (problem) return { ok: false, message: problem };
    next.approvedAt = existing?.approved && existing.approvedAt ? existing.approvedAt : now;
  } else {
    next.approvedAt = "";
  }

  const without = list.filter((s) => s.id !== next.id);
  if (!(await writeAll(sortCaseStudiesForPublic([next, ...without])))) {
    return { ok: false, message: "Could not save. Try again." };
  }
  stale();
  return {
    ok: true,
    id: next.id,
    message: next.approved
      ? "Saved and approved — it can appear on the public site."
      : "Saved as a draft. Nothing public until it is complete, permitted, and approved.",
  };
}

export async function setCaseStudyApproved(
  id: string,
  approved: boolean,
): Promise<{ ok: boolean; message: string }> {
  if (!caseStudiesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  const list = await readAll();
  const existing = list.find((s) => s.id === id);
  if (!existing) return { ok: false, message: "That case study was not found." };

  if (approved) {
    const problem = caseStudyCompleteness(existing);
    if (problem) return { ok: false, message: problem };
  }

  const next: CaseStudy = {
    ...existing,
    approved,
    approvedAt: approved ? existing.approvedAt || new Date().toISOString() : "",
    updatedAt: new Date().toISOString(),
  };

  if (!(await writeAll(list.map((s) => (s.id === id ? next : s))))) {
    return { ok: false, message: "Could not update. Try again." };
  }
  stale();
  return {
    ok: true,
    message: approved ? "Published on the public site." : "Unpublished — removed from every public surface.",
  };
}

export async function reorderCaseStudy(
  id: string,
  direction: "up" | "down",
): Promise<{ ok: boolean; message: string }> {
  if (!caseStudiesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  const list = sortCaseStudiesForPublic(await readAll());
  const index = list.findIndex((s) => s.id === id);
  if (index < 0) return { ok: false, message: "That case study was not found." };
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= list.length) return { ok: true, message: "Already at the end." };

  const a = list[index]!;
  const b = list[swapWith]!;
  const aOrder = a.sortOrder;
  list[index] = { ...a, sortOrder: b.sortOrder, updatedAt: new Date().toISOString() };
  list[swapWith] = { ...b, sortOrder: aOrder, updatedAt: new Date().toISOString() };

  if (!(await writeAll(list))) return { ok: false, message: "Could not reorder. Try again." };
  stale();
  return { ok: true, message: "Order updated." };
}

export async function deleteCaseStudy(id: string): Promise<{ ok: boolean; message: string }> {
  if (!caseStudiesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  const list = await readAll();
  if (!(await writeAll(list.filter((s) => s.id !== id)))) return { ok: false, message: "Could not delete. Try again." };
  stale();
  return { ok: true, message: "Removed." };
}
