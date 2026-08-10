"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DestinationSearch from "@/components/DestinationSearch";
import MembersOnlyLink from "@/components/MembersOnlyLink";
import SitePromotions from "@/components/SitePromotions";
import { GATED_FEATURES } from "@/lib/members-only";
import { isCurrent, menuGroupsFor, primaryCtaFor, PRIMARY_HREFS, PRIMARY_NAV, SIGN_IN } from "@/lib/navigation";
import { useBookingLink } from "@/components/BookingLinkProvider";

/**
 * The header.
 *
 * WHAT IT SAYS IS IN lib/navigation.ts, not here, and the rules about what may
 * and may not be in it are tests. The bar is the site's positioning — it used
 * to read Destinations · Cemeteries · Getaways · Directory · Services · Book,
 * which is an accurate description of a kevarim database with a travel page
 * attached, and the wrong first sentence for a business that plans kosher
 * holidays. That list is now one screen of reviewable text with its reasoning
 * beside it.
 *
 * WHAT DID NOT CHANGE, and must not: the site search, the sign-in state, the
 * promotions strip, and the members-only
 * links — the planner and My Route are offered to everybody, signed in or not,
 * because a feature nobody can see is a feature nobody asks for. See
 * lib/members-only.ts.
 *
 * The Yiddish labels that used to sit in this file were a record of which
 * words are right rather than anything that rendered; they have moved to
 * lib/navigation.ts's history along with the menu, and the bar shows English
 * as it always did.
 */

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  // Search & Book (and the matching menu entry) go to the search, or to the
  // assistance page when the owner has the search locked. Resolved in the
  // root layout; never a bare `/book` typed in here. See lib/booking-access.ts.
  const booking = useBookingLink();
  const menuGroups = menuGroupsFor(booking);
  // The one filled button on the site. Resolved, so it cannot become a
  // password box because of a setting in the admin — see rule 3 in
  // lib/navigation.ts.
  const primaryCta = primaryCtaFor(booking);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/account/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active) setSignedIn(Boolean(data?.signedIn));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname]);

  async function signOut() {
    await fetch("/api/account/logout", { method: "POST" }).catch(() => undefined);
    setSignedIn(false);
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    const closeOutsideMenu = (event: MouseEvent) => {
      if (menuOpen && navRef.current && !navRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOutsideMenu);
    return () => document.removeEventListener("mousedown", closeOutsideMenu);
  }, [menuOpen]);

  // At desktop the bar is the navigation and this button holds the rest of the
  // site; at compact widths the button IS the navigation. They need different
  // names, and a name cannot be swapped by a media query — rendering both and
  // hiding one would leave a screen reader announcing "MenuMore". So the
  // width is measured. It starts false, which is the compact answer and the
  // one the server renders, so the first paint is right on a phone.
  const [wideNav, setWideNav] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const sync = () => setWideNav(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Escape closes the menu and puts the focus back on the button that opened
  // it. Without the second half, dismissing the menu from the keyboard drops
  // the focus at the top of the document and the next Tab starts the page
  // over — which is how a keyboard user gets stranded.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Main"
        className="relative sticky top-0 z-[var(--wg-z-header)] border-b border-[var(--gold-light)] bg-[rgba(252,250,246,0.97)] shadow-[0_1px_12px_rgba(23,45,82,.05)] backdrop-blur-md"
      >
        <div className="mx-auto flex min-h-24 max-w-7xl items-center gap-3 px-5 sm:gap-4 sm:px-8">
          {/* z-10 + max-w-none: global img{max-width:100%} and centered overflow
              used to let Destinations paint across the mark after fonts/images
              finished loading — the brief jump-clear-then-overlap. */}
          <Link href="/" className="relative z-10 mr-4 flex shrink-0 items-center sm:mr-5 xl:mr-6" aria-label="White Glove Itineraries home">
            <Image
              src="/logo.png"
              alt="White Glove Itineraries"
              width={500}
              height={300}
              className="h-14 w-auto max-w-none object-contain sm:h-[4.5rem]"
              priority
            />
          </Link>

          {/* Start after the logo. justify-center spilled left over the mark
              whenever the labels were wider than the remaining slot. No
              overflow-hidden here: that was clipping Heritage Travel to
              "Heritage Trav" once Search sat on this row. Search stays on the
              row below so the full labels can breathe. */}
          <div className="hidden min-w-0 flex-1 items-center justify-start gap-0.5 xl:flex">
            {PRIMARY_NAV.map((item) => {
              const current = isCurrent(item.href, pathname);
              const barLabel = item.shortLabel ?? item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  aria-label={item.shortLabel ? item.label : undefined}
                  // The current section is marked three ways, not one: a filled
                  // pill, a gold underline, and aria-current. Colour alone
                  // leaves anyone who cannot separate cream from cream-deep
                  // with no idea where they are.
                  className={`relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-2 py-2 text-sm font-semibold transition 2xl:px-3 ${
                    current
                      ? "bg-[var(--cream-deep)] text-[var(--navy)] after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:rounded-full after:bg-[var(--gold)] after:content-[''] 2xl:after:inset-x-3"
                      : "text-stone-600 hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
                  }`}
                >
                  <span className="2xl:hidden">{barLabel}</span>
                  <span className="hidden 2xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              {signedIn ? (
                <>
                  <Link className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-3 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href="/account">
                    My account
                  </Link>
                  <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-xs font-semibold tracking-[0.06em] text-stone-600 transition hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]">
                    Sign out
                  </button>
                </>
              ) : (
                <Link className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-xs font-semibold tracking-[0.06em] text-stone-600 transition hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]" href={SIGN_IN.href}>
                  {SIGN_IN.label}
                </Link>
              )}
            </div>

            {/* The one filled control in the header — Search & Book. */}
            <Link
              href={primaryCta.href}
              className="hidden min-h-11 items-center rounded-md bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--gold)] sm:inline-flex"
            >
              {primaryCta.label}
            </Link>

            {/* At compact widths this IS the navigation, so it says "Menu".
                At desktop the bar above is the navigation and this only holds
                what the bar has no room for, so it says "More" — two controls
                both claiming to be the navigation is what made the header feel
                doubled. The panel itself drops the links the bar already shows
                (see xl:hidden on the list items below), so nothing is offered
                twice at the same width. */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={
                menuOpen
                  ? wideNav ? "Close the rest of the site" : "Close navigation menu"
                  : wideNav ? "More of the site" : "Open navigation menu"
              }
              className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--gold-light)] px-3 text-sm font-semibold text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)]"
            >
              <span>{menuOpen ? "Close" : wideNav ? "More" : "Menu"}</span>
              <span aria-hidden="true" className="flex w-4 flex-col gap-1">
                <span className="h-px w-full bg-[var(--navy)]" />
                <span className="h-px w-full bg-[var(--navy)]" />
                <span className="h-px w-full bg-[var(--navy)]" />
              </span>
            </button>
          </div>
        </div>

        {/* Always its own row at desktop: putting this beside the bar at 2xl
            squeezed Heritage Travel off the end and left the suggestions panel
            only as wide as a 15rem field. */}
        <div className="mx-auto max-w-7xl border-t border-[var(--gold-light)] px-5 py-3 sm:px-8">
          <DestinationSearch compact />
        </div>

        {menuOpen && (
          <div id="site-menu" className="absolute left-0 right-0 top-full z-[1] w-full min-w-full border-b border-[var(--gold-light)] bg-[#fffdf9] shadow-[0_18px_40px_rgba(23,45,82,.15)]">
            <div className="mx-auto grid w-full max-h-[calc(100vh-5rem)] max-w-7xl grid-cols-1 gap-8 overflow-y-auto px-5 py-7 sm:px-8 md:grid-cols-2 md:py-9 lg:grid-cols-3">
              {menuGroups.map((group) => (
                <section key={group.title}>
                  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">{group.title}</h2>
                  <ul className="mt-3 space-y-1">
                    {group.links.map((item) => {
                      const current = isCurrent(item.href, pathname);
                      return (
                        // Hidden at desktop when the bar above already shows
                        // it, so this panel is "the rest of the site" there
                        // rather than a second copy of the navigation.
                        <li key={item.href} className={PRIMARY_HREFS.has(item.href) ? "xl:hidden" : undefined}>
                          <Link
                            onClick={() => setMenuOpen(false)}
                            href={item.href}
                            aria-current={current ? "page" : undefined}
                            className={`flex min-h-11 items-start justify-between gap-3 rounded-md px-3 py-2.5 transition ${
                              current ? "bg-[var(--navy)] text-white" : "text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                            }`}
                          >
                            <span>
                              <span className="block text-sm font-semibold">{item.label}</span>
                              {/* What is actually behind it. A menu of bare
                                  nouns is a menu somebody presses once and
                                  learns nothing from. */}
                              <span className={`mt-0.5 block text-xs leading-5 ${current ? "text-slate-200" : "text-stone-500"}`}>
                                {item.description}
                              </span>
                            </span>
                            <span aria-hidden="true" className={current ? "text-[var(--gold-light)]" : "text-[var(--gold-ink)]"}>→</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              <div className="border-t border-[var(--gold-light)] pt-5 md:col-span-3 md:flex md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  {/* THE PLANNER AND MY ROUTE ARE HERE FOR EVERYBODY. They used
                      to be inside the signed-in branch, so somebody who had not
                      signed in never learned they existed — and therefore had
                      no reason to make an account. Pressing one signed out
                      opens a note saying what it is; see lib/members-only.ts
                      for why that note does not say "you must log in". */}
                  {GATED_FEATURES.map((feature) => (
                    <MembersOnlyLink
                      key={feature.key}
                      feature={feature}
                      onNavigate={() => setMenuOpen(false)}
                      className="rounded-md border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                    />
                  ))}
                  {signedIn ? (
                    <>
                      <Link onClick={() => setMenuOpen(false)} className="rounded-md border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--cream-deep)]" href="/account">My account</Link>
                      <button type="button" onClick={() => { setMenuOpen(false); signOut(); }} className="rounded-md px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]">Sign out</button>
                    </>
                  ) : (
                    <Link onClick={() => setMenuOpen(false)} className="rounded-md border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--cream-deep)]" href={SIGN_IN.href}>{SIGN_IN.label}</Link>
                  )}
                </div>
                <Link
                  onClick={() => setMenuOpen(false)}
                  href={primaryCta.href}
                  className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--gold)] md:mt-0"
                >
                  {primaryCta.label}
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
      <SitePromotions />
    </>
  );
}
