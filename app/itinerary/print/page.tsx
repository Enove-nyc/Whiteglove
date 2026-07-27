"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { buildDays, emptyItinerary, formatKm, type Itinerary } from "@/data/itinerary";

const LS_KEY = "whiteGloveItinerary";

export default function PrintItineraryPage() {
  const [itin, setItin] = useState<Itinerary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/itinerary", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.itinerary) {
            setItin({ ...emptyItinerary(), ...data.itinerary });
            return;
          }
        }
      } catch {
        /* fall through */
      }
      try {
        const local = localStorage.getItem(LS_KEY);
        setItin(local ? { ...emptyItinerary(), ...JSON.parse(local) } : emptyItinerary());
      } catch {
        setItin(emptyItinerary());
      }
    })();
  }, []);

  if (!itin) return null;
  const days = itin.startDate && itin.endDate ? buildDays(itin) : [];

  return (
    <main className="mx-auto max-w-3xl bg-white px-8 py-10 text-stone-800 print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { margin: 16mm 14mm 22mm 14mm; }
          .no-print { display: none !important; }
          .print-footer { position: fixed; bottom: 0; left: 0; right: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between gap-4 rounded-md border border-[var(--gold-light)] bg-[var(--cream)] p-4">
        <p className="text-sm text-stone-600">Use your browser&apos;s <strong>Print → Save as PDF</strong> for a clean copy.</p>
        <button type="button" onClick={() => window.print()} className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white">Print / Save as PDF</button>
      </div>

      {/* Header with logo */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--gold-light)] pb-5">
        <Image src="/logo.png" alt="White Glove Itineraries" width={320} height={120} className="h-14 w-auto object-contain" />
        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{itin.title || "Itinerary"}</p>
          {itin.travelerName ? <p className="text-sm text-stone-500">Prepared for {itin.travelerName}</p> : null}
          {itin.startDate && itin.endDate ? <p className="text-xs text-stone-400">{itin.startDate} — {itin.endDate}</p> : null}
        </div>
      </header>

      {days.length === 0 ? (
        <p className="mt-8 text-sm text-stone-500">Add start and end dates and some stops to generate the itinerary.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {days.map((day) => (
            <section key={day.date} className="break-inside-avoid">
              <div className="flex items-baseline justify-between border-b border-[var(--gold-light)] pb-1">
                <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">Day {day.index + 1}</h2>
                <p className="text-sm font-semibold text-stone-500">{day.label}</p>
              </div>
              <div className="mt-2 space-y-1.5 text-sm">
                {day.flightsArriving.map((f) => <p key={`a${f.id}`}>✈️ Arrive {f.to}{f.arriveTime ? ` at ${f.arriveTime}` : ""} <span className="text-stone-500">({f.from} → {f.to}{f.airline ? `, ${f.airline}` : ""})</span></p>)}
                {day.activities.map((a) => (
                  <div key={a.id}>
                    {a.distanceFromPrev !== null && <p className="text-[11px] uppercase tracking-wide text-stone-400">↓ {formatKm(a.distanceFromPrev)}</p>}
                    <p><strong className="text-[var(--navy)]">{a.startTime ? `${a.startTime} · ` : ""}{a.name}</strong>{a.address ? <span className="text-stone-500"> — {a.address}</span> : null}</p>
                    {a.notes ? <p className="text-stone-500">{a.notes}</p> : null}
                  </div>
                ))}
                {day.flightsDeparting.map((f) => <p key={`d${f.id}`}>✈️ Depart {f.from}{f.departTime ? ` at ${f.departTime}` : ""} <span className="text-stone-500">({f.from} → {f.to}{f.airline ? `, ${f.airline}` : ""})</span></p>)}
                <p className="pt-1 text-stone-600">🛏️ <strong>Tonight:</strong> {day.lodging ? (day.lodging.type === "overnight-transit" ? `Overnight ${day.lodging.name || "bus/flight"}` : day.lodging.name) : "— to be arranged —"}</p>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Footer with contact info (repeats on each printed page) */}
      <footer className="print-footer mt-10 border-t border-[var(--gold-light)] pt-3 text-center text-xs text-stone-500">
        <p className="font-semibold text-[var(--navy)]">White Glove Itineraries</p>
        <p>whitegloveitineraries@gmail.com · Personalized kosher travel &amp; Jewish heritage journeys</p>
        <p className="mt-1 text-[10px] text-stone-400">Details are traveler-provided and gathered from public sources — please confirm bookings and access before you travel.</p>
      </footer>
    </main>
  );
}
