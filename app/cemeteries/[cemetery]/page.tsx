import { notFound } from "next/navigation";
import Link from "next/link";
import Footer from "@/components/Footer";
import KosherNearby from "@/components/KosherNearby";
import Navbar from "@/components/Navbar";
import NearestAirports from "@/components/NearestAirports";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import SuggestEditButton from "@/components/SuggestEditButton";
import { cemeteries } from "@/data/cemeteries";
import { kmBetween } from "@/data/itinerary";
import { placeDirectionsUrl } from "@/data/route-utils";
import { getCemeteryView } from "@/lib/cemeteries-view";
import { PLACE_CATEGORY_LABELS, PLACE_CATEGORY_ORDER } from "@/lib/content";

export function generateStaticParams() {
  return cemeteries.map(({ slug }) => ({ cemetery: slug }));
}

export default async function CemeteryPage({ params }: { params: Promise<{ cemetery: string }> }) {
  const { cemetery: slug } = await params;
  const cemetery = await getCemeteryView(slug);
  if (!cemetery) notFound();

  const mapUrl = placeDirectionsUrl(cemetery.address, cemetery.coordinates);
  const hasAccessContacts = Boolean(cemetery.accessContacts?.length);

  // Other entries that are the SAME physical beis hachaim (same spot, or same
  // city + name) — so two kevarim modelled separately still cross-link here.
  const normKey = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const alsoHere = cemeteries.filter((c) => {
    if (c.slug === cemetery.slug) return false;
    const km = kmBetween(c.coordinates, cemetery.coordinates);
    if (km !== null) return km < 0.4;
    return normKey(c.city) === normKey(cemetery.city) && normKey(c.name) === normKey(cemetery.name);
  });

  const placeGroups = PLACE_CATEGORY_ORDER.map((category) => ({
    category,
    label: PLACE_CATEGORY_LABELS[category],
    items: (cemetery.places ?? []).filter((place) => place.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Beis hachaim · {cemetery.country}</p>
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">{cemetery.yiddishName}</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{cemetery.name}</p>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{cemetery.city} · {cemetery.yiddishCity}</p>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-8 inline-block bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">Navigate to this beis hachaim →</a>
          <SavePlaceButtons place={{ id: `cemetery-${cemetery.slug}`, name: cemetery.name, yiddishName: cemetery.yiddishName, address: cemetery.address, coordinates: cemetery.coordinates, href: `/cemeteries/${cemetery.slug}` }} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <aside className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">How to get there</p>
            <p className="mt-4 text-sm leading-7 text-stone-600">{cemetery.address}</p>

            <ol className="mt-6 space-y-4 border-t border-[var(--gold-light)] pt-5">
              {cemetery.arrivalNotes.map((note, index) => (
                <li key={note} className="flex gap-3 text-sm leading-6 text-stone-600">
                  <span className="font-semibold text-[var(--gold)]">{index + 1}.</span>
                  {note}
                </li>
              ))}
            </ol>

            {cemetery.accessNote && <p className="mt-6 border-t border-[var(--gold-light)] pt-5 text-sm leading-6 text-stone-600">{cemetery.accessNote}</p>}

            <NearestAirports coordinates={cemetery.coordinates} address={cemetery.address} country={cemetery.country} />

            {cemetery.accessContacts && (
              <div className="mt-5 space-y-4">
                {cemetery.accessContacts.map((contact) => (
                  <div key={`${contact.label}-${contact.phone ?? contact.email}`}>
                    <p className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{contact.label}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{contact.note}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {contact.phone && <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="border border-[var(--gold)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Call {contact.phone}</a>}
                      {contact.email && <a href={`mailto:${contact.email}`} className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Email access desk</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Who is buried here</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Known kevarim</h2>

            <div className="mt-8 space-y-4">
              {cemetery.burials.map((burial) => (
                <article key={burial.name} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
                  <h3 dir="rtl" className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)]">{burial.yiddishName}</h3>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-stone-500">{burial.name}</p>
                  {burial.knownAs && <p className="mt-3 text-sm font-semibold text-stone-700">{burial.knownAs}</p>}
                  {burial.seforim && <p dir="rtl" className="mt-3 text-lg text-[var(--navy)]">{burial.seforim}</p>}
                  {burial.yahrzeit && <p className="mt-3 text-sm text-stone-600">Yahrzeit: {burial.yahrzeit}</p>}
                  {burial.note && <p className="mt-3 text-sm leading-6 text-stone-600">{burial.note}</p>}
                </article>
              ))}
            </div>

            {alsoHere.length > 0 && (
              <div className="mt-8 border-t border-[var(--gold-light)] pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Also resting in this beis hachaim</p>
                <p className="mt-1 text-sm text-stone-500">Other kevarim recorded at the same cemetery:</p>
                <ul className="mt-3 space-y-2">
                  {alsoHere.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/cemeteries/${c.slug}`} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">{c.name}</Link>
                      <span className="text-sm text-stone-500"> — {c.burials.map((b) => b.knownAs || b.name).slice(0, 3).join(", ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {placeGroups.length > 0 && (
          <div className="mt-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Practical information nearby</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Kosher food, lodging, minyanim & more</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-500">Gathered from public sources — please confirm details before you rely on them.</p>
            <div className="mt-8 space-y-10">
              {placeGroups.map((group) => (
                <div key={group.category}>
                  <h3 className="flex items-baseline gap-3 border-b border-[var(--gold-light)] pb-2">
                    <span dir="rtl" className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{group.label.yiddish}</span>
                    <span className="text-sm font-semibold uppercase tracking-[0.12em] text-stone-500">{group.label.english}</span>
                  </h3>
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    {group.items.map((place) => (
                      <article key={`${place.name}-${place.address ?? ""}`} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
                        <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{place.name}</p>
                        {place.address && <p className="mt-2 text-sm leading-6 text-stone-600">{place.address}</p>}
                        {place.hours && <p className="mt-2 text-sm text-stone-600">Hours: {place.hours}</p>}
                        {place.notes && <p className="mt-3 text-sm leading-6 text-stone-600">{place.notes}</p>}
                        <div className="mt-4 flex flex-wrap gap-3">
                          {place.phone && <a href={`tel:${place.phone.replace(/[^+\d]/g, "")}`} className="border border-[var(--gold)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Call {place.phone}</a>}
                          {place.email && <a href={`mailto:${place.email}`} className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Email</a>}
                          {place.website && <a href={place.website} target="_blank" rel="noreferrer" className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Website ↗</a>}
                          {place.source && <a href={place.source} target="_blank" rel="noreferrer" className="px-1 py-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-400 underline decoration-[var(--gold)] underline-offset-4">Source</a>}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cemetery.coordinates && (
          <div className="mt-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Kosher food nearby</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">What&apos;s kosher around here</h2>
            <p className="mt-3 mb-6 max-w-3xl text-sm leading-6 text-stone-500">Live kosher restaurants, bakeries, and groceries near the kever, from OpenStreetMap.</p>
            <KosherNearby coordinates={cemetery.coordinates} radiusKm={15} heading="Kosher near this kever" />
          </div>
        )}

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Verification and source</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              {hasAccessContacts ? "This cemetery has a public access contact listed above. Please confirm it before traveling." : "No public access contact has been verified for this cemetery yet."}
            </p>
            <a href={cemetery.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Read the cemetery source →</a>
          </section>

          <SuggestEditButton
            targetType="location"
            targetId={cemetery.slug}
            title={cemetery.name}
            currentInfo={`${cemetery.yiddishName}\n${cemetery.address}\n${hasAccessContacts ? "Access contact listed" : "Access contact not verified"}`}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
