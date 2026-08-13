import { readWords } from "@/lib/site-words-store";
import Footer from "@/components/Footer";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SubBrandBanner from "@/components/SubBrand";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import SectionHeading from "@/components/SectionHeading";
import { placeDirectionsUrl } from "@/data/route-utils";
import StructuredData from "@/components/StructuredData";
import { getCemetery } from "@/data/cemeteries";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, faqPage, touristAttraction } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Lizhensk (Leżajsk) — How to Visit the Kever of Reb Elimelech | White Glove",
  description:
    "Visiting the Noam Elimelech in Leżajsk, Poland: the cemetery address, who is buried at the ohel, which airport to fly into and how far the drive is, where to eat and sleep, and what 21 Adar is like.",
  path: "/lizensk",
});

const OHEL_ADDRESS = "Górna 16, 37-300 Leżajsk, Poland";
const OHEL_COORDINATES = "50.251139, 22.422611";

/**
 * WHAT THIS PAGE HAD TO STOP DOING.
 *
 * It used to carry six cards headed Daven / Eat / Arrange / Reach / Stay /
 * Prepare, each describing the information the page would one day hold —
 * "where to arrange kosher food", "helpful information for tefillah times".
 * Somebody who searched for how to reach the kever of Reb Elimelech and
 * landed here was told, six times, that the answer was coming. A generic
 * "before you go" list sat underneath saying to confirm things.
 *
 * Sections now carry the answer or they are not on the page. Where the answer
 * is a range rather than a fact — which airport, how long the drive — the
 * range is the answer and it is given plainly. Where nobody has confirmed a
 * current detail, it goes in Contacts with what is actually known about it,
 * not in a card promising it later.
 */

/**
 * The airports people actually use, nearest first.
 *
 * Distances are by road, rounded, because that is the number that decides the
 * day — Leżajsk has no useful rail connection and everyone arrives by car.
 * `search` opens the flights tab of /book with the destination filled in; the
 * partner takes the booking, as everywhere else on this site.
 */
const ARRIVAL_AIRPORTS = [
  {
    code: "RZE",
    name: "Rzeszów–Jasionka",
    drive: "About 45 minutes — roughly 60 km",
    detail:
      "The closest airport by a wide margin, and the one that makes a same-day arrival at the ohel easy. Its route map is small: most travellers reach it on a connection through Warsaw or a European hub rather than a direct flight from overseas.",
  },
  {
    code: "KRK",
    name: "Kraków–Balice",
    drive: "About 3 hours — roughly 230 km",
    detail:
      "The usual choice for groups coming from abroad, because the flights are more frequent and cheaper, and because Kraków is already on most Poland itineraries. The drive east is straightforward motorway for most of the way.",
  },
  {
    code: "WAW",
    name: "Warsaw Chopin",
    drive: "About 3½ hours — roughly 270 km",
    detail:
      "Worth comparing when the fare or the schedule is better, and the natural pick if the trip also takes in Warsaw, Góra Kalwaria or the kevarim of central Poland.",
  },
] as const;

/**
 * The questions this page exists to answer.
 *
 * These are rendered as visible text AND handed to faqPage() — the two must
 * stay identical, which is why they live in one place.
 */
