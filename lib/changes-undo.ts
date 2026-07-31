import { type Change, undoValues } from "@/lib/changes";

/**
 * Putting a change back to what it said before.
 *
 * Simpler than restoring a deletion: the record still exists, so this is an
 * update with the old values and nothing can be orphaned.
 *
 * ONLY THE FIELDS THAT CHANGED are written back. Writing the whole record as
 * it was would undo anything else edited since — somebody corrects a phone
 * number at ten and a note at eleven, and putting the phone number back at
 * noon must not take the note with it.
 *
 * The undo is NOT logged as a change of its own. It would be true, and it
 * would also mean every undo left an entry offering to undo the undo, which is
 * a log that grows by being read.
 */

export type UndoResult = { ok: boolean; message: string };

async function prismaClient() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export async function undoChange(change: Change): Promise<UndoResult> {
  const values = undoValues(change);
  try {
    const prisma = await prismaClient();
    switch (change.kind) {
      case "town":
        await prisma.destination.update({ where: { slug: change.rowId }, data: values as never });
        break;
      case "page":
        await prisma.page.update({ where: { slug: change.rowId }, data: values as never });
        break;
      case "listing":
        await prisma.practicalPlace.update({ where: { id: change.rowId }, data: values as never });
        break;
      case "contact":
      case "cemetery-contact":
        await prisma.contact.update({ where: { id: change.rowId }, data: values as never });
        break;
      case "burial":
        await prisma.tzaddik.update({ where: { id: change.rowId }, data: values as never });
        break;
      case "business":
        await prisma.directoryProvider.update({ where: { slug: change.rowId }, data: values as never });
        break;
      default:
        return { ok: false, message: "That is not something this can put back." };
    }
    return { ok: true, message: `${change.title} says what it said before.` };
  } catch (error) {
    // Prisma carries its code as a PROPERTY, not in the message — matching on
    // the text alone silently missed every one of these and reported a
    // database failure instead of the thing that actually happened.
    const code = (error as { code?: string } | null)?.code ?? "";
    const said = String(error);
    // The record has since been deleted. It may be in the recycle bin — say
    // where to look rather than reporting a database error.
    if (code === "P2025" || /no record was found for an update/i.test(said)) {
      return {
        ok: false,
        message: `${change.title} has been deleted since. Look in Recently deleted — if it is there, put it back first.`,
      };
    }
    console.error("[changes] could not undo", change.id, error);
    return { ok: false, message: "Could not put it back. Nothing was altered." };
  }
}
