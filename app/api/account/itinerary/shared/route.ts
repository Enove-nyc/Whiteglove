import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Itinerary } from "@/data/itinerary";
import {
  accountCookieName,
  getAccountData,
  getAccountRecord,
  getShareOwnerEmail,
  pushToAccountSubscribers,
  readSessionEmail,
  saveAccountItinerary,
  tripAccessFor,
} from "@/lib/account-store";
import { withoutAttachments } from "@/lib/attachments";
import { sendTripChangedForCollaboratorEmail, sendTripEditedEmail } from "@/lib/email";
import { isPhoneIdentity } from "@/lib/identity";
import { othersToTell, readCollaborators } from "@/lib/trip-roles";
import { describeEdits } from "@/lib/shared-trip-edit";

/**
 * Reading and changing a trip that belongs to somebody else.
 *
 * The owner's own trip goes through /api/account/itinerary. This is the door
 * for everybody he has shared it with, and it is a separate door on purpose:
 * the other one answers "is this your account", and this one has to answer
 * "what did its owner say you could do".
 *
 * EVERY ANSWER COMES FROM THE OWNER'S RECORD, READ NOW. Nothing is taken from
 * the request but the share token and the trip itself — no role, no claim about
 * who is asking beyond the signed session cookie. The browser is exactly where
 * somebody would say they were an editor.
 *
 * "NOT YOURS" AND "NOT THERE" GET THE SAME ANSWER. A share token that does not
 * exist and one belonging to a trip nobody shared with you both return 404, so
 * the endpoint cannot be used to find out whose links are real.
 */

async function whoAndWhat(request: NextRequest) {
  const shareId = request.nextUrl.searchParams.get("share")?.trim();
  if (!shareId) return { error: NextResponse.json({ error: "Name the trip." }, { status: 400 }) };

  const cookieStore = await cookies();
  const asker = readSessionEmail(cookieStore.get(accountCookieName())?.value);
  if (!asker) return { error: NextResponse.json({ error: "Please sign in first." }, { status: 401 }) };

  const owner = await getShareOwnerEmail(shareId);
  // The same 404 for a token that does not exist and one that is not yours.
  if (!owner) return { error: NextResponse.json({ error: "That trip is not here." }, { status: 404 }) };

  const access = await tripAccessFor(owner, asker);
  if (!access.canView) return { error: NextResponse.json({ error: "That trip is not here." }, { status: 404 }) };
  return { owner, asker, access };
}

