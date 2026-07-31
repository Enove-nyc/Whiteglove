import Footer from "@/components/Footer";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SubBrandBanner from "@/components/SubBrand";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import SuggestEditButton from "@/components/SuggestEditButton";
import SectionHeading from "@/components/SectionHeading";
import { placeDirectionsUrl } from "@/data/route-utils";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, touristAttraction } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Lizhensk Travel Guide & Kever of Reb Elimelech | White Glove",
  description:
    "Leżajsk, Poland: how to reach the kever of Rabbi Elimelech of Lizhensk, the ohel and its access, kosher food and Shabbos, minyanim, mikvaos, drivers and where to stay.",
  path: "/lizensk",
});

const guideSections = [
  ["Daven", "Tefillos at the kever", "Preparation for your visit, including commonly said tefillos and practical guidance for the ohel."],
  ["Eat", "Kosher food & Shabbos", "Where to arrange kosher food, what to plan for Shabbos, and the essentials to have in place before you arrive."],
  ["Arrange", "Minyanim & mikvaos", "Helpful information for tefillah times, Shabbos planning, and mikvah arrangements."],
  ["Reach", "Drivers & important contacts", "Trusted transportation, local support, and important numbers kept together for when you need them."],
  ["Stay", "Hotels & accommodations", "Where to stay, walking-distance considerations, and practical amenities for a comfortable visit."],
  ["Prepare", "Before you travel", "Airport routes, what to bring, and simple planning notes to make your journey smoother."],
];

const preparationChecklist = [
  "Save your driver and hotel details before leaving the airport.",
  "Confirm kosher food and Shabbos arrangements ahead of your visit.",
  "Keep your tefillos and a small amount of local currency easily accessible.",
  "Check minyan and mikvah arrangements before Shabbos or a busy yahrzeit period.",
];

const verifiedDetails = [
  {
    label: "Ohel & cemetery",
    title: "Ohel of Reb Elimelech",
    detail: "Górna 16, 37-300 Leżajsk, Poland",
    action: "Call the ohel",
    href: "tel:+48735250505",
  },
  {
    label: "Meals & lodging",
    title: "Hachnasas Orchim · Studzienna 2",
    detail: "A separate Hachnasas Orchim facility with guest rooms, a beis midrash, and a mikveh. The organization’s current site publishes meal and lodging reservations; confirm arrangements directly before traveling.",
    action: "Reserve meals or lodging",
    href: "https://lizansk.com/en/lizhensk/",
  },
  {
    label: "Meals & lodging",
    title: "Hachnasas Orchim · Building A",
    detail: "A second facility opposite the kever at Plac Targowy 6B. Public travel information describes guest rooms, a beis midrash, mikveh, hot drinks, and light refreshments; its current contact and booking arrangements are being reconfirmed.",
    action: "Contact White Glove for updates",
    href: "mailto:contact@whitegloveitineraries.com?subject=Lizhensk%20Hachnasas%20Orchim%20Building%20A",
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
    detail: "Call 112 for urgent police, fire, or medical help. It is free throughout Poland and can be called from a mobile without a SIM card.",
    action: "Call 112",
    href: "tel:112",
  },
];

