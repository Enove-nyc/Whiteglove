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
  { yiddish: "דירעקטאָרי", english: "Directory", href: "/directory" },
  { yiddish: "סערוויסעס", english: "Services", href: "/services" },
  { yiddish: "פּלאַנירונג", english: "Planning", href: "/planning" },
  { yiddish: "האָנימאָן", english: "Honeymoon", href: "/honeymoon" },
  { yiddish: "פליגערס און האטעלן", english: "Book flights, hotels & cars", href: "/book" },
  { yiddish: "פֿאַרבינדונג", english: "Contact", href: "/contact" },
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
    <nav ref={navRef} className="relative border-b border-[var(--gold-light)] bg-[rgba(247,243,235,0.94)]">
      <div className={`relative mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 ${showSearch ? "sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto]" : ""}`}>
        <Link href="/" className="flex items-center max-sm:absolute max-sm:left-1/2 max-sm:top-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2" aria-label="White Glove Itineraries home">
          <Image src="/logo.png" alt="White Glove Itineraries" width={500} height={300} className="h-14 w-auto object-contain" priority />
        </Link>
        {showSearch && <div className="mx-auto hidden w-full max-w-sm min-w-0 sm:block"><DestinationSearch compact /></div>}
        <div className="flex shrink-0 items-center gap-2 max-sm:ml-auto">
          <div className="hidden items-center gap-2 sm:flex">
            {signedIn ? (
              <>
                <Link className="border border-[var(--gold)] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href="/account">
                  My account
                </Link>
                <button type="button" onClick={signOut} className="border border-[var(--gold-light)] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">
                  Sign out
                </button>
              </>
            ) : (
              <Link className="border border-[var(--gold)] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href="/login">
                Sign in
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 flex-col items-center justify-center gap-1 border border-[var(--gold-light)] transition hover:bg-[var(--cream-deep)]"
          >
            <span className="h-px w-4 bg-[var(--navy)]" />
            <span className="h-px w-4 bg-[var(--navy)]" />
            <span className="h-px w-4 bg-[var(--navy)]" />
          </button>
        </div>
      </div>
      {showSearch && <div className="mx-auto max-w-7xl px-5 pb-4 sm:hidden"><DestinationSearch compact /></div>}
      {menuOpen && (
        <div className="absolute right-5 top-[4.6rem] z-30 w-64 border border-[var(--gold-light)] bg-[#fcfaf6] p-3 shadow-xl sm:right-8">
          {menuItems.map((item) => (
            <Link key={item.href} onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href={item.href}>
              {item.english}
            </Link>
          ))}
          <div className="mt-1 border-t border-[var(--gold-light)] pt-1">
            {signedIn ? (
              <>
                <Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/account">My account</Link>
                <Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/itinerary">Itinerary planner</Link>
                <Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/my-route">My Route</Link>
                <button type="button" onClick={() => { setMenuOpen(false); signOut(); }} className="block w-full px-4 py-3 text-left text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">Sign out</button>
              </>
            ) : (
              <Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/login">Sign in</Link>
            )}
          </div>
        </div>
      )}
    </nav>
    <SitePromotions />
    </>
  );
}
