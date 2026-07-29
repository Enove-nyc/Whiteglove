"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DestinationSearch from "@/components/DestinationSearch";
import SitePromotions from "@/components/SitePromotions";

const menuItems = [
  { yiddish: "היים", english: "Home", href: "/" },
  { yiddish: "נסיעות", english: "Destinations", href: "/stops" },
  { yiddish: "וואַקאַציעס", english: "Getaways", href: "/getaways" },
  { yiddish: "בתי החיים", english: "Cemeteries", href: "/cemeteries" },
  { yiddish: "מאַפּע", english: "Map", href: "/map" },
  { yiddish: "כשר עסן", english: "Kosher food", href: "/kosher" },
  { yiddish: "רײַזע פֿירער", english: "Travel guide", href: "/travel-guide" },
  { yiddish: "דירעקטאָרי", english: "Directory", href: "/directory" },
  { yiddish: "סערוויסעס", english: "Services", href: "/services" },
  { yiddish: "האָנימאָן", english: "Honeymoon", href: "/honeymoon" },
  { yiddish: "וואו צו גיין", english: "Things to do", href: "/attractions" },
  { yiddish: "וואו צו שלאפן", english: "Where to stay", href: "/kosher-stays" },
  { yiddish: "פליגערס און האטעלן", english: "Book flights, hotels & cars", href: "/book" },
  { yiddish: "פֿאַרבינדונג", english: "Contact", href: "/contact" },
];

const primaryLinks = [
  { label: "Destinations", href: "/stops" },
  { label: "Getaways", href: "/getaways" },
  { label: "Directory", href: "/directory" },
  { label: "Services", href: "/services" },
  { label: "Book", href: "/book" },
];

const menuGroups = [
  {
    title: "Explore",
    links: menuItems.filter((item) => ["/stops", "/cemeteries", "/attractions", "/map", "/kosher", "/travel-guide", "/directory"].includes(item.href)),
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

  return (
    <>
      <nav ref={navRef} className="sticky top-0 z-40 border-b border-[var(--gold-light)] bg-[rgba(252,250,246,0.97)] shadow-[0_1px_12px_rgba(23,45,82,.05)] backdrop-blur-md">
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
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    current ? "bg-[var(--cream-deep)] text-[var(--navy)]" : "text-stone-600 hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
                  }`}
                >
                  {link.label}
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
                  <Link className="rounded-md border border-[var(--gold)] px-3 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href="/account">
                    My account
                  </Link>
                  <button type="button" onClick={signOut} className="rounded-md px-3 py-2 text-xs font-semibold tracking-[0.06em] text-stone-600 transition hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]">
                    Sign out
                  </button>
                </>
              ) : (
                <Link className="rounded-md border border-[var(--gold)] px-4 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href="/login">
                  Sign in
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="flex min-h-10 items-center gap-2 rounded-md border border-[var(--gold-light)] px-3 text-sm font-semibold text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)]"
            >
              <span>{menuOpen ? "Close" : "Menu"}</span>
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
                        <li key={item.href}>
                          <Link
                            onClick={() => setMenuOpen(false)}
                            href={item.href}
                            aria-current={current ? "page" : undefined}
                            className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold transition ${
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
