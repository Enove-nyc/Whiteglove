"use client";

import { useState } from "react";
import { IMPORTED_KIND_LABEL, type ImportedItem, type ImportedItemKind } from "@/data/smart-import";

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const caption = "text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500";

function summaryLine(item: ImportedItem): string {
  if (item.kind === "flight") {
    const route = [item.from, item.to].filter(Boolean).join(" → ");
    const flight = [item.airline, item.flightNo].filter(Boolean).join(" ");
    return [flight, route, item.date].filter(Boolean).join(" — ") || "Flight";
  }
  if (item.kind === "lodging") {
    const stay = [item.checkIn, item.checkOut].filter(Boolean).join(" → ");
    return [item.name, stay].filter(Boolean).join(" — ") || "Hotel";
  }
  return [item.name, item.date, item.departTime].filter(Boolean).join(" — ") || "Stop";
}

/**
 * Smart Import's preview: paste a confirmation or attach its PDF, see exactly
 * what was read out of it, and add only what looks right. Nothing here is
 * saved until "Add to trip" — see data/smart-import.ts's
 * addImportedItemsToItinerary, called once by the caller for the whole batch,
 * same as the "Saved route" import already does.
 */
export default function SmartImportPanel({ onImport, onCancel }: { onImport: (items: ImportedItem[]) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [pdfDataUrl, setPdfDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ImportedItem[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Attach a PDF file.");
      return;
    }
    setError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPdfDataUrl(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  async function extract() {
    if (!text.trim() && !pdfDataUrl) {
      setError("Paste a confirmation, or attach a PDF, first.");
      return;
    }
    setLoading(true);
    setError("");
    setItems(null);
    setWarnings([]);
    try {
      const res = await fetch("/api/account/smart-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfDataUrl ? { pdfDataUrl } : { text }),
      });
      const data = (await res.json().catch(() => null)) as { items?: ImportedItem[]; warnings?: string[]; error?: string } | null;
      if (!res.ok || !data) {
        setError(data?.error || "Could not read that just now. Try again in a moment.");
        return;
      }
      setItems(data.items || []);
      setWarnings(data.warnings || []);
      setExcluded(new Set());
      if ((data.items || []).length === 0) {
        setError(data.error || "Could not find a booking to read out of that.");
      }
    } catch {
      setError("Could not reach the import service.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addSelected() {
    if (!items) return;
    const chosen = items.filter((it) => !excluded.has(it.id));
    if (chosen.length === 0) return;
    onImport(chosen);
    onCancel();
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
      <p className="text-sm font-semibold text-[var(--navy)]">Smart Import</p>
      <p className="mt-1 text-xs leading-5 text-stone-600">
        Paste a confirmation email or reservation text, or attach the confirmation PDF, and it reads out the flight, hotel or
        reservation details. Nothing is added until you choose to keep it below.
      </p>

      {!items && (
        <>
          <label className="mt-3 block">
            <span className={caption}>Paste confirmation text</span>
            <textarea
              rows={6}
              className={`${inputClass} min-h-32`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the confirmation email or reservation text here…"
              disabled={Boolean(pdfDataUrl)}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-stone-500">or</span>
            <label className="cursor-pointer rounded-full border border-[var(--gold-light)] bg-white px-3.5 py-2 text-xs font-bold text-[var(--navy)] transition hover:border-[var(--gold)]">
              {fileName || "Attach a PDF"}
              <input type="file" accept="application/pdf" className="hidden" onChange={onFile} />
            </label>
            {pdfDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setPdfDataUrl("");
                  setFileName("");
                }}
                className="text-xs font-semibold text-stone-500 underline"
              >
                Remove
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={extract}
              disabled={loading}
              className="rounded-full bg-[var(--navy)] px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Reading…" : "Read confirmation"}
            </button>
            <button type="button" onClick={onCancel} className="rounded-full border border-stone-300 px-5 py-2.5 text-xs font-bold text-[var(--navy)]">
              Cancel
            </button>
          </div>
        </>
      )}

      {items && (
        <>
          {items.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {items.map((it) => (
                <label
                  key={it.id}
                  className="flex items-start gap-3 rounded-lg border border-[var(--gold-light)] bg-white p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!excluded.has(it.id)}
                    onChange={() => toggle(it.id)}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className={caption}>{IMPORTED_KIND_LABEL[it.kind as ImportedItemKind]}</span>
                    <span className="font-semibold text-[var(--navy)]">{summaryLine(it)}</span>
                    {it.address && <span className="text-xs text-stone-600">{it.address}</span>}
                    {it.confirmation && <span className="text-xs text-stone-600">Confirmation: {it.confirmation}</span>}
                    {it.notes && <span className="text-xs text-stone-500">{it.notes}</span>}
                    {it.sourceExcerpt && <span className="text-xs italic text-stone-400">“{it.sourceExcerpt}”</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <p className="font-bold">Could not confidently read:</p>
              <ul className="mt-1 list-disc pl-4">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={addSelected}
                disabled={items.every((it) => excluded.has(it.id))}
                className="rounded-full bg-[var(--navy)] px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                Add {items.filter((it) => !excluded.has(it.id)).length} to trip
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setItems(null);
                setWarnings([]);
                setError("");
              }}
              className="rounded-full border border-stone-300 px-5 py-2.5 text-xs font-bold text-[var(--navy)]"
            >
              Try another
            </button>
            <button type="button" onClick={onCancel} className="rounded-full border border-stone-300 px-5 py-2.5 text-xs font-bold text-[var(--navy)]">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
