"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getPageDef } from "@/data/pages";
import { parseBlocks } from "@/data/page-blocks";
import { isValidAccessToken } from "@/lib/secure-access";

export type ActionResult = { ok: boolean; message: string };

async function requireAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get("white_glove_admin")?.value;
  return isValidAccessToken("admin", cookie);
}

/**
 * Save a page.
 *
 * Publishing writes the blocks and makes them live. Saving a draft writes them
 * too, but the public page keeps showing its previous version, because
 * `resolvePage` only accepts a row whose status is PUBLISHED.
 */
export async function savePageAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };

  const slug = String(formData.get("slug") ?? "");
  const def = getPageDef(slug);
  if (!def) return { ok: false, message: "That is not a page you can edit." };

  const publish = formData.get("publish") === "1";
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();

  let blocks;
  try {
    blocks = parseBlocks(JSON.parse(String(formData.get("blocks") ?? "[]")));
  } catch {
    return { ok: false, message: "Something went wrong reading the page. Nothing was saved." };
  }
  if (!blocks?.length) {
    return { ok: false, message: "A page needs at least one section. Add one before saving." };
  }

  const hero = blocks.find((b) => b.kind === "hero");
  const title = (hero && hero.kind === "hero" && hero.heading) || def.label;

  try {
    const { prisma } = await import("@/lib/prisma");
    const data = {
      title,
      blocks: blocks as unknown as object,
      seoTitle,
      seoDescription,
      status: publish ? ("PUBLISHED" as const) : ("DRAFT" as const),
    };
    await prisma.page.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  } catch (error) {
    console.error("[pages] save failed:", error);
    return {
      ok: false,
      message: "Could not save. The content database may not be connected — check Settings, then Connections.",
    };
  }

  revalidatePath(def.href);
  revalidatePath("/admin/pages");
  return {
    ok: true,
    message: publish
      ? `Published. ${def.label} is live on the website now.`
      : "Saved as a draft. The website still shows the previous version.",
  };
}

/** Put a page back to the version it ships with, discarding every edit. */
export async function resetPageAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = String(formData.get("slug") ?? "");
  const def = getPageDef(slug);
  if (!def) return { ok: false, message: "That is not a page you can edit." };

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.page.deleteMany({ where: { slug } });
  } catch (error) {
    console.error("[pages] reset failed:", error);
    return { ok: false, message: "Could not undo. Try again." };
  }

  revalidatePath(def.href);
  revalidatePath("/admin/pages");
  return { ok: true, message: `${def.label} is back to how it started.` };
}
