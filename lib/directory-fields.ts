import type { StoredProvider } from "@/lib/directory-store";

/**
 * What a directory listing is made of — written once, used everywhere.
 *
 * The owner's admin form had its fields; the public "list your business" form
 * had a different, smaller set, and mashed them into a paragraph of prose that
 * arrived in the review queue as text. Accepting one meant reading the
 * paragraph and retyping it into the admin by hand, which is not accepting —
 * it is doing the work twice and hoping the second copy matches.
 *
 * One definition means the visitor fills in the same boxes the owner would,
 * the review screen can show exactly which of them changed, and accepting can
 * be one press rather than a transcription job.
 */

export type DirectoryFieldKey =
  | "name"
  | "category"
  | "tagline"
  | "description"
  | "phone"
  | "whatsapp"
  | "email"
  | "website"
  | "basedIn"
  | "regions"
  | "languages"
  | "specialties"
  | "responseTime";

export type DirectoryField = {
  key: DirectoryFieldKey;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "category";
  required?: boolean;
  /** A wider box on the form. */
  wide?: boolean;
  /**
   * A way of reaching a person directly.
   *
   * These are the ones the consent rule is about: a number somebody sends in
   * is not permission to publish it unless they say it is their own and say
   * so. See lib/provider-contact.ts.
   */
  personal?: boolean;
};

export const DIRECTORY_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "TOUR_OPERATOR", label: "Tour operator / organiser" },
  { value: "VACATION_PLANNER", label: "Vacation planner / concierge" },
  { value: "TRAVEL_AGENCY", label: "Travel agency" },
  { value: "GUIDE_DRIVER", label: "Tour guide / private driver" },
];

export const DIRECTORY_FIELDS: DirectoryField[] = [
  { key: "name", label: "Business name", type: "text", required: true, wide: true },
  { key: "category", label: "What they do", type: "category", required: true },
  { key: "basedIn", label: "Based in", type: "text", hint: "Town and country" },
  { key: "tagline", label: "One line about them", type: "text", wide: true },
  { key: "description", label: "Description", type: "textarea", wide: true },
  { key: "phone", label: "Phone", type: "text", personal: true },
  { key: "whatsapp", label: "WhatsApp", type: "text", personal: true },
  { key: "email", label: "Email", type: "text" },
  { key: "website", label: "Website", type: "text" },
  { key: "regions", label: "Places they cover", type: "text", hint: "Separated by commas" },
  { key: "languages", label: "Languages", type: "text", hint: "Separated by commas" },
  { key: "specialties", label: "Specialties", type: "text", hint: "Separated by commas", wide: true },
  { key: "responseTime", label: "How quickly they answer", type: "text", hint: "In their words — “same day”" },
];

export type DirectoryDraft = Partial<Record<DirectoryFieldKey, string>>;

const FIELD_BY_KEY = new Map(DIRECTORY_FIELDS.map((field) => [field.key, field]));

export function directoryFieldLabel(key: string): string {
  return FIELD_BY_KEY.get(key as DirectoryFieldKey)?.label ?? key;
}

/** Only the keys we know, trimmed, with the blanks dropped. */
export function cleanDraft(input: unknown): DirectoryDraft {
  const draft: DirectoryDraft = {};
  if (!input || typeof input !== "object") return draft;
  const record = input as Record<string, unknown>;
  for (const field of DIRECTORY_FIELDS) {
    const value = record[field.key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, field.type === "textarea" ? 1200 : 300);
    if (trimmed) draft[field.key] = trimmed;
  }
  return draft;
}

/**
 * What is wrong with a submission, in words a visitor can act on.
 *
 * The same check runs in the browser and again on the server, because the
 * browser's copy can be skipped.
 */
export function draftProblems(draft: DirectoryDraft): string[] {
  const problems: string[] = [];
  if (!draft.name?.trim()) problems.push("A business name is needed.");
  if (draft.category && !DIRECTORY_CATEGORIES.some((c) => c.value === draft.category)) {
    problems.push("Choose one of the listed kinds of business.");
  }
  const reachable = draft.phone || draft.whatsapp || draft.email || draft.website;
  if (!reachable) problems.push("At least one way to reach them — a phone, WhatsApp, email or website.");
  if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) problems.push("That email address does not look right.");
  if (draft.website && !/^https?:\/\/|^www\.|\.[a-z]{2,}/i.test(draft.website)) problems.push("That website address does not look right.");
  return problems;
}

export type FieldChange = { key: DirectoryFieldKey; label: string; from: string; to: string };

/**
 * Field by field, what this submission would change.
 *
 * Only the differences. A review screen listing thirteen fields of which one
 * has moved buries the one that matters, and the reviewer stops reading.
 *
 * A field the submitter left blank is not a request to delete what is there —
 * they were filling in a form, not editing a record, and treating an empty box
 * as "remove this" would quietly strip listings.
 */
export function changedFields(current: DirectoryDraft, proposed: DirectoryDraft): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of DIRECTORY_FIELDS) {
    const to = (proposed[field.key] ?? "").trim();
    if (!to) continue;
    const from = (current[field.key] ?? "").trim();
    if (from === to) continue;
    changes.push({ key: field.key, label: field.label, from, to });
  }
  return changes;
}

/** A stored listing as a draft, so the edit form opens on what is published. */
export function draftFromProvider(provider: Partial<StoredProvider>): DirectoryDraft {
  const draft: DirectoryDraft = {};
  for (const field of DIRECTORY_FIELDS) {
    const value = (provider as Record<string, unknown>)[field.key];
    if (typeof value === "string" && value.trim()) draft[field.key] = value.trim();
  }
  return draft;
}

/**
 * A draft merged onto a listing, ready to save.
 *
 * Blank fields in the draft leave what is already there alone, for the reason
 * above.
 */
export function applyDraft(current: Partial<StoredProvider>, draft: DirectoryDraft): Partial<StoredProvider> {
  const next: Record<string, unknown> = { ...current };
  for (const field of DIRECTORY_FIELDS) {
    const value = draft[field.key];
    if (value?.trim()) next[field.key] = value.trim();
  }
  return next as Partial<StoredProvider>;
}

/**
 * Consent, when the person submitting is the business itself.
 *
 * A number sent in by a passer-by is not permission to publish it — that is
 * the rule in lib/provider-contact.ts and this must not become a way around
 * it. But a business filling in its own listing and ticking "yes, publish our
 * number" IS the permission, given by the only people who can give it, and
 * refusing to record that would mean ringing them to ask what they have just
 * told you.
 *
 * So consent requires both answers, and the note says who gave it and when,
 * the same as one the owner records by hand.
 */
export type SubmitterConsent = {
  /** "This is my own business." */
  ownsBusiness?: boolean;
  /** "You may publish the phone number." */
  publishContact?: boolean;
};

export function consentFromSubmission(
  consent: SubmitterConsent,
  submitter: { name: string; email: string },
  on: string,
): { contactConsent: boolean; contactConsentNote?: string } {
  if (!consent.ownsBusiness || !consent.publishContact) return { contactConsent: false };
  const name = submitter.name.trim() || "the submitter";
  const email = submitter.email.trim();
  return {
    contactConsent: true,
    contactConsentNote: `Given on the listing form by ${name}${email ? ` (${email})` : ""}, as the business, ${on}`,
  };
}
