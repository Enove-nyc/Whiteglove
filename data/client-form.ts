// A secure pre-trip form: what the planner asks a traveler for before the
// trip, and what the traveler answers. Pure data model + pure transforms,
// the same discipline every other data/*.ts file here keeps.
//
// KEPT OFF THE ITINERARY ON PURPOSE. A passport number and an emergency
// contact are not "part of the trip" the way a hotel or a flight is — they
// travel through print views, shared links and the app's own Wallet, and a
// form answer baked into any of that would leak wherever the itinerary
// goes. The template (which fields are asked) lives on the trip
// (SavedTrip.formTemplate); the answers live in their own place
// (SavedTrip.formResponses), read back only through the planner's own
// authenticated route — see lib/account-store.ts and
// app/api/account/client-form/route.ts.

export type StandardFieldKey =
  | "legalName"
  | "dateOfBirth"
  | "phone"
  | "email"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "passportNumber"
  | "passportExpiry"
  | "passportCountry"
  | "knownTravelerNumber"
  | "loyaltyNumbers"
  | "seatingPreference"
  | "roomPreference"
  | "dietaryRequirements"
  | "accessibilityNeeds";

export const STANDARD_FIELD_LABEL: Record<StandardFieldKey, string> = {
  legalName: "Legal name (as on passport)",
  dateOfBirth: "Date of birth",
  phone: "Phone",
  email: "Email",
  emergencyContactName: "Emergency contact — name",
  emergencyContactPhone: "Emergency contact — phone",
  passportNumber: "Passport number",
  passportExpiry: "Passport expiry",
  passportCountry: "Passport issuing country",
  knownTravelerNumber: "Known Traveler Number",
  loyaltyNumbers: "Airline/hotel loyalty numbers",
  seatingPreference: "Seating preference",
  roomPreference: "Room preference",
  dietaryRequirements: "Dietary requirements",
  accessibilityNeeds: "Accessibility / special requirements",
};

/** The fields worth marking sensitive in the UI — a lock icon, nothing more.
 *  The real protection is architectural (see the file header), not this list. */
export const SENSITIVE_FIELDS = new Set<StandardFieldKey>([
  "dateOfBirth",
  "passportNumber",
  "passportExpiry",
  "passportCountry",
  "knownTravelerNumber",
]);

export type FormField =
  | { id: string; kind: "standard"; key: StandardFieldKey; required: boolean }
  | { id: string; kind: "custom"; label: string; required: boolean };

export function fieldLabel(field: FormField): string {
  return field.kind === "standard" ? STANDARD_FIELD_LABEL[field.key] : field.label;
}

export function fieldIsSensitive(field: FormField): boolean {
  return field.kind === "standard" && SENSITIVE_FIELDS.has(field.key);
}

export type ClientFormTemplate = {
  fields: FormField[];
  /** A line the planner can add above the form — why it's being asked. */
  note?: string;
  updatedAt: string;
};

export type ClientFormResponse = {
  id: string;
  /** Whoever filled this one out typed their own name — not tied to a
   *  pre-existing traveler record, so the form works whether or not the
   *  itinerary has named travelers yet. */
  respondentName: string;
  /** fieldId -> what they typed. */
  answers: Record<string, string>;
  submittedAt: string;
};

export function emptyFormTemplate(): ClientFormTemplate {
  return { fields: [], updatedAt: new Date().toISOString() };
}

/** Which required fields a response is still missing, by label — empty
 *  means the response is complete. Never invents an answer; a field left
 *  blank just stays counted as missing. */
export function missingRequiredFields(template: ClientFormTemplate, answers: Record<string, string>): string[] {
  return template.fields
    .filter((f) => f.required && !answers[f.id]?.trim())
    .map((f) => fieldLabel(f));
}
