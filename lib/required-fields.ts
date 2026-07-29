// When a required field has not really been answered.
//
// The browser's own check is nearly right. It refuses an empty required box,
// which is most of the job. Two things get past it, and both look to a person
// like the form quietly ignoring them:
//
//   • A space counts as an answer. " " satisfies `required`, so a form can go
//     through with nothing in it.
//   • A select whose placeholder option carries a real value. "— choose —" is
//     only caught when its value is empty; when it is not, an unmade choice
//     submits as though it were made.
//
// Kept apart from the DOM so the rule itself can be tested, rather than only
// observed through a browser.

export type FieldLike = {
  /** How the browser treats it: a typed box, a dropdown, or anything else. */
  kind: "text" | "select" | "other";
  value: string;
  /** For a select: the words on the chosen option. */
  optionText?: string;
  /** True when nothing is selected at all. */
  nothingSelected?: boolean;
};

/** Words a placeholder option opens with. "Choose a town", "— Select —", … */
const PLACEHOLDER = /^[\s—–\-]*(choose|select|pick|none|any)\b/i;

/**
 * Has this been left unanswered, despite looking answered to the browser?
 *
 * Returns false for anything the browser already handles correctly — an
 * outright empty box, a date, a checkbox — so this only ever adds a rule,
 * never replaces one.
 */
export function looksUnanswered(field: FieldLike): boolean {
  if (field.kind === "select") {
    if (field.nothingSelected) return true;
    if (!field.value.trim()) return true;
    return PLACEHOLDER.test(field.optionText ?? "");
  }
  if (field.kind !== "text") return false;
  // Empty is the browser's business. Whitespace-only is ours.
  return field.value.length > 0 && field.value.trim().length === 0;
}

/** What to say when it is. Plain, and specific to what went wrong. */
export function unansweredMessage(field: FieldLike): string {
  return field.kind === "select" ? "Choose one of these." : "This needs an answer, not just a space.";
}
