"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DestinationSearch from "@/components/DestinationSearch";

export default function Navbar() {
  const pathname = usePathname();
  const showSearch = pathname !== "/";

  return (
    <nav className="border-b border-[var(--gold-light)] bg-[rgba(247,243,235,0.94)]">
      <div className={`mx-auto h-20 max-w-7xl items-center gap-6 px-5 sm:px-8 ${showSearch ? "grid grid-cols-[auto_1fr_auto]" : "flex justify-between"}`}>
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

        {showSearch && <div className="mx-auto hidden w-full max-w-md md:block"><DestinationSearch compact /></div>}

        <div className="hidden items-center gap-5 text-xs font-semibold tracking-[0.08em] text-[var(--navy)] lg:flex">
          <Link className="transition hover:text-[var(--gold)]" href="/">Home</Link>
          <Link className="transition hover:text-[var(--gold)]" href="/stops">Destinations</Link>
          <a className="transition hover:text-[var(--gold)]" href="#services">Services</a>
          <Link className="border border-[var(--gold)] px-3 py-2 text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white" href="/login">Sign in</Link>
        </div>
      </div>
      {showSearch && <div className="mx-auto max-w-7xl px-5 pb-4 md:hidden"><DestinationSearch compact /></div>}
    </nav>
  );
}
