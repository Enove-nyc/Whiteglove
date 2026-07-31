"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DestinationSearch from "@/components/DestinationSearch";
import SitePromotions from "@/components/SitePromotions";

/**
 * The menu. A Yiddish label only where there is a real Yiddish word for it.
 *
 * Half of these used to carry one and half of those were not Yiddish:
 * סערוויסעס, האָנימאָן, דירעקטאָרי, וואַקאַציעס — English words spelled in Hebrew
 * letters. To somebody who reads Yiddish that is not a translation, it is the
 * English word made harder to read.
 *
 * What stays is what people say: היים, נסיעות, בתי החיים, כשר עסן.
 *
 * A second pass removed four more the owner — who speaks the language —
 * marked as not natural: רײַזע פֿירער, וואו צו גיין, וואו צו שלאפן and
 * פֿאַרבינדונג. Being made of real Yiddish words is not the same as being what
 * anybody would say, and that distinction is not one this codebase can make
 * for itself. When in doubt the label is English.
 *
 * Nothing renders these today — the bar and the menu both show the English.
 * They are kept as the record of which words are right, so that when the
 * menu does show them, it shows those and not the ones just removed.
 */
const menuItems: Array<{ yiddish?: string; english: string; href: string }> = [
  { yiddish: "היים", english: "Home", href: "/" },
  { yiddish: "נסיעות", english: "Destinations", href: "/stops" },
  { english: "Getaways", href: "/getaways" },
  { yiddish: "בתי החיים", english: "Cemeteries", href: "/cemeteries" },
  // By the person rather than by the town — which is how people search.
  { english: "Kevarim", href: "/tzaddikim" },
  { english: "Map", href: "/map" },
  { yiddish: "כשר עסן", english: "Kosher food", href: "/kosher" },
  { english: "Travel guide", href: "/travel-guide" },
  { english: "Directory", href: "/directory" },
  { english: "Services", href: "/services" },
  { english: "Honeymoon", href: "/honeymoon" },
  { english: "Things to do", href: "/attractions" },
  { english: "Where to stay", href: "/kosher-stays" },
  { english: "Book flights, hotels & cars", href: "/book" },
  { english: "Contact", href: "/contact" },
];

/**
 * The bar at desktop width. Destinations and Cemeteries are deliberately
 * separate entries: one is towns you travel to, the other is where people are
 * buried, and collapsing them loses the distinction the site is built on.
 *
 * `wide` is a longer label for the widths that have room for it — "Book" says
 * very little about a page that searches flights, hotels and cars.
 */
const primaryLinks: Array<{ label: string; wide?: string; href: string }> = [
  { label: "Destinations", href: "/stops" },
  { label: "Cemeteries", href: "/cemeteries" },
  { label: "Getaways", href: "/getaways" },
  { label: "Directory", href: "/directory" },
  { label: "Services", href: "/services" },
  { label: "Book", wide: "Flights, hotels & cars", href: "/book" },
];

const PRIMARY_HREFS = new Set(primaryLinks.map((link) => link.href));

