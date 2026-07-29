// Reading an API key out of the environment, and saying so when the value is
// not one.
//
// WHY THIS EXISTS. The Google Routes diagnostic reported:
//
//     Headers.append: "[redacted]" is an invalid header value.
//
// That error is thrown by fetch while it is building the request — nothing was
// ever sent, and no amount of checking Google's console would have explained
// it. The value in Vercel held a character that cannot appear in an HTTP header
// at all.
//
// The code already called .trim(), which is why this was baffling: trim only
// strips the two ends. Paste a key that soft-wrapped across two lines in a
// console, or copy one out of a document, and you can pick up a zero-width
// space or a non-breaking space in the MIDDLE of the value, where trim will
// never touch it. It is invisible in every text box it is subsequently pasted
// into, including Vercel's.
//
// So: strip the characters that cannot legitimately be part of a key, use the
// cleaned value so the request actually goes, and tell the owner exactly what
// was wrong so it gets fixed at the source rather than papered over here.
//
// Cleaning a credential is safe in this one specific way. Every character
// removed here is one that would have made the request throw or be rejected
// outright, so removing it cannot turn a wrong key into an accepted one —
// only a mangled key back into the key that was meant.

/**
 * Characters that are never part of an API key but are routinely pasted with
 * one. All of them are invisible, which is the whole problem.
 */
// Written as escapes on purpose: spelled out literally this line would be a
// row of blank space in the editor and nobody could review it.
const INVISIBLE =
  /[\u0000-\u0020\u007f-\u00a0\u00ad\u034f\u061c\u1680\u180e\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\ufeff\ufff9-\ufffb]/g;

/** Named for the report, so the message can say what was actually in there. */
const NAMES: Record<number, string> = {
  0x09: "a tab",
  0x0a: "a line break",
  0x0d: "a carriage return",
  0x20: "a space",
  0xa0: "a non-breaking space",
  0xad: "a soft hyphen",
  0x200b: "a zero-width space",
  0x200c: "a zero-width non-joiner",
  0x200d: "a zero-width joiner",
  0x200e: "a left-to-right mark",
  0x200f: "a right-to-left mark",
  0xfeff: "a byte-order mark",
};

function describe(codePoint: number): string {
  return NAMES[codePoint] ?? `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** True when every character can appear in an HTTP header value. */
function headerSafe(value: string): boolean {
  // RFC 7230 field-value: visible ASCII, plus space and tab. Anything above
  // 0x7E — including ordinary accented letters and smart quotes — is out.
  return /^[\x21-\x7e]*$/.test(value);
}

export type KeyRead = {
  /** The usable key, or null when the variable is unset or empty. */
  key: string | null;
  /** True when the raw value needed cleaning before it could be used. */
  cleaned: boolean;
  /**
   * What was wrong, in words, for the admin diagnostics. Empty when the value
   * was already fine. Never contains any part of the key itself.
   */
  problems: string[];
  /**
   * True when characters remain that no cleaning can fix — a key with real
   * non-ASCII letters in it is not a key, it is the wrong text.
   */
  unusable: boolean;
};

/**
 * Read an API key from the environment, cleaned and checked.
 *
 * Never throws, and never returns anything containing the key in `problems` —
 * these messages are shown in a browser.
 */
export function readApiKey(name: string): KeyRead {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return { key: null, cleaned: false, problems: [], unusable: false };

  const problems: string[] = [];

  // What was stripped, counted by kind, so the message can name it.
  const stripped = new Map<string, number>();
  for (const match of raw.matchAll(INVISIBLE)) {
    const label = describe(match[0].codePointAt(0)!);
    stripped.set(label, (stripped.get(label) ?? 0) + 1);
  }
  const cleanedValue = raw.replace(INVISIBLE, "");

  // Leading and trailing whitespace is ordinary and not worth a warning; a
  // stray character INSIDE the value is the one that costs somebody an
  // afternoon, so say so plainly.
  const interior = raw.trim().replace(INVISIBLE, "") !== raw.trim();
  if (interior) {
    const list = [...stripped.entries()].map(([label, n]) => (n > 1 ? `${label} (×${n})` : label)).join(", ");
    problems.push(
      `The value has ${list} inside it. That is invisible wherever you paste it, and it makes the key unusable as an HTTP header — the request fails before it is sent. It usually comes from copying a key that wrapped onto two lines. Retype or re-copy it in Vercel, then redeploy.`,
    );
  }

  if (!headerSafe(cleanedValue)) {
    // Something is left that is not whitespace and not ASCII — a smart quote
    // from a word processor, or a letter with an accent. Name the first one and
    // where it is, without printing the key.
    const bad = [...cleanedValue].find((c) => !/^[\x21-\x7e]$/.test(c))!;
    const at = [...cleanedValue].indexOf(bad) + 1;
    problems.push(
      `Character ${at} of the value is ${describe(bad.codePointAt(0)!)}, which cannot appear in an API key. If the key was pasted from a document, the quotation marks may have been turned into curly ones — copy it from Google's console directly.`,
    );
    return { key: null, cleaned: true, problems, unusable: true };
  }

  return { key: cleanedValue, cleaned: cleanedValue !== raw, problems, unusable: false };
}

/**
 * Just the usable key, for the call sites that only need to make a request.
 *
 * The diagnostics use readApiKey and report the rest.
 */
export function apiKey(name: string): string | null {
  return readApiKey(name).key;
}

/**
 * The same cleaning, for a value that is already in hand.
 *
 * The browser key has to be read as a literal `process.env.NEXT_PUBLIC_…` so
 * that Next can inline it at build time, which rules out the lookup-by-name
 * above. Returns null when nothing usable is left.
 */
export function cleanKey(raw: string | undefined): string | null {
  const cleaned = (raw ?? "").replace(INVISIBLE, "");
  return cleaned && headerSafe(cleaned) ? cleaned : null;
}