export async function GET(request: NextRequest) {
  const found = await whoAndWhat(request);
  if ("error" in found) return found.error;
  const data = await getAccountData(found.owner);
  return NextResponse.json(
    {
      // Boarding passes and tickets never leave the account they were uploaded
      // to, whatever the role — an editor is somebody helping plan the trip,
      // not somebody who should hold a stranger's booking reference.
      itinerary: data.itinerary ? withoutAttachments(data.itinerary) : null,
      role: found.access.role,
      canComment: found.access.canComment,
      canEdit: found.access.canEdit,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const found = await whoAndWhat(request);
  if ("error" in found) return found.error;
  if (!found.access.canEdit) {
    // Said plainly rather than as a 404: they can see the trip, so pretending
    // it is not there would be a lie they can disprove by looking at it.
    return NextResponse.json({ error: "You can look at this trip but not change it." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { itinerary?: Itinerary; expectedUpdatedAt?: string }
    | null;
  if (!body?.itinerary) return NextResponse.json({ error: "Provide an itinerary." }, { status: 400 });

  // Saved WITHOUT attachments, because the copy an editor was given had none.
  // Writing back what they hold would strip the owner's own boarding passes
  // off his trip — the one way this feature could destroy something.
  const kept = await getAccountData(found.owner);

  /**
   * THE TRIP MUST NOT HAVE MOVED UNDER THEM.
   *
   * Two people can be in one trip at once — that is the whole point of an
   * editor. Without this, whoever presses save last silently wins: the owner
   * spends an evening adding four stops, an editor saves a copy fetched before
   * any of it, and the four stops are gone with nothing said to either of
   * them. Every other destructive path in this file is guarded (attachments
   * are merged back rather than overwritten); this is the same danger through
   * the front door.
   *
   * Refused rather than merged, deliberately: merging two itineraries without
   * being asked is guesswork about somebody's trip. Reloading and redoing a
   * few edits is a small cost; a silently deleted evening is not.
   *
   * A caller that sends no expectation is not refused — the field is new and
   * an older client should not start failing — but the panel always sends it.
   */
  if (body.expectedUpdatedAt && kept.itinerary?.updatedAt && kept.itinerary.updatedAt !== body.expectedUpdatedAt) {
    return NextResponse.json(
      {
        error: "This trip changed while you were editing. Reload to see the newest version, then make your changes again.",
        staleCopy: true,
      },
      { status: 409 },
    );
  }
  const merged = mergeKeepingAttachments(kept.itinerary, body.itinerary);
  const summary = describeEdits(kept.itinerary ?? merged, merged);
  const saved = await saveAccountItinerary(found.owner, merged);
  if (!saved) return NextResponse.json({ error: "Could not save the trip." }, { status: 503 });

  // Told, not merely done. Until this endpoint had a screen, nobody could
  // change somebody else's trip at all; the moment they could, the owner
  // needed telling. Awaited so the notification is attempted before the
  // response, but it can never fail the save — see tellTheOwner.
  await tellTheOwner(found.owner, found.asker, summary, request);
  return NextResponse.json({ ok: true });
}

/**
 * The editor's version, with the owner's attachments put back.
 *
 * An editor is served the trip with every boarding pass and ticket stripped
 * out, which is right — and it means what they send back has none either. Save
 * that as-is and the owner's own documents are gone, deleted by somebody who
 * never saw them and did not mean to touch them.
 *
 * So each flight, stay and stop keeps whatever attachments its own record had.
 * An item the editor deleted takes its attachments with it, which is correct:
 * an editor may remove a hotel, and its confirmation goes with the hotel.
 */
function mergeKeepingAttachments(before: Itinerary | undefined, after: Itinerary): Itinerary {
  if (!before) return after;
  const attachmentsById = new Map<string, unknown>();
  for (const list of [before.flights, before.lodging, before.activities]) {
    for (const item of list ?? []) {
      const held = (item as { attachments?: unknown }).attachments;
      if (held) attachmentsById.set(item.id, held);
    }
  }
  const restore = <T extends { id: string }>(items: T[] | undefined): T[] =>
    (items ?? []).map((item) =>
      attachmentsById.has(item.id) ? ({ ...item, attachments: attachmentsById.get(item.id) } as T) : item,
    );
  return {
    ...after,
    flights: restore(after.flights),
    lodging: restore(after.lodging),
    activities: restore(after.activities),
  };
}

/**
 * Tell the owner that somebody changed their trip.
 *
 * A note is a message and can wait to be read. An edit is the plan itself
 * moving — a stop taken out, a morning rearranged — and the owner may be about
 * to print it, send it to a client, or drive it. That is worth both an email
 * and, where they have turned notifications on, their phone.
 *
 * NOT WHEN THEY DID IT THEMSELVES. An owner can open their own share link, and
 * the role check calls them an owner, who may edit. Emailing somebody about
 * their own change is how people stop reading the emails.
 *
 * BEST EFFORT, LIKE EVERY OTHER NOTIFICATION HERE. The trip is already saved
 * before this runs, and nothing it does can fail that: no email key, an owner
 * signed in with a phone number and nowhere to send to, a provider refusing —
 * none of those is a reason the person who made the edit sees an error, or a
 * reason to lose an edit that is already stored.
 */
async function tellTheOwner(owner: string, editor: string, summary: string, request: NextRequest) {
  try {
    if (owner === editor) return;
    // Nothing changed is not news. Saving an untouched trip should not send
    // anybody an email saying so.
    if (summary === "Nothing changed yet") return;

    const [data, who] = await Promise.all([getAccountData(owner), getAccountRecord(editor)]);
    const name = who?.name?.trim() || editor;
    const title = data.itinerary?.title || "your trip";
    const shareId = data.itineraryShareId;

    const tripUrl = new URL(shareId ? `/i/${shareId}` : "/itinerary", request.nextUrl.origin).toString();

    if (!isPhoneIdentity(owner)) {
      await sendTripEditedEmail(owner, { fromName: name, tripTitle: title, summary, url: tripUrl });
    }

    // And the phone, where they asked to be told about their own trips —
    // see the account's own push subscriptions. The name is on it, because
    // "your trip changed" without saying who is a notification that makes
    // somebody open a page to find out one word.
    await pushToAccountSubscribers(owner, {
      title: `${name} changed ${title}`,
      body: summary,
      url: "/itinerary",
    });

    /**
     * And the other people building it with them.
     *
     * Editors and commenters only — see othersToTell. Somebody given "can
     * view" was shown a plan and did not ask to hear each time a stop was
     * renamed; somebody given a role that lets them contribute is helping
     * build this and wants to know it moved under them.
     *
     * One at a time, each failure swallowed, so a bad address halfway down
     * the list does not stop the rest.
     */
    for (const person of othersToTell(readCollaborators(data.itineraryCollaborators), owner, editor)) {
      if (isPhoneIdentity(person)) continue;
      await sendTripChangedForCollaboratorEmail(person, { fromName: name, tripTitle: title, summary, url: tripUrl }).catch(
        () => undefined,
      );
    }
  } catch {
    // The edit is saved. That is the part that mattered.
  }
}