const menuGroups = [
  {
    title: "Explore",
    links: menuItems.filter((item) => ["/stops", "/cemeteries", "/tzaddikim", "/attractions", "/map", "/kosher", "/travel-guide", "/directory"].includes(item.href)),
  },
  {
    title: "Plan & book",
    links: menuItems.filter((item) => ["/services", "/book", "/kosher-stays", "/getaways", "/honeymoon"].includes(item.href)),
  },
  {
    title: "White Glove",
    links: menuItems.filter((item) => ["/", "/contact"].includes(item.href)),
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const showSearch = pathname !== "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const navRef = useRef<HTMLElement>(null);
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
      <nav ref={navRef} className="sticky top-0 z-[var(--wg-z-header)] border-b border-[var(--gold-light)] bg-[rgba(252,250,246,0.97)] shadow-[0_1px_12px_rgba(23,45,82,.05)] backdrop-blur-md">
        <div className="mx-auto flex min-h-24 max-w-7xl items-center gap-4 px-5 sm:px-8">
          <Link href="/" className="mr-5 flex shrink-0 items-center xl:mr-8" aria-label="White Glove Itineraries home">
            <Image src="/logo.png" alt="White Glove Itineraries" width={500} height={300} className="h-[4.5rem] w-auto object-contain" priority />
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex">
            {primaryLinks.map((link) => {
              const current = !link.href.includes("?") && (pathname === link.href || pathname.startsWith(`${link.href}/`));
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  // The current section is marked three ways, not one: a filled
                  // pill, a gold underline, and aria-current. Colour alone
                  // leaves anyone who cannot separate cream from cream-deep
                  // with no idea where they are.
                  className={`relative min-h-11 rounded-full px-3 py-2 text-sm font-semibold transition inline-flex items-center ${
                    current
                      ? "bg-[var(--cream-deep)] text-[var(--navy)] after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-[var(--gold)] after:content-['']"
                      : "text-stone-600 hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
                  }`}
                >
                  {link.wide ? (
                    <>
                      <span className="2xl:hidden">{link.label}</span>
                      <span className="hidden 2xl:inline">{link.wide}</span>
                    </>
                  ) : (
                    link.label
                  )}
                </Link>
              );
            })}
          </div>

          {showSearch && (
            <div className="ml-8 mr-3 hidden w-full max-w-xs min-w-0 md:block xl:ml-12 xl:mr-5 xl:max-w-sm">
              <DestinationSearch compact />
            </div>
          )}

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
                <Link className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-4 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href="/login">
                  Sign in
                </Link>
              )}
            </div>

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

        {showSearch && (
          <div className="mx-auto max-w-7xl border-t border-[var(--gold-light)] px-5 py-3 md:hidden sm:px-8">
            <DestinationSearch compact />
          </div>
        )}

        {menuOpen && (
          <div id="site-menu" className="absolute inset-x-0 top-full border-b border-[var(--gold-light)] bg-[#fffdf9] shadow-[0_18px_40px_rgba(23,45,82,.15)]">
            <div className="mx-auto grid max-h-[calc(100vh-5rem)] max-w-7xl gap-8 overflow-y-auto px-5 py-7 sm:px-8 md:grid-cols-3 md:py-9">
              {menuGroups.map((group) => (
                <section key={group.title}>
                  <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{group.title}</h2>
                  <ul className="mt-3 space-y-1">
                    {group.links.map((item) => {
                      const current = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                      return (
                        // Hidden at desktop when the bar above already shows
                        // it, so this panel is "the rest of the site" there
                        // rather than a second copy of the navigation.
                        <li key={item.href} className={PRIMARY_HREFS.has(item.href) ? "xl:hidden" : undefined}>
                          <Link
                            onClick={() => setMenuOpen(false)}
                            href={item.href}
                            aria-current={current ? "page" : undefined}
                            className={`flex min-h-11 items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                              current ? "bg-[var(--navy)] text-white" : "text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                            }`}
                          >
                            <span>{item.english}</span>
                            <span aria-hidden="true" className={current ? "text-[var(--gold-light)]" : "text-[var(--gold)]"}>→</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              <div className="border-t border-[var(--gold-light)] pt-5 md:col-span-3 md:flex md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  {signedIn ? (
                    <>
                      <Link onClick={() => setMenuOpen(false)} className="rounded-md border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--cream-deep)]" href="/account">My account</Link>
                      <Link onClick={() => setMenuOpen(false)} className="rounded-md border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--cream-deep)]" href="/itinerary">Itinerary planner</Link>
                      <Link onClick={() => setMenuOpen(false)} className="rounded-md border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--cream-deep)]" href="/my-route">My Route</Link>
                      <button type="button" onClick={() => { setMenuOpen(false); signOut(); }} className="rounded-md px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]">Sign out</button>
                    </>
                  ) : (
                    <Link onClick={() => setMenuOpen(false)} className="rounded-md bg-[var(--navy)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--navy-deep)]" href="/login">Sign in</Link>
                  )}
                </div>
                <Link onClick={() => setMenuOpen(false)} href="/contact" className="mt-5 inline-block text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4 md:mt-0">
                  Need help planning? Contact us →
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
