import Link from "next/link";
import type { Photo } from "@prisma/client";
import CreateVacationDestinationForm from "@/components/CreateVacationDestinationForm";
import VacationDestinationEditor from "@/components/VacationDestinationEditor";
import { listVacationDestinationsForAdmin } from "@/lib/vacation-destinations-view";
import { vacationDestinationPhotos, vacationDestinationsTableReady } from "@/lib/vacation-destinations-admin";
import DbSetupButton from "@/components/DbSetupButton";

// Admin data must always reflect the latest state.
export const dynamic = "force-dynamic";

/**
 * Where holiday destinations are edited.
 *
 * A SECOND SCREEN RATHER THAN A TAB ON TOWNS, because they are two different
 * lists that have always been separate on this site. Towns are places with
 * kevarim in them; these are places to go on holiday. Merging the screens
 * would mean one picker of three hundred entries where every second one is
 * answering a different question.
 *
 * They were only ever editable by changing code and deploying, which is why
 * Rome could not be found anywhere in here.
 */
export default async function AdminVacationDestinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  const ready = await vacationDestinationsTableReady();
  const all = await listVacationDestinationsForAdmin();
  const selected = slug ? all.find((entry) => entry.destination.slug === slug) : undefined;
  const photos: Photo[] = selected ? ((await vacationDestinationPhotos(selected.destination.slug)) as Photo[]) : [];

  return (
    <>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">
          Destinations
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Where to go on holiday — Rome, the Dolomites, Miami Beach. Towns with kevarim in them are on the{" "}
          <Link href="/admin/destinations" className="font-semibold underline decoration-[var(--gold)] decoration-2 underline-offset-4">
            Towns
          </Link>{" "}
          screen. Changes go live within a minute.
        </p>
      </header>

      {!ready && (
        <section className="mt-8 rounded-2xl border border-[var(--gold)] bg-[#fcfaf6] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">One thing first</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
            The database needs one update before this screen can save.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Holiday destinations are new, so your database has nowhere to put them yet. Press this once. It adds what
            is missing and leaves every word you have already entered alone. The list below still shows the
            destinations that ship with the site, and they are on the site as normal.
          </p>
          <div className="mt-5">
            <DbSetupButton />
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Destinations" className="rounded-2xl border border-[var(--gold-light)] bg-white p-4">
          <ul className="space-y-1">
            {all.map(({ destination, hidden, hasRow }) => {
              const active = destination.slug === slug;
              return (
                <li key={destination.slug}>
                  <Link
                    href={`/admin/vacation-destinations?slug=${destination.slug}`}
                    className={`flex min-h-11 items-center justify-between gap-2 rounded-md px-3 text-sm ${
                      active ? "bg-[var(--navy)] font-semibold text-white" : "text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                    }`}
                  >
                    <span className="truncate">{destination.name}</span>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] ${active ? "text-white/70" : "text-stone-400"}`}>
                      {hidden ? "Hidden" : destination.ownerAdded ? "Yours" : hasRow ? "Edited" : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div>
          {selected ? (
            <VacationDestinationEditor
              destination={selected.destination}
              hidden={selected.hidden}
              hasRow={selected.hasRow}
              builtIn={!selected.destination.ownerAdded}
              photos={photos}
            />
          ) : (
            <div className="space-y-8">
              <div className="rounded-2xl border border-[var(--gold-light)] bg-white p-6">
                <p className="text-sm leading-6 text-stone-600">
                  Choose a destination on the left to edit its wording, its towns and its pictures — or add one below.
                </p>
              </div>
              <CreateVacationDestinationForm />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
