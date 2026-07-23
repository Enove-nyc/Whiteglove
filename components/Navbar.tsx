"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import DestinationSearch from "@/components/DestinationSearch";

export default function Navbar() {
  const pathname = usePathname();
  const showSearch = pathname !== "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(() => typeof window === "undefined" ? null : sessionStorage.getItem("whiteGloveAccountEmail"));

  useEffect(() => {
    const updateAccount = () => setAccountEmail(sessionStorage.getItem("whiteGloveAccountEmail"));
    window.addEventListener("whiteglove-account", updateAccount);
    return () => window.removeEventListener("whiteglove-account", updateAccount);
  }, []);

  return (
    <nav className="relative border-b border-[var(--gold-light)] bg-[rgba(247,243,235,0.94)]">
      <div className={`mx-auto h-20 max-w-7xl items-center gap-4 px-5 sm:px-8 ${showSearch ? "grid grid-cols-[auto_minmax(0,1fr)_auto]" : "flex justify-between"}`}>
        <Link href="/" className="flex items-center" aria-label="White Glove Itineraries home">
          <Image
            src="/Logo.png.jpeg"
            alt="White Glove Itineraries"
            width={500}
            height={300}
            className="h-14 w-auto object-contain"
            priority
          />
        </Link>

        {showSearch && <div className="mx-auto hidden w-full max-w-sm min-w-0 sm:block"><DestinationSearch compact /></div>}

        <div className="flex shrink-0 items-center gap-2"><Link className="border border-[var(--gold)] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href={accountEmail ? "/account" : "/login"}>{accountEmail ? "My account" : "Sign in"}</Link><button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Open navigation menu" className="flex h-9 w-9 flex-col items-center justify-center gap-1 border border-[var(--gold-light)] transition hover:bg-[var(--cream-deep)]"><span className="h-px w-4 bg-[var(--navy)]" /><span className="h-px w-4 bg-[var(--navy)]" /><span className="h-px w-4 bg-[var(--navy)]" /></button></div>
      </div>
      {showSearch && <div className="mx-auto max-w-7xl px-5 pb-4 sm:hidden"><DestinationSearch compact /></div>}
      {menuOpen && <div className="absolute right-5 top-[4.6rem] z-30 w-60 border border-[var(--gold-light)] bg-[#fcfaf6] p-3 shadow-xl sm:right-8"><Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/">Home</Link><Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/lizensk">Lizhensk · ליזענסק</Link><Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/stops">Destinations</Link><Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/my-route">My Route</Link><Link onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="/account">My account</Link><a onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]" href="#contact">Contact White Glove</a></div>}
    </nav>
  );
}
