import { heritageTownHref } from "@/lib/route-migration";
/**
 * The rules a picture has to satisfy, away from the screen and the database.
 *
 * Two of them, and both are about not publishing something the site cannot
 * defend publishing.
 */

/** What a picture can be of. Exactly one — never two. */
export const PHOTO_OWNER_KINDS = ["destination", "cemetery", "place"] as const;
export type PhotoOwnerKind = (typeof PHOTO_OWNER_KINDS)[number];

export function isPhotoOwnerKind(value: string): value is PhotoOwnerKind {
  return (PHOTO_OWNER_KINDS as readonly string[]).includes(value);
}

export type PhotoDecision = {
  status: "DRAFT" | "PUBLISHED";
  message: string;
  /** True when the request was to publish and the credit sent it back to draft. */
  heldBack: boolean;
};

/**
 * Whether this picture may go on the site.
 *
 * A photograph belongs to whoever took it, and the site cannot publish one on
 * the strength of having found it. So publishing without a credit is not
 * refused — it is saved as a draft and says so. Upload it, find out whose it
 * is, then publish. Refusing outright would lose the upload; publishing anyway
 * would put somebody else's picture on a commercial page with no attribution.
 *
 * Whitespace is not a credit. " " passes a truthiness check and says nothing.
 */
export function photoDecision(requested: string, credit: string | null, isNew: boolean): PhotoDecision {
  const wantsPublished = requested === "PUBLISHED";
  const credited = Boolean(credit?.trim());
  if (wantsPublished && !credited) {
    return {
      status: "DRAFT",
      message: "Saved as a draft — a picture needs a credit before it goes on the site.",
      heldBack: true,
    };
  }
  return {
    status: wantsPublished ? "PUBLISHED" : "DRAFT",
    message: isNew ? "Picture added." : "Picture updated.",
    heldBack: false,
  };
}

/**
 * The pages a picture could have changed, by what it is of.
 *
 * A picture of a beis hachaim is not on a destination page and never was.
 * Revalidating the town would have refreshed the one page it cannot appear on
 * and left the one it does appear on stale until the next window.
 *
 * A listing lives on its town's page, so it refreshes the same paths the town
 * does — which is why the two share an answer here.
 */
export function pathsToRefresh(kind: string, slug: string): string[] {
  if (kind === "cemetery") return [`/cemeteries/${slug}`, "/cemeteries", "/admin/kevarim"];
  return [`/${slug}`, heritageTownHref(slug), "/admin/destinations"];
}