const QUESTIONS = [
  {
    question: "Where is the kever of Reb Elimelech of Lizhensk?",
    answer:
      // The answer is rendered as visible text and handed to faqPage(), so the
      // two must match character for character. It is deliberately all-Latin:
      // Hebrew script here would need a lang attribute on the rendered element,
      // and the transliterations are what somebody types into a search box.
      "In the Jewish cemetery at Górna 16, 37-300 Leżajsk, in the Podkarpackie region of south-eastern Poland. The ohel stands as the focal point of the cemetery. Leżajsk is the Polish name of the town; Lizhensk, Lizensk and Lezajsk all refer to the same place.",
  },
  {
    question: "When is the yahrzeit of the Noam Elimelech?",
    answer:
      "21 Adar. Reb Elimelech Weisblum was niftar in 5547 (1787). The yahrzeit draws thousands of visitors to a town of about fourteen thousand people, and parking, access to the ohel and lodging all work differently that week than they do the rest of the year — arrangements are made well in advance and change from year to year.",
  },
  {
    question: "Which airport do you fly into for Leżajsk?",
    answer:
      "Rzeszów–Jasionka (RZE) is closest, about 45 minutes away by road, but it has few direct international flights. Most travellers from abroad fly into Kraków (KRK), about 3 hours away, or Warsaw (WAW), about 3½ hours. There is no practical train to Leżajsk, so the last leg is by car or driver either way.",
  },
  {
    question: "Who else is buried at the ohel in Leżajsk?",
    answer:
      "Alongside Reb Elimelech, the family epitaphs recorded in and around the ohel include his sons Reb Elazar of Chmielnik, Reb Menachem Yissachar and Reb Yaakov of Mogielnica, his grandson Reb Naftali, and his sons-in-law Reb Natan Yechezkel and Reb Yisrael. Reb Zelig Shapira and his wife Perla, a daughter of the Maggid of Kozhnitz, lie in a larger ohel in the same cemetery.",
  },
  {
    question: "Is there kosher food and a mikveh in Leżajsk?",
    answer:
      "Yes — the Hachnasas Orchim serves the kever and has guest rooms, a beis midrash and a mikveh. Leżajsk has no standing Jewish community of its own, so meals and rooms are arranged with the Hachnasas Orchim rather than found on arrival, and are confirmed before you travel.",
  },
] as const;

/**
 * Named at the ohel, and near enough to be part of the same trip.
 *
 * The Sokołów entry earns its place twice over: it is 30 km away, and the
 * Elimelech buried there is constantly confused with this one.
 */
const NEARBY = [
  {
    href: "/cemeteries/frysztak-esther-etel",
    title: "Frysztak — Esther Etel, daughter of the Rebbe Reb Elimelech",
    detail: "His daughter's own kever, a small railed tomb at the centre of a cemetery of which little else survives.",
  },
  {
    href: "/cemeteries/sokolow-malopolski-elimelech-rudnik",
    title: "Sokołów Małopolski — Reb Elimelech of Rudnik",
    detail: "About 30 km away, and a different tzaddik entirely — searches conflate the two names constantly.",
  },
  {
    href: "/cemeteries/glogow-malopolski-rubin",
    title: "Głogów Małopolski — the Rubin rebbes",
    detail: "On the Rzeszów side, an easy addition to the drive between the airport and Leżajsk.",
  },
  {
    href: "/cemeteries/strzyzow-alter-zeev-horowitz",
    title: "Strzyżów — Reb Alter Ze'ev Horowitz",
    detail: "South-west of Rzeszów, on the way toward Dinov and Rymanów.",
  },
] as const;

const verifiedDetails = (contactEmail: string) => [
  {
    label: "Ohel & cemetery",
    title: "Ohel of Reb Elimelech",
    detail: OHEL_ADDRESS,
    action: "Call the ohel",
    href: "tel:+48735250505",
  },
  {
    label: "Meals & lodging",
    title: "Hachnasas Orchim · Studzienna 2",
    detail:
      "A separate Hachnasas Orchim facility with guest rooms, a beis midrash, and a mikveh. The organization’s current site publishes meal and lodging reservations; confirm arrangements directly before traveling.",
    action: "Reserve meals or lodging",
    href: "https://lizansk.com/en/lizhensk/",
  },
  {
    label: "Meals & lodging",
    title: "Hachnasas Orchim · Building A",
    detail:
      "A second facility opposite the kever at Plac Targowy 6B. Public travel information describes guest rooms, a beis midrash, mikveh, hot drinks, and light refreshments; its current contact and booking arrangements are being reconfirmed.",
    action: "Contact White Glove for updates",
    href: `mailto:${contactEmail}?subject=Lizhensk%20Hachnasas%20Orchim%20Building%20A`,
  },
  {
    label: "Medical help",
    title: "Leżajsk Hospital",
    detail: "SP ZOZ, Leśna 22, 37-300 Leżajsk. Main line: +48 17 240 49 00. Emergency department desk: +48 17 240 49 07.",
    action: "Call hospital",
    href: "tel:+48172404900",
  },
  {
    label: "Emergency",
    title: "Poland emergency services",
    detail:
      "Call 112 for urgent police, fire, or medical help. It is free throughout Poland and can be called from a mobile without a SIM card.",
    action: "Call 112",
    href: "tel:112",
  },
];

