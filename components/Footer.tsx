import Image from "next/image";
import Link from "next/link";

const exploreLinks = [
  { label: "Destinations & kevarim", href: "/stops" },
  { label: "Cemeteries", href: "/cemeteries" },
  { label: "Directory", href: "/directory" },
  { label: "Book flights, hotels & cars", href: "/book" },
  { label: "Trip planning", href: "/planning" },
  { label: "Kosher getaways", href: "/getaways" },
];

const utilityLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Submit an entry", href: "/submit" },
  { label: "Sign in", href: "/login" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Owner login", href: "/admin" },
];

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-[var(--gold-light)] bg-[var(--navy-deep)] text-[#f7f3eb]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_.75fr_1fr] lg:gap-14">
          <div className="min-w-0 border-b border-white/10 pb-9 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
            <Image src="/logo-footer.png" alt="White Glove Itineraries" width={977} height={754} className="h-24 w-auto max-w-full object-contain" />
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
              Thoughtfully planned kosher travel and Jewish heritage journeys, with every detail handled with care.
            </p>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-light)]">
              Personalized travel, planned with purpose.
            </p>
          </div>

          <nav className="min-w-0" aria-label="Footer navigation">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-light)]">Explore</p>
            <ul className="mt-4 grid gap-x-5 gap-y-1 sm:grid-cols-2 lg:grid-cols-1">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="group flex items-center justify-between rounded-md py-2 text-sm text-slate-300 transition hover:text-white">
                    <span>{link.label}</span>
                    <span aria-hidden="true" className="text-[var(--gold-light)] opacity-0 transition group-hover:opacity-100">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-light)]">Begin a conversation</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-white">Tell us where you want to go.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Share your kevarim, dates, and kosher needs. We&apos;ll help organize the details around your trip.
            </p>
            <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)]">
              Contact us →
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-slate-400">© White Glove Itineraries</p>
          <nav aria-label="Utility links">
            <ul className="flex flex-wrap gap-x-5 gap-y-3">
              {utilityLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs font-semibold text-slate-400 transition hover:text-[var(--gold-light)]">{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