export default function LizenskPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <StructuredData
        data={[
          touristAttraction({
            name: "Lizhensk — kever of Rabbi Elimelech",
            description: "The ohel of Rabbi Elimelech Weisblum of Lizhensk, author of the Noam Elimelech, in Leżajsk, Poland.",
            path: "/lizensk",
            address: "Górna 16, 37-300 Leżajsk, Poland",
            coordinates: "50.251139, 22.422611",
            country: "Poland",
            alternateNames: ["ליזענסק", "Lizensk", "Leżajsk", "Lezajsk"],
          }),
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
        <div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Featured destination · Poland</p><h1 dir="rtl" lang="yi" className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">ליזענסק</h1><p className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-stone-500 sm:text-4xl">Lizhensk</p><p className="mt-5 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Journey to the Noam Elimelech</p><p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">A practical, respectful guide to Lizhensk—designed around your tefillos and every essential detail of the visit.</p>
          <div className="mt-12 grid border-y border-[var(--gold-light)] sm:grid-cols-3"><a href="#tefillos" className="border-b border-[var(--gold-light)] px-5 py-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)] sm:border-b-0 sm:border-r">Tefillos & preparation</a><a href="#essentials" className="border-b border-[var(--gold-light)] px-5 py-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)] sm:border-b-0 sm:border-r">Food, minyan & mikvah</a><a href="#contacts" className="px-5 py-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">Contacts & transport</a></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">About the tzaddik</p><h2 dir="rtl" lang="yi" className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">רבי אלימלך מליזענסק</h2><p className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-stone-500 sm:text-3xl">Rabbi Elimelech Weisblum of Lizhensk</p><a href={placeDirectionsUrl("Górna 16, 37-300 Leżajsk, Poland", "50.251139, 22.422611")} target="_blank" rel="noreferrer" className="mt-6 inline-block bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">Navigate to the kever →</a><Link href="/cemeteries/lizhensk" className="mt-5 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">View this בית החיים →</Link><SavePlaceButtons place={{ id: "lizensk", name: "Lizhensk", yiddishName: "ליזענסק", address: "Górna 16, 37-300 Leżajsk, Poland", coordinates: "50.251139, 22.422611", href: "/lizensk" }} /><SuggestEditButton targetType="location" targetId="lizensk" title="Lizhensk" currentInfo="ליזענסק
Rabbi Elimelech Weisblum of Lizhensk
Górna 16, 37-300 Leżajsk, Poland" /><div className="mt-8 border-t border-[var(--gold-light)] pt-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Finding the kever</p><ol className="mt-4 space-y-3"><li className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold)]">1.</span><span>Navigate to Górna 16, the Lizhensk Jewish Cemetery.</span></li><li className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold)]">2.</span><span>The kever of Reb Elimelech is within the ohel at the cemetery.</span></li><li className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold)]">3.</span><span>For a yahrzeit visit, expect special access and crowd arrangements; confirm them before you travel.</span></li></ol></div></div>
          <div className="border-l border-[var(--gold)] pl-6"><p className="text-lg leading-8 text-stone-600">Reb Elimelech of Lizhensk was a central early Chassidic leader whose seforim and talmidim shaped generations. His sefer, <em>Noam Elimelech</em>, is a foundational work on the Torah. His yahrzeit is 21 Adar; he was niftar in 5547 (1787).</p><div className="mt-8 grid gap-5 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Sefer</p><p dir="rtl" lang="yi" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">נועם אלימלך</p></div><div><p dir="rtl" lang="yi" className="text-xs font-bold tracking-[0.12em] text-[var(--gold)]">יארצייט</p><p dir="rtl" lang="yi" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">כ״א אדר</p></div><div><p dir="rtl" lang="yi" className="text-xs font-bold tracking-[0.12em] text-[var(--gold)]">שנת פטירה</p><p dir="rtl" lang="yi" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">תקמ״ז / 1787</p></div></div></div>
        </div>
      </section>
      <section id="essentials" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="Your Lizhensk guide" title="The essentials for a meaningful visit." description="Tefillos, food, minyanim, mikvaos, contacts, and travel details—in the order you need them." />
        <div className="mt-12 grid gap-5 md:grid-cols-2">{guideSections.map(([label, title, description]) => <article key={label} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">{label}</p><h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{title}</h2><p className="mt-4 leading-7 text-stone-600">{description}</p></article>)}</div>
      </section>
      <section id="tefillos" className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">Prepare with peace of mind</p><h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">Make room for what brought you here.</h2><p className="mt-6 leading-8 text-stone-600">This guide will collect practical preparation for the visit, while leaving room for every person to come with their own tefillos and intention.</p></div>
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Before you go</p><ul className="mt-5 space-y-4">{preparationChecklist.map((item) => <li key={item} className="flex gap-4 border-t border-[var(--gold-light)] pt-4 text-stone-700 first:border-t-0 first:pt-0"><span className="mt-1 text-[var(--gold)]">✦</span><span className="leading-7">{item}</span></li>)}</ul></div>
        </div>
      </section>
      <section id="contacts" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="Practical contacts" title="Key information, ready when you need it." description="These details are drawn from the published Lizhensk and local Leżajsk sources. Confirm availability before traveling, especially around Shabbos and the yahrzeit." />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {verifiedDetails.map((item) => <article key={item.title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">{item.label}</p><h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{item.title}</h2><p className="mt-4 leading-7 text-stone-600">{item.detail}</p><a className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 transition hover:text-[var(--gold)]" href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined}>{item.action} →</a></article>)}
        </div>
        <div className="mt-8 border border-[var(--gold-light)] bg-[var(--navy)] p-8 text-white sm:flex sm:items-center sm:justify-between sm:gap-8"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-light)]">Help us keep this useful</p><p className="mt-2 text-lg text-slate-100">Have a trusted driver, food contact, or current minyan detail for Lizhensk?</p></div><a href="mailto:contact@whitegloveitineraries.com?subject=Lizhensk%20information" className="mt-5 inline-block shrink-0 border border-[var(--gold-light)] px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.14em] transition hover:bg-[var(--gold)] hover:text-[var(--navy-deep)] sm:mt-0">Share a trusted contact</a></div>
      </section>
      <Footer />
    </main>
  );
}
