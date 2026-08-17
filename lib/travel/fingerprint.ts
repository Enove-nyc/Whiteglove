/**
 * Enough of a credential to compare, and not enough to use.
 *
 * WHY THIS EXISTS. "Present" on the providers screen only means a variable is
 * not empty. It cannot tell you that what was pasted is the masked value the
 * provider's dashboard displayed — `sb_rst_Pxc…uJdEmFR2` — rather than the
 * real key behind their Copy button. That mistake produces an authentication
 * error indistinguishable from an unprovisioned account, and the only way to
 * find it was to read the value, which nobody should have to do with a secret.
 *
 * So: the first six characters, the last four, and the length. That is enough
 * to compare against what a dashboard shows and to spot a truncation, an
 * ellipsis or a stray space. It is not enough to sign anything with.
 */

export function fingerprint(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const length = trimmed.length;
  // An ellipsis in a credential is always a pasted mask, never a real key.
  const masked = /[…]/.test(trimmed);
  if (length <= 12) return `${length} characters${masked ? " — contains …" : ""}`;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)} · ${length} chars${masked ? " · contains …" : ""}`;
}

/** True when the value looks like something copied out of a masked display. */
export function looksMasked(value: string | undefined): boolean {
  return /[…]/.test(value?.trim() ?? "");
}
