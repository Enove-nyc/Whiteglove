import Link from "next/link";
import KosherNearby from "@/components/KosherNearby";
import { placeMapUrl } from "@/data/route-utils";
import type { DestinationRecord, PracticalSection } from "@/data/destination-database";
import { trustLabel, type TrustLabel } from "@/lib/verification";
import { DESTINATION_SECTIONS, LEGACY_RECORD_SECTIONS } from "@/lib/destination-sections";
import type { PracticalPlace } from "@prisma/client";

type SectionKey = "accommodations" | "kosherFood" | "minyanim" | "mikvaos" | "transport";

/**
 * The sections of a destination page, from the one shared list.
 *
 * This component used to carry its own copy of five, which meant a hospital
 * or a Shabbos note recorded in the admin had no heading to appear under and
 * was silently dropped on the way to the page.
 *
 * Five of them also have a section on the built-in record — a status, a note,
 * a last-checked date — from before the database existed. Those keep it, so a
 * town with nothing in the database still says "being checked" rather than
 * going blank. The rest have no such record, so they appear only when there
 * is something real to show.
 */
const sections = DESTINATION_SECTIONS.map((section) => ({
  yiddish: section.yiddish,
  english: section.label,
  key: LEGACY_RECORD_SECTIONS[section.key] as SectionKey | undefined,
  categories: section.key === "TRANSPORT" ? ["TRANSPORT", "DRIVER", "AIRPORT"] : [section.key],
}));

function Detail({ section }: { section: PracticalSection }) {
  if (section.entries.length) {
    return <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-600">{section.entries.map((entry) => <li key={entry}>{entry}</li>)}</ul>;
  }

  return <p className="mt-4 text-sm leading-6 text-stone-600">{section.note}</p>;
}

const TONE: Record<TrustLabel["tone"], string> = {
  verified: "border-emerald-700 text-emerald-800",
  partial: "border-[var(--gold)] text-[var(--navy)]",
  community: "border-sky-700 text-sky-800",
  pending: "border-amber-700 text-amber-800",
  empty: "border-stone-300 text-stone-500",
};

/**
 * What a visitor is told about this section: what has been checked, and when.
 *
 * Never a percentage. A number next to a kever reads as a rating of the
 * kever, and "62% complete" answers no question anybody is asking. The
 * percentage lives in the admin, where it is a work queue.
 *
 * The glyph carries the state as well as the colour, so it survives being
 * printed, or being read by somebody who cannot separate the two ambers.
 */
function Status({ section }: { section: PracticalSection }) {
  const label = trustLabel(section);
  return (
    <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${TONE[label.tone]}`}>
      <span aria-hidden="true">{label.glyph}</span>
      {label.text}
    </p>
  );
}

const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;
const waHref = (phone: string) => `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
const mapHref = (address: string, coordinates?: string | null) => placeMapUrl(address, coordinates);

const pill = "border border-[var(--gold)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white";

// A single editable listing — the data an admin maintains for each place.
function PlaceCard({ place }: { place: PracticalPlace }) {
  return (
    <div className="border-t border-[var(--gold-light)] pt-4 first:border-t-0 first:pt-0">
      <h4 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{place.name}</h4>
      {place.hours && (
        <p className="mt-2 text-sm leading-6 text-stone-600">
          <span className="font-semibold text-[var(--navy)]">Hours:</span> {place.hours}
        </p>
      )}
      {place.address && <p className="mt-1 text-sm leading-6 text-stone-600">{place.address}</p>}
      {place.kosherInfo && (
        <p className="mt-1 text-sm leading-6 text-stone-600">
          <span className="font-semibold text-[var(--navy)]">Kosher:</span> {place.kosherInfo}
        </p>
      )}
      {place.amenities && <p className="mt-1 text-sm leading-6 text-stone-600">{place.amenities}</p>}
      {place.notes && <p className="mt-1 text-sm leading-6 text-stone-600">{place.notes}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {place.phone && <a href={telHref(place.phone)} className={pill}>Call {place.phone}</a>}
        {place.whatsapp && <a href={waHref(place.whatsapp)} target="_blank" rel="noreferrer" className={pill}>WhatsApp</a>}
        {place.email && <a href={`mailto:${place.email}`} className={pill}>Email</a>}
        {place.website && <a href={place.website} target="_blank" rel="noreferrer" className={pill}>Website</a>}
        {place.bookingLink && <a href={place.bookingLink} target="_blank" rel="noreferrer" className={pill}>Book</a>}
        {place.address && <a href={mapHref(place.address, place.coordinates)} target="_blank" rel="noreferrer" className={pill}>Map</a>}
      </div>
      {/* "Is there kosher food near this hotel" is the question somebody is
          actually asking, and it is not the same question as "is there kosher
          food in this city". Asked live against the hotel's own position, so
          the answer cannot go stale — and only where a coordinate exists. */}
      {place.category === "ACCOMMODATION" && place.coordinates && (
        <div className="mt-4">
          <KosherNearby coordinates={place.coordinates} radiusKm={3} heading={`Kosher within walking distance of ${place.name}`} />
        </div>
      )}
    </div>
  );
}

export default function PracticalInformation({
  record,
  places = [],
}: {
  record: DestinationRecord;
  // Published places from the content database. When present for a section,
  // they replace the static placeholder for that section.
  places?: PracticalPlace[];
}) {
  return (
    <div className="mt-12">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ yiddish, english, key, categories }) => {
          const dbPlaces = places.filter((place) => categories.includes(place.category));
          // A section with no built-in record and nothing recorded is not a
          // section yet. Printing an empty heading for it would tell a
          // visitor there is a hospital section and then say nothing in it.
          if (!key && dbPlaces.length === 0) return null;
          return (
            <article key={english} className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-6">
              {/* Yiddish where there is a heading for it. The sections added
                  in July 2026 have none yet, and an invented translation is
                  wrong in a way only the reader can see — so English alone
                  until the owner supplies them. */}
              {yiddish ? (
                <>
                  <h3 dir="rtl" lang="yi" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{yiddish}</h3>
                  <p className="mt-1 text-sm text-stone-500">{english}</p>
                </>
              ) : (
                <h3 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{english}</h3>
              )}
              {dbPlaces.length ? (
                <>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">Checked information</p>
                  <div className="mt-4 space-y-4">
                    {dbPlaces.map((place) => <PlaceCard key={place.id} place={place} />)}
                  </div>
                </>
              ) : key ? (
                <>
                  <Status section={record[key]} />
                  <Detail section={record[key]} />
                  {record[key].lastChecked && <p className="mt-4 text-xs uppercase tracking-[0.12em] text-stone-500">Last checked: {record[key].lastChecked}</p>}
                </>
              ) : null}
            </article>
          );
        })}
        <article className="border border-[var(--gold)] bg-[#fcfaf6] p-6">
          {/* No Yiddish heading here: the one that was read "fligers un
              hoteln", English in Hebrew letters rather than a translation. */}
          <h3 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">Flights &amp; hotels</h3>
          <p className="mt-4 text-sm leading-6 text-stone-600">Search travel options for your journey in one place.</p>
          <Link href="/book" className="mt-5 inline-block border border-[var(--gold)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Search travel →</Link>
        </article>
      </div>
    </div>
  );
}
