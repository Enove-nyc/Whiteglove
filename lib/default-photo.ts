import type { DestinationPhoto } from "@/lib/vacation-destinations-view";

/**
 * The site-wide branded fallback, shown wherever a photograph belongs but none
 * has been published yet.
 *
 * It is White Glove's own aircraft — the wordmark on the fuselage, the
 * hand-and-compass mark on the tail — not a stock photo of the place. That is
 * the whole reason it is allowed to fill a frame the destination cards and hero
 * were built to leave empty (components/VacationCard.tsx, app/page.tsx): it
 * makes no claim to be a picture of Rome, so it is never the one thing on the
 * card that is not true of the town. It reads as "White Glove", which is what a
 * blank navy box never did. When a real, credited photograph lands for a place,
 * it takes this one's spot in the same frame and nothing else moves.
 */
export const DEFAULT_PHOTO = "/default-photo.png";

/**
 * The first published, credited photograph of a place, or the branded default.
 *
 * The view already holds a picture back to draft until it has a credit
 * (lib/vacation-destinations-view.ts), so anything reaching here may be shown.
 */
export function destinationPhotoSrc(photos: readonly DestinationPhoto[] | undefined): string {
  return photos?.[0]?.url ?? DEFAULT_PHOTO;
}
