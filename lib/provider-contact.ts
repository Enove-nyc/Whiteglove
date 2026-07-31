/**
 * Whether a provider's phone number may go on a public page, and what the site
 * is allowed to say about having checked them.
 *
 * The directory lists other people's businesses. Some are agencies with a
 * switchboard whose number is printed on their own website; some are one
 * person with a mobile who mentioned it once. Publishing the first is
 * repeating what they already published. Publishing the second is a decision
 * somebody has to have actually made.
 *
 * So a number is shown when there is a reason it can be, and withheld when
 * there is not. Withheld, not deleted: the record keeps it so the owner can
 * ring them.
 */

export type ContactReason = "consent" | "public-source" | "none";

export type ContactVisibility = {
  show: boolean;
  reason: ContactReason;
  /** For the admin: why this number is or is not on the page. */
  explanation: string;
};

export type ProviderConsent = {
  /** Somebody asked and they said yes. */
  contactConsent?: boolean | null;
  /** Where the listing came from — a public page of theirs, usually. */
  source?: string | null;
};

/**
 * A number is publishable on either of two grounds.
 *
 * CONSENT — somebody asked them. This is the strong one and it is the only
 * ground for a number nobody else has published.
 *
 * A PUBLIC SOURCE — the listing was built from a page where the business
 * prints its own number. Repeating that is not disclosure; it is a link with
 * the digits copied out. Requiring consent even here would empty the directory
 * of every legitimately public agency number on the day this shipped, which
 * protects nobody.
 *
 * Neither: the number stays in the record and off the page.
 */
export function contactVisibility(provider: ProviderConsent): ContactVisibility {
  if (provider.contactConsent) {
    return { show: true, reason: "consent", explanation: "They agreed to it being listed." };
  }
  if (provider.source?.trim()) {
    return { show: true, reason: "public-source", explanation: "Published by them at the source on file." };
  }
  return {
    show: false,
    reason: "none",
    explanation: "Held but not shown — nobody has recorded permission, and there is no public source for it.",
  };
}

/**
 * The number as it may appear on a page, given the grounds for showing it.
 *
 * Grounds are passed in separately rather than read off the record, so every
 * caller has to say out loud what its justification is. A consent flag that
 * travelled along inside the object would also end up serialised into the
 * page, which is nobody's business but the owner's.
 */
export function publishableContact(
  contact: { phone?: string | null; whatsapp?: string | null },
  grounds: ProviderConsent,
): { phone: string | null; whatsapp: string | null; contactWithheld: boolean } {
  const visible = contactVisibility(grounds).show;
  const hadContact = Boolean(contact.phone?.trim() || contact.whatsapp?.trim());
  return {
    phone: visible ? contact.phone ?? null : null,
    whatsapp: visible ? contact.whatsapp ?? null : null,
    // Only "withheld" if there was something to withhold. A provider who never
    // gave a number has not had one held back.
    contactWithheld: !visible && hadContact,
  };
}

/**
 * What the site may say about having checked a provider.
 *
 * Only a positive claim, and only when there is a date behind it. An
 * unverified listing gets nothing rather than "unverified" — this is somebody
 * else's business, and stamping a public page with a judgement on it is a
 * different act from marking our own content as unfinished. The page already
 * carries a blanket line saying nothing here is endorsed.
 *
 * The admin sees the full state; that is the right place for it.
 */
export function verifiedLabel(verifiedAt?: string | Date | null): string | null {
  if (!verifiedAt) return null;
  const date = verifiedAt instanceof Date ? verifiedAt : new Date(verifiedAt);
  if (Number.isNaN(date.getTime())) return null;
  const on = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return `Details checked ${on}`;
}

/**
 * How quickly they answer, tidied.
 *
 * Free text on purpose — "same day" is a description somebody can stand
 * behind; a number of hours implies a measurement nobody is taking. Rendered
 * as their words, not as a promise the site is making, so it is prefixed
 * where it appears.
 */
export function responseNote(responseTime?: string | null): string | null {
  const value = responseTime?.trim();
  return value ? value : null;
}
