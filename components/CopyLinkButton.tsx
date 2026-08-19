"use client";

import { useState } from "react";

/**
 * Copies a link to the clipboard and says so for a moment.
 *
 * Falls back to selecting nothing gracefully: if the clipboard API is refused
 * (an insecure context, an old browser) the label says to copy it by hand
 * rather than failing silently.
 */
export default function CopyLinkButton({
  value,
  className = "",
  label = "Copy link",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        className ||
        "inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--gold-light)]"
      }
    >
      {state === "done" ? "Copied" : state === "failed" ? "Copy by hand" : label}
    </button>
  );
}
