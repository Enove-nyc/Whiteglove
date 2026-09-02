"use client";

import { useCallback, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFocusTrap } from "@/components/useFocusTrap";
import {
  MAX_DESCRIPTION,
  MAX_NAME,
  hasChanges,
  publishedLine,
  quickEditProblem,
  type QuickEditFields,
  type QuickListing,
} from "@/data/listing-quick-edit";

/**
 * WHAT "VIEW" OPENS NOW.
 *
 * It used to open the public page the listing appears on. For a business that
 * was the whole directory with no anchor to scroll to; for an attraction it was
 * a list that loads twenty-four at a time, so the anchor was not on the page
 * when the browser went looking. Either way you landed at the top of a list and
 * had to find your own row again — and for anything unpublished there was no
 * public page to land on at all.
 *
 * So it opens here: the listing as it stands, the handful of fields anybody
 * actually corrects in passing, Save, and back to the list without losing your
 * place. This IS the preview for something not published yet, which is the only
 * honest answer for a listing with no public page.
 *
 * WHAT IT DELIBERATELY IS NOT is the full editor. Six kinds have six editors
 * behind them, one of which is a very long form, and putting all of that behind
 * one button would make this slow to open and frightening to use. Everything
 * else is one click away at the bottom.
 *
 * A LISTING THAT CANNOT BE SAVED SAYS SO. Some of what this admin lists is
 * shipped in the site's own data files and has no row to update. Those open
 * read-only with the reason in words — an editable box over a Save button that
 * silently does nothing is worse than no button.
 */
export function ListingQuickPanel({
  listing,
  trigger = "View",
}: {
  listing: QuickListing;
  /** The row's own label for the control. */
  trigger?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<QuickEditFields>(listing.fields);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setError("");
    setSaved(false);
    triggerRef.current?.focus();
  }, []);

  const dialogRef = useFocusTrap<HTMLDivElement>(open, close);

  const dirty = hasChanges(listing.fields, fields);

  async function save() {
    const problem = quickEditProblem(fields);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: listing.kind, id: listing.id, fields }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        // What was typed stays in the boxes — a failed save must never cost
        // somebody the correction they just made.
        setError(data?.error || "Could not save that just now.");
        return;
      }
      setSaved(true);
      router.refresh();
      close();
    } catch {
      setError("Could not reach the server. Your changes are still here.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] disabled:bg-[var(--cream)] disabled:text-stone-500";
  const label = "block text-xs font-bold uppercase tracking-[0.1em] text-stone-500";
  const button =
    "inline-flex min-h-11 items-center rounded-md border border-[var(--gold-light)] bg-white px-4 text-sm font-semibold text-[var(--navy)] disabled:opacity-60";

  function set<K extends keyof QuickEditFields>(key: K, value: QuickEditFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={button}>
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          onClick={close}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-[var(--cream)] shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--gold-light)] px-5 py-4">
              <div className="min-w-0">
                <h2 id={headingId} className="truncate text-lg font-bold text-[var(--navy)]">
                  {listing.fields.name || "This listing"}
                </h2>
                {/* Which state it is in, said in words — an unpublished listing
                    must not look identical to a live one. */}
                <p className="mt-0.5 text-xs leading-5 text-stone-600">{publishedLine(fields.published)}</p>
              </div>
              <button type="button" onClick={close} className={`${button} shrink-0`}>
                Close
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
              {!listing.savable && (
                <p className="border border-[var(--gold-light)] bg-white px-4 py-3 text-sm leading-6 text-stone-600">
                  {listing.whyNot ?? "This one cannot be changed from here."}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={label} htmlFor={`${headingId}-name`}>
                    Name
                  </label>
                  <input
                    id={`${headingId}-name`}
                    value={fields.name}
                    maxLength={MAX_NAME}
                    disabled={!listing.savable}
                    onChange={(e) => set("name", e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label} htmlFor={`${headingId}-city`}>
                    Town
                  </label>
                  <input
                    id={`${headingId}-city`}
                    value={fields.city}
                    disabled={!listing.savable}
                    onChange={(e) => set("city", e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label} htmlFor={`${headingId}-country`}>
                    Country
                  </label>
                  <input
                    id={`${headingId}-country`}
                    value={fields.country}
                    disabled={!listing.savable}
                    onChange={(e) => set("country", e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label} htmlFor={`${headingId}-phone`}>
                    Phone
                  </label>
                  <input
                    id={`${headingId}-phone`}
                    value={fields.phone}
                    disabled={!listing.savable}
                    onChange={(e) => set("phone", e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label} htmlFor={`${headingId}-website`}>
                    Website
                  </label>
                  <input
                    id={`${headingId}-website`}
                    value={fields.website}
                    placeholder="https://"
                    disabled={!listing.savable}
                    onChange={(e) => set("website", e.target.value)}
                    className={field}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor={`${headingId}-description`}>
                    Description
                  </label>
                  <textarea
                    id={`${headingId}-description`}
                    rows={4}
                    value={fields.description}
                    maxLength={MAX_DESCRIPTION}
                    disabled={!listing.savable}
                    onChange={(e) => set("description", e.target.value)}
                    className={field}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-[var(--navy)]">
                <input
                  type="checkbox"
                  checked={fields.published}
                  disabled={!listing.savable}
                  onChange={(e) => set("published", e.target.checked)}
                  className="h-4 w-4"
                />
                Live on the site
              </label>

              {error && (
                <p role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                  {error}
                </p>
              )}
              {saved && !error && <p className="text-sm font-semibold text-[var(--gold-ink)]">Saved.</p>}

              <p className="text-xs leading-5 text-stone-500">
                This is the short version.{" "}
                <Link href={listing.fullEditHref} className="font-semibold text-[var(--navy)] underline">
                  Open the full editor
                </Link>{" "}
                for everything else.
              </p>
            </div>

            {listing.savable && (
              <div className="flex flex-wrap gap-3 border-t border-[var(--gold-light)] px-5 py-4">
                <button type="button" onClick={() => void save()} disabled={busy || !dirty} className={button}>
                  {busy ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={close} className={button}>
                  Cancel
                </button>
                {!dirty && <span className="self-center text-xs text-stone-500">Nothing changed yet.</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
