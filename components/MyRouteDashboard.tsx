"use client";

import DateField from "@/components/DateField";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSaveAuth } from "@/components/SaveAuthProvider";
import { directionsUrl, movePlace, optimizeRoute, type SavedPlace } from "@/data/route-utils";
import { type Crossing, describeCrossing } from "@/lib/border-crossings";
import { borderCrossings } from "@/lib/borders";
import { PLACES_EVENT } from "@/lib/account-trip-client";
import { ADD_TO_ROUTE_LABEL, PLAN_THEN_SAVE } from "@/lib/save-copy";
import { shabbosWarning } from "@/lib/shabbos";
import { useSignedIn } from "@/lib/use-signed-in";

type AccountSnapshot = {
  email: string;
  route: SavedPlace[];
  favorites: SavedPlace[];
};

export default function MyRouteDashboard({
  crossings: known = [],
  today = "",
}: {
  crossings?: Crossing[];
  today?: string;
}) {
  const signedIn = useSignedIn();
  const { requireSave, busy } = useSaveAuth();
  const [account, setAccount] = useState<AccountSnapshot | null>(null);

  useEffect(() => {
    const syncRemote = async () => {
      const response = await fetch("/api/account/me", { cache: "no-store" });
      const data = await response.json().catch(() => null) as { account?: { email?: string }; data?: { route?: SavedPlace[]; favorites?: SavedPlace[] } | null } | null;
      if (data?.account?.email && data.data) {
        setAccount({
          email: data.account.email,
          route: data.data.route ?? [],
          favorites: data.data.favorites ?? [],
        });
      } else {
        setAccount(null);
      }
    };

    const onPlaces = () => void syncRemote();
    void syncRemote().catch(() => undefined);
    window.addEventListener(PLACES_EVENT, onPlaces);
    return () => window.removeEventListener(PLACES_EVENT, onPlaces);
  }, []);

  const activeRoute = account?.route ?? [];
  const activeFavorites = account?.favorites ?? [];
  const optimized = optimizeRoute(activeRoute);
  const crossings = borderCrossings(optimized, today ? { crossings: known, today } : undefined);
  const shabbos = optimized
    .map((place) => (place.plannedDate ? shabbosWarning(place.plannedDate, undefined, place.coordinates, place.name) : null))
    .filter((warning): warning is NonNullable<typeof warning> => warning !== null);
  const openDirections = () => {
    const url = directionsUrl(optimized);
    if (url) window.open(url, "_blank", "noreferrer");
  };

  const save = (next: SavedPlace[]) => {
    requireSave({ type: "replace-route", places: next });
    if (account) setAccount({ ...account, route: next });
  };

  const remove = (id: string) => save(activeRoute.filter((place) => place.id !== id));

  const setPlannedDate = (id: string, plannedDate: string) =>
    save(activeRoute.map((place) => (place.id === id ? { ...place, plannedDate } : place)));

  const move = (id: string, direction: -1 | 1) => save(movePlace(optimized, id, direction));

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">My Route</p>
      <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">Your journey, arranged with care.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">Save the places that matter to you, set any kever you must reach on a specific date, then organize the flexible stops around it.</p>

      {signedIn === false && (
        <p className="mt-6 max-w-2xl text-sm leading-6 text-stone-600">{PLAN_THEN_SAVE}</p>
      )}

      {activeRoute.length === 0 ? (
        <div className="wg-card mt-12 border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Your route is waiting.</h2>
          <p className="mt-3 leading-7 text-stone-600">Open a destination or location and choose {ADD_TO_ROUTE_LABEL}.</p>
          <Link href="/stops" className="mt-6 inline-block bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white">Browse destinations</Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_.6fr]">
          <div className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Saved places</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">My Route</h2>
              </div>
              <span className="text-sm text-stone-500">{activeRoute.length} places</span>
            </div>
            <ol className="mt-7 space-y-4">
              {optimized.map((place, index) => (
                <li key={place.id} className="flex items-start gap-4 border-t border-[var(--gold-light)] pt-4 first:border-t-0 first:pt-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-bold text-white">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{place.name}{place.yiddishName && <span className="ml-2 text-lg text-stone-500">{place.yiddishName}</span>}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{place.address}</p>
                    <label className="mt-3 flex max-w-xs items-center gap-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)]">Fixed date<DateField value={place.plannedDate ?? ""} onChange={(v) => setPlannedDate(place.id, v)} className="border border-[var(--gold-light)] bg-white px-2 py-1 text-sm font-normal tracking-normal text-[var(--navy)]" ariaLabel="Fixed date" /></label>
                    {place.anchor && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--navy)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)]">
                        <span aria-hidden="true">⚓</span>
                        {place.anchor === "start" ? "Route starts here" : "Route ends here"}
                      </p>
                    )}
                    {place.plannedDate && <p className="mt-2 text-xs font-semibold text-[var(--navy)]">This stop is held in place for {place.plannedDate}.</p>}
                    {(() => {
                      const warning = place.plannedDate ? shabbosWarning(place.plannedDate, undefined, place.coordinates, "This stop") : null;
                      return warning ? (
                        <p className="mt-2 rounded-md border-l-4 border-[var(--gold)] bg-[var(--cream)] px-3 py-2 text-xs leading-5 text-[var(--navy)]">
                          <strong>Shabbos:</strong> {warning.message}
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(place.id, -1)}
                        disabled={busy || index === 0 || Boolean(place.anchor) || Boolean(optimized[index - 1]?.anchor)}
                        aria-label={`Move ${place.name} earlier`}
                        className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--gold-light)] text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(place.id, 1)}
                        disabled={busy || index === optimized.length - 1 || Boolean(place.anchor) || Boolean(optimized[index + 1]?.anchor)}
                        aria-label={`Move ${place.name} later`}
                        className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--gold-light)] text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ↓
                      </button>
                    </div>
                    <button type="button" disabled={busy} onClick={() => remove(place.id)} className="inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[0.1em] text-stone-500 hover:text-[var(--navy)] disabled:opacity-60">Remove</button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <aside className="border border-[var(--gold-light)] bg-[var(--cream-deep)] p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Route helper</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Optimize the flexible stops.</h2>
            <p className="mt-4 leading-7 text-stone-600">A place with a fixed date stays in its place. The other kevarim are ordered by nearby distance within the flexible parts of your route. Places without coordinates remain at the end until we verify them.</p>
            <button type="button" disabled={activeRoute.length < 2} onClick={openDirections} className="mt-7 w-full bg-[var(--navy)] px-5 py-4 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50">Open optimized route in maps</button>
            <Link href="/itinerary" className="mt-3 block w-full border border-[var(--gold)] px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Build a full day-by-day itinerary →</Link>

            {(crossings.length > 0 || shabbos.length > 0) && (
              <div className="mt-7 border-t border-[var(--gold)] pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Before you fix these dates</p>
                <ul className="mt-3 space-y-3">
                  {crossings.map((crossing) => (
                    <li key={`${crossing.fromPlace}-${crossing.toPlace}`} className="text-sm leading-6 text-stone-700">
                      <span aria-hidden="true">{crossing.major ? "⚠" : "•"}</span>{" "}
                      <strong className="text-[var(--navy)]">{crossing.from} → {crossing.to}.</strong>{" "}
                      {crossing.message.replace(/^Border crossing between [^.]+\. /, "")}
                      {crossing.advice?.latest && (
                        <span className="mt-1 block font-semibold text-[var(--navy)]">{crossing.advice.latest}</span>
                      )}
                      {crossing.advice && crossing.advice.crossings.length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)]">
                            {crossing.advice.crossings.length} crossing{crossing.advice.crossings.length === 1 ? "" : "s"} on this border
                          </summary>
                          <ul className="mt-2 space-y-2 border-l border-[var(--gold-light)] pl-3">
                            {crossing.advice.crossings.map((point) => (
                              <li key={point.id}>
                                <span className="font-semibold text-[var(--navy)]">{point.name}</span>{" "}
                                <span className="text-stone-600">{describeCrossing(point, today)}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </li>
                  ))}
                  {shabbos.map((warning) => (
                    <li key={warning.message} className="text-sm leading-6 text-stone-700">
                      <span aria-hidden="true">⚠</span> <strong className="text-[var(--navy)]">Shabbos.</strong> {warning.message}
                      {warning.candleLighting && " Check the town's own time before you rely on it."}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="mt-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">Favorites - {activeFavorites.length}</p>
        <p className="mt-3 text-stone-600">Favorites are saved separately from your active route, so you can keep places for a future trip.</p>
      </div>
    </section>
  );
}
