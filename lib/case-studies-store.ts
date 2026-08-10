/**
 * Admin-managed case studies. Public list is only complete + approved + permitted.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { caseStudyCompleteness, caseStudyIsPublic, type CaseStudy, type CaseStudyDraft } from "@/data/case-studies";

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

function cleanList(raw: unknown): CaseStudy[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is CaseStudy => {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as CaseStudy;
    return typeof e.id === "string" && typeof e.attribution === "string";
  });
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
  async (): Promise<CaseStudy[]> => (await readAll()).filter(caseStudyIsPublic),
  ["case-studies-public"],
  { tags: [CASE_STUDIES_TAG], revalidate: 3600 },
);

export async function readPublicCaseStudies(): Promise<CaseStudy[]> {
  if (!caseStudiesStoreAvailable()) return [];
  return cachedPublic();
}

export async function readCaseStudiesFresh(): Promise<CaseStudy[]> {
  if (!caseStudiesStoreAvailable()) return [];
  return readAll();
}

function stale() {
  updateTag(CASE_STUDIES_TAG);
  revalidatePath("/about");
  revalidatePath("/");
  revalidatePath("/admin/settings/proof");
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
    tripRequest: (draft.tripRequest ?? "").trim(),
    whatSolved: (draft.whatSolved ?? "").trim(),
    outcome: (draft.outcome ?? "").trim(),
    permissionRecorded: Boolean(draft.permissionRecorded),
    approved: Boolean(draft.approved),
    approvedAt: "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  // Approval is gated — incomplete or unpermitted studies cannot go public.
  if (next.approved) {
    const problem = caseStudyCompleteness(next);
    if (problem) return { ok: false, message: problem };
    next.approvedAt = existing?.approved && existing.approvedAt ? existing.approvedAt : now;
  } else {
    next.approvedAt = "";
  }

  const without = list.filter((s) => s.id !== next.id);
  if (!(await writeAll([next, ...without]))) return { ok: false, message: "Could not save. Try again." };
  stale();
  return {
    ok: true,
    id: next.id,
    message: next.approved
      ? "Saved and approved — it can appear on the public site."
      : "Saved as a draft. Nothing public until it is complete, permitted, and approved.",
  };
}

export async function deleteCaseStudy(id: string): Promise<{ ok: boolean; message: string }> {
  if (!caseStudiesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  const list = await readAll();
  if (!(await writeAll(list.filter((s) => s.id !== id)))) return { ok: false, message: "Could not delete. Try again." };
  stale();
  return { ok: true, message: "Removed." };
}