export default async function LizenskPage() {
  const { contactEmail } = await readWords();
  // The burials are read from the listing rather than retyped here, so the
  // page and /cemeteries/lizhensk can never drift apart on who lies where.
  const cemetery = getCemetery("lizhensk");
  const burials = cemetery?.burials ?? [];
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <StructuredData
        data={[
          touristAttraction({
            name: "Lizhensk — kever of Rabbi Elimelech",
            description:
              "The ohel of Rabbi Elimelech Weisblum of Lizhensk, author of the Noam Elimelech, in Leżajsk, Poland.",
            path: "/lizensk",
            address: OHEL_ADDRESS,
            coordinates: OHEL_COORDINATES,
            country: "Poland",
            alternateNames: ["ליזענסק", "Lizensk", "Leżajsk", "Lezajsk"],
          }),
          faqPage(QUESTIONS.map((entry) => ({ question: entry.question, answer: entry.answer }))),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Destinations", path: "/stops" },
            { name: "Lizhensk", path: "/lizensk" },
          ]),
        ]}
      />
      <Navbar />
      <SubBrandBanner />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Featured destination · Poland</p>
          <h1 dir="rtl" lang="yi" className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">ליזענסק</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-stone-500 sm:text-4xl">Lizhensk · Leżajsk, Poland</p>
          <p className="mt-5 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Journey to the Noam Elimelech</p>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
            The ohel of Reb Elimelech stands in the Jewish cemetery on Górna, at the edge of a small town in south-eastern Poland. Getting
            there means a flight into Rzeszów, Kraków or Warsaw and a drive — this page has the distances, who lies at the ohel, and how
            food and lodging are arranged in a town with no Jewish community left of its own.
          </p>
          <div className="mt-12 grid border-y border-[var(--gold-light)] sm:grid-cols-3">
            <a href="#getting-there" className="border-b border-[var(--gold-light)] px-5 py-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)] sm:border-b-0 sm:border-r">Getting there</a>
            <a href="#buried-here" className="border-b border-[var(--gold-light)] px-5 py-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)] sm:border-b-0 sm:border-r">Who is buried here</a>
            <a href="#contacts" className="px-5 py-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">Contacts & essentials</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">About the tzaddik</p>
            <h2 dir="rtl" lang="yi" className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">רבי אלימלך מליזענסק</h2>
            <p className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-stone-500 sm:text-3xl">Rabbi Elimelech Weisblum of Lizhensk</p>
            <a href={placeDirectionsUrl(OHEL_ADDRESS, OHEL_COORDINATES)} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">Navigate to the kever →</a>
            <Link href="/cemeteries/lizhensk" className="mt-5 inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">View this <span dir="rtl" lang="he">בית החיים</span> →</Link>
            <SavePlaceButtons place={{ id: "lizensk", name: "Lizhensk", yiddishName: "ליזענסק", address: OHEL_ADDRESS, coordinates: OHEL_COORDINATES, href: "/lizensk" }} />
            <div className="mt-8 border-t border-[var(--gold-light)] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Finding the kever</p>
              <ol className="mt-4 space-y-3">
                <li className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold-ink)]">1.</span><span>Navigate to Górna 16, the Lizhensk Jewish Cemetery, on the edge of the town.</span></li>
                <li className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold-ink)]">2.</span><span>The ohel is the focal point of the cemetery; the kever of Reb Elimelech is inside it.</span></li>
                <li className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold-ink)]">3.</span><span>Graves of his family are recorded in and around the ohel, with a second, larger ohel elsewhere in the same cemetery.</span></li>
              </ol>
            </div>
          </div>
          <div className="border-l border-[var(--gold)] pl-6">
            <p className="text-lg leading-8 text-stone-600">
              Reb Elimelech of Lizhensk was a central early Chassidic leader whose seforim and talmidim shaped generations. His sefer,{" "}
              <em>Noam Elimelech</em>, is a foundational work on the Torah. His yahrzeit is 21 Adar; he was niftar in 5547 (1787).
            </p>
            <p className="mt-5 text-lg leading-8 text-stone-600">
              Much of what became Polish and Galician chassidus runs through his beis midrash — the Chozeh of Lublin, Reb Mendele of
              Rymanów, the Maggid of Kozhnitz and Reb Dovid of Lelov were among his talmidim, and their own kevarim are scattered across
              the same corner of the country. That is why a visit here is so often the first stop of a longer route rather than a trip of
              its own.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold-ink)]">Sefer</p><p dir="rtl" lang="yi" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">נועם אלימלך</p></div>
              <div><p dir="rtl" lang="yi" className="text-xs font-bold tracking-[0.12em] text-[var(--gold-ink)]">יארצייט</p><p dir="rtl" lang="yi" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">כ״א אדר</p></div>
              <div><p dir="rtl" lang="yi" className="text-xs font-bold tracking-[0.12em] text-[var(--gold-ink)]">שנת פטירה</p><p dir="rtl" lang="yi" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">תקמ״ז / 1787</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="getting-there" className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Getting there"
            title="Three airports, and a drive at the end of each."
            description="Leżajsk has no useful rail connection, so however you fly in, the last leg is by road. Which airport is right depends on whether you are pricing the flight or the day."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {ARRIVAL_AIRPORTS.map((airport) => (
              <article key={airport.code} className="flex flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">{airport.code}</p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{airport.name}</h3>
                <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{airport.drive} to the ohel</p>
                <p className="mt-4 flex-1 leading-7 text-stone-600">{airport.detail}</p>
                <Link
                  href={`/book?type=flights&to=${airport.code}`}
                  className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 transition hover:text-[var(--gold-ink)]"
                >
                  Search flights to {airport.code} →
                </Link>
              </article>
            ))}
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
              <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Getting between the airport and the town</h3>
              <p className="mt-4 leading-7 text-stone-600">
                Almost everyone drives or is driven. A hired car gives you the surrounding kevarim as well, which is most of the reason
                people come this far east; a driver arranged in advance is the easier option for a group, or for anyone arriving late and
                davening the same evening.
              </p>
              <Link href="/book?type=cars" className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 transition hover:text-[var(--gold-ink)]">Search car hire →</Link>
            </div>
            <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
              <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Where to stay</h3>
              <p className="mt-4 leading-7 text-stone-600">
                The Hachnasas Orchim beside the kever is where most visitors sleep and eat, and it is arranged directly — the contacts are
                below. Rzeszów, under an hour away, is where to look for an ordinary hotel when the Hachnasas Orchim is full, which it will
                be around 21 Adar.
              </p>
              <Link href="/book?type=hotels&destination=Rzesz%C3%B3w%2C%20Poland" className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 transition hover:text-[var(--gold-ink)]">Search places to stay in Rzeszów →</Link>
            </div>
          </div>
          <p className="mt-8 text-sm leading-7 text-stone-500">
            Searches open with a booking partner, who takes the booking and the payment. Nothing is booked on this site.
          </p>
        </div>
      </section>

      <section id="buried-here" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="At the ohel"
          title="Who is buried here."
          description="Reb Elimelech's family are recorded in and around the ohel, and a second, larger ohel stands elsewhere in the same cemetery."
        />
        <div className="mt-12 grid gap-x-10 gap-y-6 md:grid-cols-2">
          {burials.map((burial) => (
            <article key={burial.name} className="border-t border-[var(--gold-light)] pt-5">
              <p dir="rtl" lang="yi" className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{burial.yiddishName}</p>
              <p className="mt-1 font-semibold text-[var(--navy)]">{burial.name}</p>
              {burial.knownAs ? <p className="mt-1 text-sm text-stone-500">{burial.knownAs}</p> : null}
              {burial.seforim ? <p dir="rtl" lang="yi" className="mt-2 text-sm text-stone-600">{burial.seforim}</p> : null}
              {burial.yahrzeit ? <p dir="rtl" lang="yi" className="mt-1 text-sm text-stone-600">{burial.yahrzeit}</p> : null}
              {burial.note ? <p className="mt-2 text-sm leading-6 text-stone-600">{burial.note}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="21 Adar"
            title="The yahrzeit is a different visit."
            description="Everything on this page describes an ordinary week. The yahrzeit is not one."
          />
          <div className="mt-10 max-w-3xl space-y-5 text-lg leading-8 text-stone-600">
            <p>
              Thousands come for 21 Adar, to a town of roughly fourteen thousand people with one small Jewish cemetery at its edge. Access
              to the ohel, parking, road closures around Górna, meals and every bed for miles are organised specially for that week, and the
              arrangements are not the same from one year to the next.
            </p>
            <p>
              What that means in practice: flights and rooms go early, the drive from Rzeszów or Kraków takes longer than the times above,
              and anything you have not confirmed in advance you will not find on the day. If you are planning a yahrzeit visit, work
              backwards from 21 Adar rather than forwards from your flights.
            </p>
          </div>
          <Link href="/itinerary" className="mt-8 inline-flex min-h-11 items-center bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">Open the itinerary planner →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="Nearby"
          title="What else is within reach."
          description="Few people fly to Poland for one kever. These are the closest, and the drive between them is short."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {NEARBY.map((place) => (
            <Link key={place.href} href={place.href} className="block border border-[var(--gold-light)] bg-[#fcfaf6] p-7 transition hover:border-[var(--gold)]">
              <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{place.title}</h3>
              <p className="mt-3 leading-7 text-stone-600">{place.detail}</p>
            </Link>
          ))}
        </div>
        <Link href="/stops" className="mt-8 inline-block text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Browse every kever on the site →</Link>
      </section>

      <section id="contacts" className="border-t border-[var(--gold-light)] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Practical contacts"
            title="Key information, ready when you need it."
            description="These details are drawn from the published Lizhensk and local Leżajsk sources. Confirm availability before traveling, especially around Shabbos and the yahrzeit."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {verifiedDetails(contactEmail).map((item) => (
              <article key={item.title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">{item.label}</p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{item.title}</h3>
                <p className="mt-4 leading-7 text-stone-600">{item.detail}</p>
                <a className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 transition hover:text-[var(--gold-ink)]" href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined}>{item.action} →</a>
              </article>
            ))}
          </div>
          {/* "Help us keep this useful — have a trusted driver, food contact
              or current minyan detail for Lizhensk?" A page somebody opens to
              plan a visit to a kever asked them to do our research instead.
              Corrections and local knowledge go through Contact. */}
        </div>
      </section>

      <section className="border-t border-[var(--gold-light)] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Questions" title="What people ask before they go." />
          <div className="mt-12 max-w-4xl divide-y divide-[var(--gold-light)]">
            {QUESTIONS.map((entry) => (
              <div key={entry.question} className="py-7 first:pt-0">
                <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{entry.question}</h3>
                <p className="mt-3 leading-8 text-stone-600">{entry.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
