import { readWords } from "@/lib/site-words-store";
import { readBookingLink } from "@/lib/booking-access-store";
import type { BookingLink } from "@/lib/booking-access";
import Image from "next/image";
import Link from "next/link";

/**
 * The bottom of every page.
 *
 * IT USED TO ASK FOR "your kevarim, dates, and kosher needs" — under the
 * heading "Tell us where you want to go", on every page of the site, including
 * the one about beach holidays. That sentence is the clearest example of the
 * whole problem the redesign was for: it was written for one kind of traveler
 * and shown to all of them, and to anybody else it read as a polite way of
 * saying this place is not for you.
 *
 * The links are grouped by what somebody is trying to do rather than by which
 * folder the page lives in, and heritage travel is one group of several rather
 * than the first three entries.
 */

/**
 * `lang` on the Hebrew half of a label, where there is one.
 *
 * dir= would get the order right and say nothing about the language, and a
 * screen reader reading שתוליכנו לשלום with English phonetics is not a near
 * miss — it is noise. Only the Hebrew is marked; the English beside it is not.
 */
/**
 * The columns, given where the booking link is allowed to go today.
 *
 * A function rather than a constant because of that one link. It used to say
 * "Flights, hotels & cars" and point at `/book` on every page of the site,
 * including while the owner had that path locked — so the footer of a public
 * page sent people to an access-code box. See lib/booking-access.ts.
 */
const columnsFor = (
  booking: BookingLink,
): Array<{ title: string; links: Array<{ label: string; hebrew?: string; href: string }> }> => [
  {
    title: "Plan a trip",
    links: [
      { label: "Start planning", href: "/plan" },
      { label: "Vacation ideas", href: "/vacation-ideas" },
      { label: "Itinerary planner", href: "/itinerary" },
      { label: "Travel services", href: "/services" },
      { label: "A sample itinerary", href: "/sample-itinerary" },
      { label: booking.label, href: booking.href },
    ],
  },
  {
    title: "Kosher travel",
    links: [
      { label: "Kosher travel guide", href: "/kosher-travel" },
      { label: "Kosher food finder", href: "/kosher" },
      { label: "Where to stay", href: "/kosher-stays" },
      { label: "Things to do", href: "/attractions" },
      { label: "Provider directory", href: "/directory" },
    ],
  },
  {
    title: "Heritage travel",
    links: [
      { hebrew: "שתוליכנו לשלום", label: "heritage travel", href: "/heritage" },
      { label: "Towns and guides", href: "/stops" },
      { label: "Batei hachaim", href: "/cemeteries" },
      { label: "Kevarim by name", href: "/tzaddikim" },
      { label: "Map", href: "/map" },
    ],
  },
];

const utilityLinks = [
  { label: "Contact", href: "/contact" },
  { label: "How we verify", href: "/verification" },
  { label: "Submit an entry", href: "/submit" },
  { label: "Sign in", href: "/login" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Owner login", href: "/admin" },
];

export default async function Footer() {
  // Cached and tagged, so putting these two sentences in the owner's hands did
  // not turn three hundred prerendered pages dynamic. See lib/site-words-store.ts.
  const [words, booking] = await Promise.all([readWords(), readBookingLink()]);
  const columns = columnsFor(booking);
  return (
    <footer id="contact" className="border-t border-[var(--gold-light)] bg-[var(--navy-deep)] text-[#f7f3eb]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-14">
          <div className="min-w-0 border-b border-white/10 pb-9 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
            <Image src="/logo-footer.png" alt="White Glove Itineraries" width={977} height={754} className="h-24 w-auto max-w-full object-contain" />
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">{words.footerBlurb}</p>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-light)]">
              {words.footerStrapline}
            </p>

            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-white">
                Tell us where you want to go—or let us help you choose.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Vacations, family trips, honeymoons and heritage journeys. Nothing is charged for asking, and you do not
                need to have decided anything first.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/plan" className="inline-flex min-h-11 items-center rounded-md bg-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)]">
                  Start planning
                </Link>
                <Link href="/contact" className="inline-flex min-h-11 items-center rounded-md border border-white/30 px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold-light)] hover:text-[var(--gold-light)]">
                  Talk to us
                </Link>
              </div>
            </div>
          </div>

          <nav className="grid min-w-0 gap-8 sm:grid-cols-3" aria-label="Footer navigation">
            {columns.map((column) => (
              <div key={column.title} className="min-w-0">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-light)]">{column.title}</h2>
                <ul className="mt-4 grid gap-y-1">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="group flex min-h-11 items-center justify-between gap-2 rounded-md py-2 text-sm text-slate-300 transition hover:text-white">
                        <span>
                          {link.hebrew && (
                            <>
                              <span lang="he" dir="rtl">
                                {link.hebrew}
                              </span>{" "}
                              —{" "}
                            </>
                          )}
                          {link.label}
                        </span>
                        <span aria-hidden="true" className="text-[var(--gold-light)] opacity-0 transition group-hover:opacity-100">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-slate-400">© White Glove Itineraries</p>
          <nav aria-label="Utility links">
            <ul className="flex flex-wrap gap-x-5 gap-y-3">
              {utilityLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="inline-flex min-h-11 items-center text-xs font-semibold text-slate-400 transition hover:text-[var(--gold-light)]">{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
