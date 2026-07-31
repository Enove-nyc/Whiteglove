import { type Promotion, restorePromotion } from "@/lib/admin-content";
import { type Deleted } from "@/lib/recycle";

/**
 * Putting a deleted record back.
 *
 * It comes back AS ITSELF — the same id it had — rather than as a copy. A
 * restored shomer with a new id is a different row to anything that referred
 * to it, and the owner would have no way to tell the two apart in a list.
 *
 * WHAT CAN FAIL, and what is said when it does: the thing it belonged to may
 * be gone. A kever whose beis hachaim was deleted afterwards has nowhere to go
 * back to, and writing it with a dangling parent id would either be refused by
 * the database or produce exactly the orphan this admin already has a screen
 * for. So it is refused, in words, and the entry stays in the bin.
 */

export type RestoreResult = { ok: boolean; message: string };

async function prismaClient() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export async function restoreDeleted(entry: Deleted): Promise<RestoreResult> {
  try {
    switch (entry.kind) {
      case "contact":
      case "cemetery-contact": {
        const prisma = await prismaClient();
        const row = entry.payload as never;
        await prisma.contact.create({ data: row });
        return { ok: true, message: `${entry.title} is back.` };
      }
      case "burial": {
        const prisma = await prismaClient();
        await prisma.tzaddik.create({ data: entry.payload as never });
        return { ok: true, message: `${entry.title} is back.` };
      }
      case "listing": {
        const prisma = await prismaClient();
        await prisma.practicalPlace.create({ data: entry.payload as never });
        return { ok: true, message: `${entry.title} is back.` };
      }
      case "business": {
        const prisma = await prismaClient();
        await prisma.directoryProvider.create({ data: entry.payload as never });
        return { ok: true, message: `${entry.title} is back.` };
      }
      case "advertisement":
        return restorePromotion(entry.payload as unknown as Promotion);
      default:
        return { ok: false, message: "That is not something this can put back." };
    }
  } catch (error) {
    // Prisma carries its code as a PROPERTY, not in the message. Matched on
    // both, so a change to either still finds it.
    const code = (error as { code?: string } | null)?.code ?? "";
    const said = String(error);
    // The commonest real failure, said in the words of the problem rather
    // than the words of the database.
    if (code === "P2003" || /foreign key/i.test(said)) {
      return {
        ok: false,
        message: `The place ${entry.title} belonged to has been deleted too, so there is nowhere to put it back. It is still here.`,
      };
    }
    if (code === "P2002" || /unique constraint/i.test(said)) {
      return { ok: false, message: `${entry.title} is already there.` };
    }
    console.error("[recycle] could not restore", entry.id, error);
    return { ok: false, message: "Could not put it back. It is still here — nothing was lost." };
  }
}
