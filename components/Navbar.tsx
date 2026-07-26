"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DestinationSearch from "@/components/DestinationSearch";

const menuItems = [
  { yiddish: "היים", english: "Home", href: "/" },
  { yiddish: "נסיעות", english: "Destinations", href: "/stops" },
  { yiddish: "בתי החיים", english: "Cemeteries", href: "/cemeteries" },
  { yiddish: "סערוויסעס", english: "Services", href: "/services" },
  { yiddish: "פּלאַנירונג", english: "Planning", href: "/planning" },
  { yiddish: "האָנימאָן", english: "Honeymoon", href: "/honeymoon" },
  { yiddish: "פליגערס און האטעלן", english: "Flights & hotels", href: "/booking" },
  { yiddish: "מייַן וועג", english: "My Route", href: "/my-route" },
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
    fetch("/api/account/me")
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
    <nav ref={navRef} className="relative border-b border-[var(--gold-light)] bg-[rgba(247,243,235,0.94)]">
      <div className={`mx-auto h-20 max-w-7xl items-center gap-4 px-5 sm:px-8 ${showSearch ? "grid grid-cols-[auto_minmax(0,1fr)_auto]" : "flex justify-between"}`}>
        <Link href="/" className="flex items-center" aria-label="White Glove Itineraries home">
          <Image src="/logo.png" alt="White Glove Itineraries" width={500} height={300} className="h-14 w-auto object-contain" priority />
        </Link>
        {showSearch && <div className="mx-auto hidden w-full max-w-sm min-w-0 sm:block"><DestinationSearch compact /></div>}
        <div className="flex shrink-0 items-center gap-2">
          {signedIn ? (
            <>
              <Link className="border border-[var(--gold)] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href="/account">
                My account
              </Link>
              <button type="button" onClick={signOut} className="hidden border border-[var(--gold-light)] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white sm:inline-block">
                Sign out
              </button>
            </>
          ) : (
            <Link className="border border-[var(--gold)] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href="/login">
              Sign in
            </Link>
          )}
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
              <span dir="rtl">{item.yiddish}</span>
              <span className="ml-2 text-xs font-normal text-stone-500">{item.english}</span>
            </Link>
          ))}
          <a onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="#contact">
            <span dir="rtl">קאָנטאַקט</span>
            <span className="ml-2 text-xs font-normal text-stone-500">Contact White Glove</span>
          </a>
          <div className="mt-1 border-t border-[var(--gold-light)] pt-1">
            {signedIn ? (
              <>
                <Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/account">My account</Link>
                <button type="button" onClick={() => { setMenuOpen(false); signOut(); }} className="block w-full px-4 py-3 text-left text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">Sign out</button>
              </>
            ) : (
              <Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/login">Sign in</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
