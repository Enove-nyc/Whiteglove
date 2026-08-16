"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SitePromotions from "@/components/SitePromotions";
import { Icon } from "@/components/icons/Icon";
import { IconLink } from "@/components/icons/IconAction";
import { bookCategoryFor, categoryIsCurrent, isCurrent, NAV_CATEGORIES, SIGN_IN, type NavCategory } from "@/lib/navigation";
import { useBookingLink } from "@/components/BookingLinkProvider";

/**
 * The header: logo, five dropdown categories, four utility icons.
 *
 * What each dropdown holds is in lib/navigation.ts, not here. Dropdowns open
 * on hover, click, focus and tap — all four, not the one the last redesign
 * had (a single click-toggled panel). Only one is open at a time.
 */

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  // Closing every dropdown on navigation is a reset triggered by a changed
  // prop (the route), not a side effect — done during render, per React's own
  // guidance, rather than in a useEffect that would cause an extra render.
  const [trackedPathname, setTrackedPathname] = useState(pathname);
  if (trackedPathname !== pathname) {
    setTrackedPathname(pathname);
    setOpenKey(null);
    setMobileOpen(false);
    setMobileSection(null);
  }
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Search & Book's three links resolve through booking-access — locked, they
  // go to the public assistance page instead of a password box. See
  // lib/booking-access.ts and lib/navigation.ts's bookCategoryFor.
  const booking = useBookingLink();
  const categories: NavCategory[] = [...NAV_CATEGORIES, bookCategoryFor(booking)];

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

  // The header becomes slightly smaller once the page has moved under it —
  // a small cue that it's the same bar, not a different one.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenKey(null);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  useEffect(() => {
    if (!openKey) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const key = openKey;
      setOpenKey(null);
      if (key) triggerRefs.current[key]?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openKey]);

  function openOnHover(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(key);
  }
  function closeOnHoverOut() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 150);
  }

  async function signOut() {
    await fetch("/api/account/logout", { method: "POST" }).catch(() => undefined);
    setSignedIn(false);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Main"
        className={`relative sticky top-0 z-[var(--wg-z-header)] border-b border-[var(--gold-light)] bg-[rgba(252,250,246,0.97)] shadow-[0_1px_12px_rgba(23,45,82,.05)] backdrop-blur-md transition-[min-height] ${
          scrolled ? "min-h-16" : "min-h-20"
        }`}
      >
        <div className={`mx-auto flex max-w-7xl items-center gap-2 px-5 transition-[min-height] sm:px-8 ${scrolled ? "min-h-16" : "min-h-20"}`}>
          <Link href="/" className="relative z-10 mr-2 flex shrink-0 items-center gap-2.5 sm:mr-4" aria-label="White Glove Kosher Travel home">
            <Image
              src="/logo-hand-navy.png"
              alt=""
              width={355}
              height={460}
              className={`w-auto max-w-none object-contain transition-[height] ${scrolled ? "h-8" : "h-9 sm:h-11"}`}
              priority
            />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-[family-name:var(--font-display)] text-lg text-[var(--navy)]">White Glove</span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Kosher Travel</span>
            </span>
          </Link>

          {/* The five dropdowns. Hidden below xl, where the hamburger carries
              the same categories as an accordion. */}
          <div className="hidden min-w-0 flex-1 items-center gap-0.5 xl:flex">
            {categories.map((category) => {
              const key = category.label;
              const current = categoryIsCurrent(category, pathname);
              const open = openKey === key;
              return (
                <div key={key} className="relative" onMouseEnter={() => openOnHover(key)} onMouseLeave={closeOnHoverOut}>
                  <button
                    ref={(el) => {
                      triggerRefs.current[key] = el;
                    }}
                    type="button"
                    aria-expanded={open}
                    aria-haspopup="true"
                    aria-controls={`nav-${key}`}
                    onClick={() => setOpenKey(open ? null : key)}
                    onFocus={() => openOnHover(key)}
                    className={`relative inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition ${
                      current || open
                        ? "bg-[var(--cream-deep)] text-[var(--navy)] after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-[var(--gold)] after:content-['']"
                        : "text-stone-600 hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
                    }`}
                  >
                    {category.label}
                    <Icon name="chevron-down" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div
                      id={`nav-${key}`}
                      role="menu"
                      onMouseEnter={() => openOnHover(key)}
                      onMouseLeave={closeOnHoverOut}
                      className="absolute left-0 top-full z-[1] mt-1 min-w-48 rounded-xl border border-[var(--gold-light)] bg-[#fffdf9] py-2 shadow-[0_18px_40px_rgba(23,45,82,.15)]"
                    >
                      {category.links.map((link) => {
                        const linkCurrent = isCurrent(link.href, pathname);
                        return (
                          <Link
                            key={link.href + link.label}
                            role="menuitem"
                            href={link.href}
                            aria-current={linkCurrent ? "page" : undefined}
                            aria-label={link.description}
                            title={link.description}
                            onClick={() => setOpenKey(null)}
                            className={`flex min-h-11 items-center px-4 py-2 text-sm transition ${
                              linkCurrent ? "font-semibold text-[var(--navy)]" : "text-stone-600 hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
                            }`}
                          >
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <div className="hidden items-center gap-1 sm:flex">
              <IconLink icon="search" label="Search" href="/search" />
              <IconLink icon="route" label="Route" href="/my-route" />
              <IconLink icon="suitcase" label="Itinerary" href="/itinerary" />
              <IconLink icon="account" label={signedIn ? "Account" : "Sign in"} href={signedIn ? "/account" : SIGN_IN.href} />
            </div>

            {/* xl and up: the bar above is the navigation. Below xl: this is
                the navigation, and it opens the same five categories plus
                account, as an accordion, by tap. */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--gold-light)] text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)] xl:hidden"
            >
              <Icon name={mobileOpen ? "close" : "menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div id="mobile-menu" className="absolute left-0 right-0 top-full z-[1] max-h-[calc(100vh-4rem)] w-full overflow-y-auto border-b border-[var(--gold-light)] bg-[#fffdf9] shadow-[0_18px_40px_rgba(23,45,82,.15)] xl:hidden">
            <ul className="divide-y divide-[var(--gold-light)]/60 px-5 sm:px-8">
              {categories.map((category) => {
                const key = category.label;
                const expanded = mobileSection === key;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`mobile-${key}`}
                      onClick={() => setMobileSection(expanded ? null : key)}
                      className="flex min-h-12 w-full items-center justify-between py-3 text-left text-base font-semibold text-[var(--navy)]"
                    >
                      {category.label}
                      <Icon name="chevron-down" className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                    {expanded && (
                      <ul id={`mobile-${key}`} className="pb-2">
                        {category.links.map((link) => (
                          <li key={link.href + link.label}>
                            <Link href={link.href} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-stone-600 hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]">
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-[var(--gold-light)] px-5 py-4 sm:px-8">
              {signedIn ? (
                <>
                  <Link onClick={() => setMobileOpen(false)} href="/account" className="rounded-md border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--cream-deep)]">
                    Account
                  </Link>
                  <button type="button" onClick={() => { setMobileOpen(false); signOut(); }} className="text-sm font-semibold text-stone-600 hover:text-[var(--navy)]">
                    Sign out
                  </button>
                </>
              ) : (
                <Link onClick={() => setMobileOpen(false)} href={SIGN_IN.href} className="rounded-md border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--cream-deep)]">
                  {SIGN_IN.label}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
      <SitePromotions />
    </>
  );
}
