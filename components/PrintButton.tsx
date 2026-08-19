"use client";

/** Opens the browser's print dialog. Hidden when the page is actually printed. */
export default function PrintButton({
  className = "",
  label = "Print / Save as PDF",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ||
        "inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]"
      }
    >
      {label}
    </button>
  );
}
