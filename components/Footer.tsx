"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { brandForHost } from "@/lib/site-brand-core";

/**
 * The bottom of every page — kept extremely small at the owner's word.
 *
 * Contact, Advertise, Terms, Privacy. Nothing else. Every page that
 * used to be reachable only through the four-column footer this replaces now
 * has a real home in the header's five dropdowns (lib/navigation.ts) or a
 * direct link from the page it's most relevant to.
 *
 * BRAND-AWARE, like the header. On whitegloveitineraries.com it names itself
 * "Itineraries" and drops the two kosher-leaning links (Advertise, Sources) —
 * that domain is the trip-planning product, not the kosher travel guide. The
 * brand is settled from the hostname after mount, the same way Navbar does it,
 * so the kosher site's static pages stay static (default is kosher; a server
 * read of the host would turn every page dynamic).
 *
 * ADMIN IS NOT HERE. It has been in and out twice; it rests out. The owner
 * reaches the admin at its own subdomain, and a link to it on three hundred
 * customer pages is furniture for one person put in front of everybody else.
 */
const KOSHER_LINKS = [
  // About and Verification came off the front page, where they sat in an
  // "Explore" list whose other six links were an exact copy of the Featured
  // cards above them. They are not front-page decisions; they are the two
  // pages somebody looks for when deciding whether to trust what they read,
  // which is what a footer is for.
  { label: "About", href: "/about" },
  { label: "Verification", href: "/verification" },
  // Open to everybody since the starter list arrived; before that it was a
  // signed-in page and there was nothing to link a visitor to.
  { label: "What to pack", href: "/packing" },
  { label: "Contact", href: "/contact" },
  { label: "Advertise", href: "/contact?reason=advertise" },
  { label: "Sources", href: "/sources" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

// The itineraries site is the planner; Advertise and Sources belong to the
// kosher guide. Note that whitegloveitineraries.com is served by its own
// deployment, not this one, so this list is what an itineraries-branded page
// OF THIS APP would show — /packing is deliberately not in it, because that
// path does not exist on the site the brand names. Pricing leads because it was the thing a visitor could not
// reach at all: what the planner costs lived behind a sign-in, so anybody
// weighing the tool up had to open an account to find out.
const ITINERARIES_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

export default function Footer({ brand: brandProp }: { brand?: "kosher" | "itineraries" } = {}) {
  const [brand, setBrand] = useState<"kosher" | "itineraries">(brandProp ?? "kosher");
  useEffect(() => {
    if (brandProp) return;
    if (typeof window !== "undefined") setBrand(brandForHost(window.location.hostname));
  }, [brandProp]);
  const isItineraries = brand === "itineraries";
  const links = isItineraries ? ITINERARIES_LINKS : KOSHER_LINKS;

  return (
    <footer id="contact" className="border-t border-[var(--gold-light)] bg-[var(--navy-deep)] text-[#f7f3eb]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        {/* THE MARK, AND THE NAME AS TEXT — the same lockup as the header. */}
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
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--gold-light)]">{isItineraries ? "Itineraries" : "Kosher Travel"}</span>
          </span>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-300 transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
          <p className="text-xs text-slate-400">© White Glove {isItineraries ? "Itineraries" : "Kosher Travel"}</p>
        </div>
      </div>
    </footer>
  );
}
