"use client";

import { useState } from "react";
import { placeDirectionsUrl, placeMapUrl, toDMS } from "@/data/route-utils";

// The exact Google Maps coordinates for a kever, shown the way Maps shows them
// (50°15'04.1"N 22°25'21.4"E). A street address can resolve to a nearby point;
// the coordinates land on the grave itself, so they lead here.
export default function KeverCoordinates({
  coordinates,
  address,
  label = "Exact coordinates",
}: {
  coordinates?: string;
  address?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState<"dms" | "decimal" | null>(null);
  const dms = toDMS(coordinates);

  function copy(value: string, which: "dms" | "decimal") {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => undefined);
  }

  if (!dms) {
    return (
      <div className="border border-dashed border-[var(--gold-light)] bg-white/60 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold)]">{label}</p>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Not confirmed yet for this kever. Use the address below and confirm the exact grave location locally — we don&apos;t publish a coordinate we haven&apos;t verified.
        </p>
      </div>
    );
  }

  const decimal = (coordinates ?? "").trim();

  return (
    <div className="border border-[var(--gold)] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold)]">{label}</p>
      <p className="mt-1 select-all font-mono text-lg font-semibold leading-tight text-[var(--navy)]">{dms}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button type="button" onClick={() => copy(dms, "dms")} className="font-bold uppercase tracking-[0.1em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
          {copied === "dms" ? "Copied!" : "Copy coordinates"}
        </button>
        <a href={placeDirectionsUrl(address, coordinates)} target="_blank" rel="noreferrer" className="font-bold uppercase tracking-[0.1em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
          Navigate →
        </a>
        <a href={placeMapUrl(address, coordinates)} target="_blank" rel="noreferrer" className="font-bold uppercase tracking-[0.1em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
          Show on map →
        </a>
      </div>
      {decimal && (
        <button type="button" onClick={() => copy(decimal, "decimal")} className="mt-2 block font-mono text-[11px] text-stone-400 hover:text-[var(--navy)]">
          {copied === "decimal" ? "Copied!" : decimal}
        </button>
      )}
    </div>
  );
}
