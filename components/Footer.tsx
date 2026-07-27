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
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 text-center sm:px-8 md:grid-cols-[1.5fr_1fr_1.1fr] md:gap-10 md:text-left">
        {/* Brand */}
        <div className="min-w-0">
          <Image src="/logo-footer.png" alt="White Glove Itineraries" width={977} height={754} className="mx-auto h-28 w-auto max-w-full object-contain md:mx-0" />
          <p className="mx-auto mt-5 max-w-md leading-7 text-slate-300 md:mx-0">Thoughtfully planned kosher travel and Jewish heritage journeys, with every detail handled with care.</p>
        </div>

        {/* Explore */}
        <nav className="min-w-0" aria-label="Footer">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">Explore</p>
          <ul className="mt-4 space-y-2.5">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm leading-6 text-slate-300 transition hover:text-[var(--gold-light)]">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">Begin a conversation</p>
          <p className="mx-auto mt-4 max-w-sm leading-7 text-slate-300 md:mx-0">Tell us about your trip — kevarim, dates, and kosher needs — and we&apos;ll be in touch.</p>
          <Link href="/contact" className="mt-5 inline-block border border-[var(--gold-light)] bg-[var(--gold)] px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)]">Contact us</Link>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-5 py-6 text-center sm:px-8 md:flex-row md:justify-between md:text-left">
          <p className="text-sm text-slate-400">White Glove Itineraries — personalized travel, planned with purpose.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {utilityLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:text-[var(--gold-light)]">{link.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
