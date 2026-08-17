import Image from "next/image";
import Link from "next/link";

/**
 * The bottom of every page — kept extremely small at the owner's word.
 *
 * Contact, Advertise, Terms, Privacy. Nothing else. Every page that
 * used to be reachable only through the four-column footer this replaces now
 * has a real home in the header's five dropdowns (lib/navigation.ts) or a
 * direct link from the page it's most relevant to — see the destinations hub
 * for heritage, /kosher-travel for hechsherim and the provider directory,
 * /contact for About, /itinerary for the sample itinerary, and
 * /command-center for rating a finished trip. None of it depended on being
 * in the footer specifically; the footer was just where it had always lived.
 *
 * ADMIN IS NOT HERE. It has been in and out twice; it rests out. The owner
 * reaches the admin at its own subdomain, and a link to it on three hundred
 * customer pages is furniture for one person put in front of everybody else.
 * Removing it weakens nothing: /admin was gated before and is gated now, and
 * robots.txt has always disallowed it. See tests/contact-reasons.test.ts.
 */
const FOOTER_LINKS = [
  { label: "Contact", href: "/contact" },
  { label: "Advertise", href: "/contact?reason=advertise" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
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
            {/* --gold-light, not --gold: on the navy sections that is the text
                accent, and --gold is a border colour that does not clear 4.5:1
                as words. See the note in globals.css. */}
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--gold-light)]">Kosher Travel</span>
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
