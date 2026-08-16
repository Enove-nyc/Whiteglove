import Image from "next/image";
import Link from "next/link";

/**
 * The bottom of every page — kept extremely small at the owner's word.
 *
 * Contact, Advertise, Terms, Privacy, Admin. Nothing else. Every page that
 * used to be reachable only through the four-column footer this replaces now
 * has a real home in the header's five dropdowns (lib/navigation.ts) or a
 * direct link from the page it's most relevant to — see the destinations hub
 * for heritage, /kosher-travel for hechsherim and the provider directory,
 * /contact for About, /itinerary for the sample itinerary, and
 * /command-center for rating a finished trip. None of it depended on being
 * in the footer specifically; the footer was just where it had always lived.
 *
 * ADMIN IS BACK IN THE FOOTER, and that reverses a deliberate earlier
 * decision (tests/contact-reasons.test.ts once asserted the opposite) — the
 * owner named it explicitly as one of exactly five links when this pass was
 * specified, so it is taken as a considered reversal rather than an
 * oversight. It is still one small link among five, not a call to action,
 * and /admin is still gated the same way it always was.
 */
const FOOTER_LINKS = [
  { label: "Contact", href: "/contact" },
  { label: "Advertise", href: "/contact?reason=advertise" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Admin", href: "/admin" },
];

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-[var(--gold-light)] bg-[var(--navy-deep)] text-[#f7f3eb]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        {/* THE MARK, AND THE NAME AS TEXT — the same lockup as the header.
            The wordmark artwork (public/logo-footer.png) has "Itineraries"
            drawn into it, so it was the one place left on the site still
            showing the old name. The hand is ink on transparent, so the
            filter carries it to the footer's cream on navy. */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo-hand-navy.png"
            alt=""
            width={355}
            height={460}
            className="h-12 w-auto object-contain brightness-0 invert"
          />
          <span className="flex flex-col leading-none">
            <span className="font-[family-name:var(--font-display)] text-xl text-[#f7f3eb]">White Glove</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Kosher Travel</span>
          </span>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-300 transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
          <p className="text-xs text-slate-400">© White Glove Kosher Travel</p>
        </div>
      </div>
    </footer>
  );
}
