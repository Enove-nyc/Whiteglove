"use server";

import type { CurrentUpdateDraft, UpdateKind } from "@/data/current-updates";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import {
  currentUpdatesStoreAvailable,
  deleteUpdate,
  setUpdatePublished,
  upsertUpdate,
} from "@/lib/current-updates-store";

export type ActionResult = { ok: boolean; message: string };

/**
 * The same gate every other content screen uses. "content" rather than
 * "access": a dated notice about a restaurant is editorial work, not a
 * settings change, so a helper trusted with the directory can write one.
 */
async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "content")) return { ok: false, message: "Your sign-in does not cover content." };
  if (!currentUpdatesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

export async function saveUpdateAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const draft: CurrentUpdateDraft = {
    id: String(form.get("id") ?? "").trim() || undefined,
    kind: String(form.get("kind") ?? "other") as UpdateKind,
    title: String(form.get("title") ?? ""),
    detail: String(form.get("detail") ?? ""),
    destinationSlug: String(form.get("destinationSlug") ?? ""),
    startsOn: String(form.get("startsOn") ?? ""),
    endsOn: String(form.get("endsOn") ?? ""),
    source: String(form.get("source") ?? ""),
    published: form.get("published") === "on",
  };

  const result = await upsertUpdate(draft);
  return { ok: result.ok, message: result.message };
}

export async function publishUpdateAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Nothing to publish." };
  return setUpdatePublished(id, form.get("published") === "on");
}

export async function deleteUpdateAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Nothing to delete." };
  return deleteUpdate(id);
}
