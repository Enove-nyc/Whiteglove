"use client";

import { useActionState } from "react";
import { viewSupportTrip } from "./actions";

export default function AdminSupportTripPage() {
  const [result, action, pending] = useActionState(viewSupportTrip, null);
  const snapshot = result && "snapshot" in result ? result.snapshot : null;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Itinerary support</h1>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">Customer support code
          <input name="code" required autoComplete="off" maxLength={24} className="min-h-11 rounded border px-3" />
        </label>
        <button disabled={pending} className="min-h-11 rounded bg-[var(--navy)] px-4 text-white">Open read-only view</button>
      </form>
      {result && "error" in result && <p role="alert">{result.error}</p>}
      {snapshot && (
        <div className="space-y-4 rounded border bg-white p-4 text-sm">
          <p>{snapshot.startDate} – {snapshot.endDate}</p>
          <h2 className="font-semibold">Flights</h2>
          <ul>{snapshot.flights.map((flight, index) => <li key={index}>{flight.date} {flight.departTime} · {flight.from} → {flight.to} {flight.arriveTime}</li>)}</ul>
          <h2 className="font-semibold">Accommodation</h2>
          <ul>{snapshot.lodging.map((stay, index) => <li key={index}>{stay.checkIn} – {stay.checkOut} · {stay.name}</li>)}</ul>
          <h2 className="font-semibold">Activities</h2>
          <ul>{snapshot.activities.map((stop, index) => <li key={index}>{stop.date} {stop.startTime} · {stop.name}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
