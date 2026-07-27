import DestinationCard from "@/components/DestinationCard";
import DestinationSearch from "@/components/DestinationSearch";
import Footer from "@/components/Footer";
import PromotionBanner from "@/components/PromotionBanner";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import TravelAssistantBox from "@/components/TravelAssistantBox";
import { getActivePromotions } from "@/lib/admin-content";
import { headers } from "next/headers";
import Link from "next/link";

const destinations = [
  { name: "Lizhensk", yiddishName: "ליזענסק", country: "Poland", description: "A complete guide for a meaningful visit to the Noam Elimelech.", href: "/lizensk" },
  { name: "Uman", yiddishName: "אומאן", country: "Ukraine", description: "A guide to Rebbe Nachman of Breslov, planned with clarity and care.", href: "/uman" },
  { name: "Medzhybizh", yiddishName: "מעזשיבוזש", country: "Ukraine", description: "A guide to the resting place of the Baal Shem Tov and the birthplace of Chassidus.", href: "/medzhybizh" },
  { name: "Belz", yiddishName: "בעלז", country: "Ukraine", description: "Discover the places and stories of historic Belzer Chassidus.", href: "/belz" },
  { name: "Lelov", yiddishName: "לעלוב", country: "Poland", description: "A guide to the kever of Reb Dovid Lelover and the town's living legacy.", href: "/lelov" },
  { name: "Łańcut (Ropshitz)", yiddishName: "לאַנצוט (ראפשיץ)", country: "Poland", description: "Visit the kever of the Ropshitzer Rav in Łańcut.", href: "/ropshitz" },
  { name: "Preshburg", yiddishName: "פרעשבורג", country: "Slovakia", description: "A guide to the Chatam Sofer's preserved historic gravesite.", href: "/preshburg" },
  { name: "Kerestir", yiddishName: "קערעסטיר", country: "Hungary", description: "Visit the kever of Reb Shayale, with practical arrival guidance.", href: "/kerestir" },
  { name: "Munkatch", yiddishName: "מונקאטש", country: "Ukraine", description: "A guide to the Minchas Elazar and the Munkatcher Rebbes' ohel.", href: "/munkatch" },
  { name: "Rymanow", yiddishName: "רימינוב", country: "Poland", description: "Plan a focused visit to Reb Mendele of Rymanow.", href: "/rymanow" },
  { name: "Dynow", yiddishName: "דינוב", country: "Poland", description: "A practical guide to the Bnei Yissaschar's kever.", href: "/dynow" },
  { name: "Sanz", yiddishName: "צאנז", country: "Poland", description: "Visit the Divrei Chaim and the historic ohel of Sanz.", href: "/sanz" },
  { name: "Ijhel", yiddishName: "איהעל", country: "Hungary", description: "Visit the Yismach Moshe in the old Jewish cemetery of Ujhely.", href: "/ijhel" },
  { name: "Liska", yiddishName: "ליסקא", country: "Hungary", description: "A guide to Reb Hershele Lisker, the Ach Pri Tevuah.", href: "/liska" },
];

const services = [
  ["01", "At the kever", "Tefillos, practical preparation, visiting guidance, and the details that help you arrive ready."],
  ["02", "Kosher essentials", "Food, Shabbos arrangements, minyanim, mikvaos, and the information travelers look for first."],
  ["03", "People you can reach", "Drivers, local contacts, and important numbers collected in one dependable place."],
  ["04", "A smoother journey", "Clear travel planning from airport to hotel, so the logistics stay out of the way."],
];

export default async function Home() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
  const homepagePromotions = await getActivePromotions("homepage-promo", "/", device);
  const inlinePromotions = await getActivePromotions("inline-content", "/", device);

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />

      <section className="relative border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[linear-gradient(135deg,transparent_0%,rgba(217,199,163,.38)_100%)] lg:block" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--gold)]">Kosher travel, considered</p>
          <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-[var(--navy)] sm:text-6xl lg:text-7xl">Every journey, planned with purpose.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">Kevarim and nesios, and kosher getaways — every detail handled with care, from the first tefillah to the ride home.</p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Link href="/stops" className="group flex flex-col justify-between border border-[var(--navy)] bg-[var(--navy)] p-8 text-white transition hover:bg-[var(--navy-deep)]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">Kevarim &amp; Nesios</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl">Guides to tzaddikim &amp; kevarim</h2>
                <p className="mt-4 leading-7 text-slate-200">Tefillos, kosher food, minyanim, mikvaos, local contacts, and the practical details that matter most.</p>
              </div>
              <span className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-[var(--gold-light)] transition group-hover:text-white">Explore the guides →</span>
            </Link>
            <Link href="/getaways" className="group flex flex-col justify-between border border-[var(--gold-light)] bg-[#fcfaf6] p-8 transition hover:border-[var(--gold)]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Kosher Getaways</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">Vacations, resorts &amp; cities</h2>
                <p className="mt-4 leading-7 text-stone-600">Rome, Paris, and restful getaways — planned kosher, from start to finish.</p>
              </div>
              <span className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] transition group-hover:text-[var(--gold)]">See getaways →</span>
            </Link>
          </div>

          <div className="mt-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Search kevarim &amp; destinations</p>
            <DestinationSearch />
          </div>
          <div className="mt-8">
            <PromotionBanner promotion={homepagePromotions[0] ?? null} placement="homepage-promo" />
          </div>
        </div>
      </section>

      <section id="destinations" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="Destination directory" title="The information you need when it matters." description="Browse by city or tzaddik—every guide is built around the questions frum travelers actually ask before and during a visit." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => <DestinationCard key={destination.name} {...destination} />)}
        </div>
        <div className="mt-12 text-center">
          <Link href="/stops" className="inline-block border border-[var(--gold)] px-8 py-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">
            Browse all destinations →
          </Link>
        </div>
      </section>

      <section id="services" className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
        <SectionHeading centered eyebrow="The White Glove way" title="The essentials, thoughtfully gathered." description="Practical, respectful guidance for a journey with purpose." />
          <div className="mt-14 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {services.map(([number, title, description]) => (
              <div key={number} className="flex gap-5 border-t border-[var(--gold-light)] pt-6">
                <span className="pt-1 text-xs font-bold tracking-[0.14em] text-[var(--gold)]">{number}</span>
                <div><h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{title}</h3><p className="mt-2 leading-7 text-stone-600">{description}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-10 border border-[var(--gold-light)] bg-[#fcfaf6] p-8 sm:p-12 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">Our promise</p><h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">The details should never distract from the reason you came.</h2></div>
          <p className="border-l border-[var(--gold)] pl-6 text-lg leading-8 text-stone-600">We gather the essentials in one calm, dependable guide, leaving you free to focus on your tefillos and the meaning of the journey.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <TravelAssistantBox />
      </section>

      {inlinePromotions.length ? (
        <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <PromotionBanner promotion={inlinePromotions[0] ?? null} placement="inline-content" compact />
        </section>
      ) : null}

      <Footer />
    </main>
  );
}
