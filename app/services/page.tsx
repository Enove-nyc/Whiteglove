import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { resolvePage } from "@/lib/pages";

const services = [
  { href: "/planning", title: "Planning", yiddish: "פּלאַנירונג", text: "Personalized trip planning and route guidance." },
  { href: "/honeymoon", title: "Honeymoon", yiddish: "האָנימאָן", text: "A premium honeymoon planning landing page." },
  { href: "/phone-rentals", title: "Phone Rentals", yiddish: "פאָון־רענטאַלס", text: "SIM, eSIM, and hotspot support for travel." },
  { href: "/travel-insurance", title: "Travel Insurance", yiddish: "רײַזע־אינשוראַנס", text: "Explain coverage and referral options clearly." },
  { href: "/flight-booking-assistance", title: "Flight Booking Assistance", yiddish: "פֿליגער־באָוקינג הילף", text: "Collect details for a human-assisted flight booking request." },
];

export default async function ServicesPage() {
  const page = (await resolvePage("services"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">{page.eyebrow}</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">{page.title}</h1>
          <PageBody body={page.body} className="mt-7 max-w-3xl text-lg leading-8 text-stone-600" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link key={service.href} href={service.href} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 transition hover:border-[var(--gold)] hover:shadow-md">
              <p dir="rtl" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{service.yiddish}</p>
              <p className="mt-1 text-sm text-stone-500">{service.title}</p>
              <p className="mt-4 text-sm leading-7 text-stone-600">{service.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
