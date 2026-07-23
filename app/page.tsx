import DestinationCard from "@/components/DestinationCard";
import DestinationSearch from "@/components/DestinationSearch";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";

const destinations = [
  { name: "Lizhensk", yiddishName: "ליזענסק", country: "Poland", description: "A complete guide for a meaningful visit to the Noam Elimelech.", href: "/lizensk", featured: true },
  { name: "Uman", yiddishName: "אומאן", country: "Ukraine", description: "A guide to Rebbe Nachman of Breslov, planned with clarity and care.", href: "/uman" },
  { name: "Medzhybizh", yiddishName: "מעזשיבוזש", country: "Ukraine", description: "A guide to the resting place of the Baal Shem Tov and the birthplace of Chassidus.", href: "/medzhybizh" },
  { name: "Belz", yiddishName: "בעלז", country: "Ukraine", description: "Discover the places and stories of historic Belzer Chassidus.", href: "/belz" },
  { name: "Lelov", yiddishName: "לעלוב", country: "Poland", description: "A guide to the kever of Reb Dovid Lelover and the town's living legacy.", href: "/lelov" },
  { name: "Ropshitz", yiddishName: "ראפשיץ", country: "Poland", description: "Visit the world of the Ropshitzer Rav and his enduring Torah legacy.", href: "/ropshitz" },
];

const services = [
  ["01", "At the kever", "Tefillos, practical preparation, visiting guidance, and the details that help you arrive ready."],
  ["02", "Kosher essentials", "Food, Shabbos arrangements, minyanim, mikvaos, and the information travelers look for first."],
  ["03", "People you can reach", "Drivers, local contacts, and important numbers collected in one dependable place."],
  ["04", "A smoother journey", "Clear travel planning from airport to hotel, so the logistics stay out of the way."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />

      <section className="relative border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[linear-gradient(135deg,transparent_0%,rgba(217,199,163,.38)_100%)] lg:block" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--gold)]">Kosher travel, considered</p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.35fr_.65fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-[var(--navy)] sm:text-6xl lg:text-7xl">Every journey begins with purpose.</h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">A trusted guide for meaningful journeys: tefillos, kosher food, minyanim, mikvaos, local contacts, and every practical detail around your visit.</p>
            </div>
            <div className="border-l border-[var(--gold)] pl-6 text-base leading-7 text-stone-600 lg:mb-2">
              From the first tefillah to the ride back to the airport, White Glove keeps the details clear and close at hand.
            </div>
          </div>
          <DestinationSearch />
        </div>
      </section>

      <section id="destinations" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="Destination directory" title="The information you need when it matters." description="Browse by city or tzaddik—every guide is built around the questions frum travelers actually ask before and during a visit." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => <DestinationCard key={destination.name} {...destination} />)}
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

      <Footer />
    </main>
  );
}
