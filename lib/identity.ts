// What an account is called: an email address, or a phone number.
//
// Not everyone has an email they check. A phone number is the thing most
// travelers actually read, and a code by text arrives while they are standing
// somewhere with one bar rather than sitting at a laptop.
//
// Both are just strings, so both can be the key an account is stored under —
// the only real work is settling on one spelling for each, so that
// "(555) 123-4567" and "+1 555 123 4567" are not two different accounts.
//
// Phone numbers are normalised to E.164 (+ and digits, nothing else), which is
// what every SMS service expects and what makes two spellings compare equal.

export type IdentityKind = "email" | "phone";

export type Identity = {
  kind: IdentityKind;
  /** The single spelling everything else uses: the storage key. */
  value: string;
};

/**
 * The country assumed for a number typed without one.
 *
 * A ten-digit number means North America unless the deployment says otherwise.
 * Set DEFAULT_PHONE_COUNTRY to another calling code (e.g. "44", "972") when
 * most visitors are somewhere else. Anyone can always type the + themselves,
 * and the site shows back the number it settled on so a wrong guess is visible
 * before the code is sent rather than after.
 */
function defaultCallingCode(): string {
  const raw = process.env.DEFAULT_PHONE_COUNTRY?.replace(/\D/g, "");
  return raw || "1";
}

/** Does this look like somebody trying to type a phone number? */
export function looksLikePhone(raw: string): boolean {
  const value = raw.trim();
  if (!value || value.includes("@")) return false;
  return /^[+(]?[\d][\d\s().\-]*$/.test(value) && (value.match(/\d/g) ?? []).length >= 7;
}

/**
 * A phone number in E.164, or null when it cannot be read as one.
 *
 * Deliberately strict about length: a number too short to dial is a typo, and
 * sending a code to a typo means the person waits for a text that will never
 * come and has no way to know why.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hadPlus = trimmed.startsWith("+");
  // 00 is how much of the world writes the +.
  const digits = trimmed.replace(/\D/g, "").replace(/^00/, hadPlus ? "" : "");

  if (!digits) return null;

  let full: string;
  if (hadPlus || trimmed.startsWith("00")) {
    full = digits;
  } else if (digits.length === 10) {
    full = `${defaultCallingCode()}${digits}`;
  } else if (digits.length === 11 && digits.startsWith(defaultCallingCode())) {
    full = digits;
  } else {
    // Long enough to be international but written without a +. Rather than
    // guess a country onto it, take it as already carrying its own code.
    if (digits.length < 8) return null;
    full = digits;
  }

  // E.164 allows at most fifteen digits, and nothing real is under eight.
  if (full.length < 8 || full.length > 15) return null;
  return `+${full}`;
}

/** A reasonable email, lowercased. Not a full RFC check — nothing useful is. */
export function normalizeEmailAddress(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value.includes("@")) return null;
  const [local, domain, ...rest] = value.split("@");
  if (rest.length || !local || !domain || !domain.includes(".") || /\s/.test(value)) return null;
  return value;
}

/**
 * Read whatever somebody typed into the one identifier the site stores.
 *
 * One field takes both, because asking a person to pick "email or phone"
 * before they have typed anything is a decision they should not have to make.
 */
export function normalizeIdentity(raw: string): Identity | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value.includes("@")) {
    const email = normalizeEmailAddress(value);
    return email ? { kind: "email", value: email } : null;
  }
  if (looksLikePhone(value)) {
    const phone = normalizePhone(value);
    return phone ? { kind: "phone", value: phone } : null;
  }
  return null;
}

/** The stored key, whichever kind it is. Used everywhere an account is looked up. */
export function identityKey(raw: string): string {
  return normalizeIdentity(raw)?.value ?? raw.trim().toLowerCase();
}

/** Is this stored identifier a phone number? */
export function isPhoneIdentity(value: string): boolean {
  return value.startsWith("+");
}

/** "+15551234567" → "+1 555 123 4567", for showing back to a person. */
export function formatPhone(value: string): string {
  if (!isPhoneIdentity(value)) return value;
  const digits = value.slice(1);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return `+${digits.replace(/(\d{1,3})(\d{3})(\d{0,4})(\d*)/, "$1 $2 $3 $4").trim()}`;
}

/** How to describe an identity in a sentence to the person who owns it. */
export function describeIdentity(value: string): string {
  return isPhoneIdentity(value) ? formatPhone(value) : value;
}
