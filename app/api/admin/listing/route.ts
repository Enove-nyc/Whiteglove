import { NextRequest, NextResponse } from "next/server";
import { bustTag } from "@/lib/cache-tags";
import { DIRECTORY_PUBLIC_TAG } from "@/lib/directory";
import { directoryStoreAvailable, listStoredProviders, saveStoredProvider } from "@/lib/directory-store";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";
import {
  cleanQuickEdit,
  isQuickEditKind,
  quickEditProblem,
  type QuickEditFields,
  type QuickEditKind,
} from "@/data/listing-quick-edit";

export const dynamic = "force-dynamic";

/**
 * SAVE THE EVERYDAY FIELDS OF ONE LISTING, whatever kind it is.
 *
 * One door for the panel that View now opens, rather than six. Each kind still
 * writes through its own store — this only chooses which — because a listing's
 * real editor and its rules belong to that store and are not duplicated here.
 *
 * IT REFUSES RATHER THAN PRETENDING. A listing the site ships in a data file
 * has no row to update, and this says so with a 409 and a sentence the owner
 * can act on. The panel never offers Save for one of those in the first place;
 * this is the door holding the same line, because a disabled button is a
 * courtesy and not a control.
 */

function admin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

/** Kinds whose store can take a partial update today. */
const SAVABLE: Record<QuickEditKind, boolean> = {
  business: true,
  town: true,
  food: true,
  stay: true,
  // A beis hachaim has no field-level update in lib/content-admin.ts — only
  // its contacts and burials do. Editing its name here would need a writer
  // that does not exist, and inventing a half one is worse than saying so.
  kever: false,
  // Attractions are read from the site's own data file; an owner-added one is
  // added through /admin/add and has no update path of its own yet.
  attraction: false,
};

const WHY_NOT: Partial<Record<QuickEditKind, string>> = {
  kever: "A beis hachaim is changed in its own editor — its contacts and burials are what this admin can write.",
  attraction: "This one comes from the site's own list rather than the database, so there is no row here to change.",
};

async function saveBusiness(id: string, fields: QuickEditFields): Promise<string | null> {
  if (!directoryStoreAvailable()) return "The private store isn't connected.";
  // Read first: the panel holds a handful of fields and the record holds many,
  // so a blind write would drop everything the panel never showed.
  const existing = (await listStoredProviders()).find((p) => p.id === id);
  if (!existing) return "That business is no longer there.";
  const saved = await saveStoredProvider({
    ...existing,
    name: fields.name,
    basedIn: fields.city,
    phone: fields.phone,
    website: fields.website,
    description: fields.description,
  });
  if (!saved) return "Could not save that just now.";
  await bustTag(DIRECTORY_PUBLIC_TAG);
  return null;
}

async function saveThroughContentAdmin(kind: QuickEditKind, id: string, fields: QuickEditFields): Promise<string | null> {
  // Imported here rather than at the top: lib/content-admin.ts reaches for
  // Prisma, and a deployment with no database should still be able to save a
  // business, which does not need it.
  const admin = await import("@/lib/content-admin");
  if (!admin.isDbEnabled()) return "The content database isn't connected.";

  if (kind === "town") {
    const prisma = (await import("@/lib/prisma")).prisma;
    const before = await prisma.destination.findUnique({ where: { slug: id } });
    if (!before) return "That destination is no longer there.";
    await admin.updateDestinationFields(id, {
      city: fields.name || before.city,
      yiddishCity: before.yiddishCity ?? "",
      country: fields.country || before.country,
      overview: before.overview,
      summary: fields.description || before.summary,
      safetyNote: before.safetyNote,
      status: fields.published ? "PUBLISHED" : "DRAFT",
    });
    return null;
  }

  if (kind === "food") {
    const prisma = (await import("@/lib/prisma")).prisma;
    const before = await prisma.practicalPlace.findUnique({ where: { id } });
    if (!before) return "That place is no longer there.";
    // Everything the panel does not show is carried over from the record, so
    // a quick correction never blanks a field somebody filled in elsewhere.
    await admin.updatePlace(id, {
      category: before.category,
      name: fields.name,
      address: before.address,
      phone: fields.phone || null,
      whatsapp: before.whatsapp,
      email: before.email,
      website: fields.website || null,
      hours: before.hours,
      notes: fields.description || null,
      status: fields.published ? "PUBLISHED" : "DRAFT",
      verification: before.verification,
      sourceUrl: before.sourceUrl,
      lastVerified: before.lastVerified,
    });
    return null;
  }

  if (kind === "stay") {
    const prisma = (await import("@/lib/prisma")).prisma;
    const before = await prisma.kosherStay.findUnique({ where: { slug: id } });
    if (!before) return "That stay is no longer there.";
    await admin.updateKosherStay(id, {
      name: fields.name,
      city: fields.city || before.city,
      country: fields.country || before.country,
      kind: before.kind,
      summary: fields.description || before.summary,
      anchorName: before.anchorName ?? "",
      anchorCoords: before.anchorCoords ?? "",
      season: before.season,
      kosherClaim: before.kosherClaim ?? "",
      website: fields.website || null,
      notes: before.notes ?? [],
      sourceUrl: before.sourceUrl ?? "",
    } as Parameters<typeof admin.updateKosherStay>[1]);
    return null;
  }

  return "That kind cannot be changed from here.";
}

export async function POST(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { kind?: unknown; id?: unknown; fields?: Partial<QuickEditFields> }
    | null;
  const kind = body?.kind;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!isQuickEditKind(kind) || !id) {
    return NextResponse.json({ error: "Say which listing to change." }, { status: 400 });
  }
  if (!SAVABLE[kind]) {
    return NextResponse.json({ error: WHY_NOT[kind] ?? "That kind cannot be changed from here." }, { status: 409 });
  }

  const fields = cleanQuickEdit({
    name: String(body?.fields?.name ?? ""),
    city: String(body?.fields?.city ?? ""),
    country: String(body?.fields?.country ?? ""),
    phone: String(body?.fields?.phone ?? ""),
    website: String(body?.fields?.website ?? ""),
    description: String(body?.fields?.description ?? ""),
    published: Boolean(body?.fields?.published),
  });
  const problem = quickEditProblem(fields);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const failure = kind === "business" ? await saveBusiness(id, fields) : await saveThroughContentAdmin(kind, id, fields);
    if (failure) return NextResponse.json({ error: failure }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // The real reason goes to the log; the owner gets a sentence he can act on.
    console.error("[admin/listing] save failed:", err);
    return NextResponse.json({ error: "Could not save that just now." }, { status: 503 });
  }
}
