/**
 * THE EVERYDAY FIELDS OF A LISTING, and whether this one can be saved at all.
 *
 * WHY THIS EXISTS. Pressing View on a row in the admin went to the public page
 * the listing appears on — which for a business was the whole directory with no
 * anchor to scroll to, and for an attraction was a list that loads 24 at a time
 * so the anchor was not on the page yet. Either way you landed at the top of a
 * list and had to find your own row again. And for anything not published there
 * was nothing public to land on at all.
 *
 * So View opens a panel instead: the listing as it stands, the handful of
 * fields anybody actually corrects in passing, Save, and back to the list.
 *
 * NOT EVERY LISTING CAN BE SAVED, AND THAT IS THE IMPORTANT PART. Some of what
 * this admin lists is shipped in the site's own data files rather than held in
 * a store — a kosher eatery in data/kosher-eateries.ts has no row to update.
 * A panel offering an editable field and a Save button for one of those would
 * be a lie: the button would appear to work and change nothing. So savability
 * is a fact carried on the listing, decided by where it actually came from, and
 * a listing that cannot be saved says so and points at where the change is
 * really made.
 *
 * Pure, so what is editable and what a bad edit says can be tested without a
 * database.
 */

export const QUICK_EDIT_KINDS = ["business", "kever", "town", "attraction", "stay", "food"] as const;
export type QuickEditKind = (typeof QUICK_EDIT_KINDS)[number];

export function isQuickEditKind(value: unknown): value is QuickEditKind {
  return typeof value === "string" && (QUICK_EDIT_KINDS as readonly string[]).includes(value);
}

/**
 * The fields worth correcting without opening the full editor.
 *
 * Deliberately short. This is the panel you use when you notice a phone number
 * is wrong, not the one you build a destination page in — everything else is a
 * click away in the real editor, and pretending otherwise would mean six
 * different long forms behind one button.
 */
export type QuickEditFields = {
  name: string;
  city: string;
  country: string;
  phone: string;
  website: string;
  description: string;
  /** Whether it is live on the public site. */
  published: boolean;
};

export function emptyQuickEdit(): QuickEditFields {
  return { name: "", city: "", country: "", phone: "", website: "", description: "", published: false };
}

/** One listing as the panel sees it. */
export type QuickListing = {
  kind: QuickEditKind;
  /** Whatever identifies it to its own store — a slug, or a database id. */
  id: string;
  fields: QuickEditFields;
  /**
   * Whether Save will actually do anything. False for a listing the site ships
   * in a data file, which has no row behind it to update.
   */
  savable: boolean;
  /** Said plainly when savable is false, so the panel never just greys out. */
  whyNot?: string;
  /** The full editor, for everything this panel deliberately leaves out. */
  fullEditHref: string;
};

/** Long enough for a real name, short enough that the row stays readable. */
export const MAX_NAME = 120;
export const MAX_DESCRIPTION = 600;

/** The first problem, in the owner's words, or null. One thing at a time. */
export function quickEditProblem(fields: QuickEditFields): string | null {
  const name = fields.name.trim();
  if (!name) return "Give it a name.";
  if (name.length > MAX_NAME) return `Keep the name under ${MAX_NAME} characters.`;
  if (fields.description.trim().length > MAX_DESCRIPTION) {
    return `Keep the description under ${MAX_DESCRIPTION} characters — the full editor is the place for more.`;
  }
  const site = fields.website.trim();
  if (site && !/^https?:\/\//i.test(site)) return "A website needs to start with http:// or https://.";
  return null;
}

/** Trimmed, so a stray space never becomes a saved difference. */
export function cleanQuickEdit(fields: QuickEditFields): QuickEditFields {
  return {
    name: fields.name.trim(),
    city: fields.city.trim(),
    country: fields.country.trim(),
    phone: fields.phone.trim(),
    website: fields.website.trim(),
    description: fields.description.trim(),
    published: fields.published,
  };
}

/** Whether anything actually changed, so Save on an untouched panel is a no-op. */
export function hasChanges(before: QuickEditFields, after: QuickEditFields): boolean {
  const a = cleanQuickEdit(before);
  const b = cleanQuickEdit(after);
  return (Object.keys(a) as Array<keyof QuickEditFields>).some((key) => a[key] !== b[key]);
}

/**
 * What the panel says about a listing that is not live yet.
 *
 * This is the whole answer to "what does View do for an unpublished listing":
 * there is no public page to open, so the panel IS the preview, and it says
 * which state the listing is in rather than looking identical to a live one.
 */
export function publishedLine(published: boolean): string {
  return published ? "Live on the site" : "Not published yet — only you can see this";
}
