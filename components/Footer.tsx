import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-[var(--gold-light)] bg-[var(--navy-deep)] text-[#f7f3eb]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 text-center sm:px-8 md:grid-cols-[1.4fr_1fr] md:text-left">
        <div className="min-w-0">
          <Image src="/logo-light.png" alt="White Glove Itineraries" width={500} height={300} className="mx-auto h-20 w-auto max-w-full object-contain md:mx-0" />
          <p className="mx-auto mt-5 max-w-md leading-7 text-slate-300 md:mx-0">Thoughtfully planned kosher travel and Jewish heritage journeys, with every detail handled with care.</p>
        </div>
        <div className="min-w-0 md:justify-self-end">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">Begin a conversation</p>
          <p className="mx-auto mt-4 max-w-sm leading-7 text-slate-300 md:mx-0 md:ml-auto">Tell us about your trip — kevarim, dates, and kosher needs — and we&apos;ll be in touch.</p>
          <Link href="/contact" className="mt-5 inline-block border border-[var(--gold-light)] bg-[var(--gold)] px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)]">Contact us</Link>
          <p className="mt-6 text-sm text-slate-400">White Glove Itineraries - Personalized travel, planned with purpose.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-start">
            <Link href="/contact" className="inline-block text-xs font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:text-[var(--gold-light)]">Contact</Link>
            <span className="text-slate-600">·</span>
            <Link href="/submit" className="inline-block text-xs font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:text-[var(--gold-light)]">Submit an entry</Link>
            <span className="text-slate-600">·</span>
            <Link href="/login" className="inline-block text-xs font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:text-[var(--gold-light)]">Sign in</Link>
            <span className="text-slate-600">·</span>
            <Link href="/privacy" className="inline-block text-xs font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:text-[var(--gold-light)]">Privacy</Link>
            <span className="text-slate-600">·</span>
            <Link href="/terms" className="inline-block text-xs font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:text-[var(--gold-light)]">Terms</Link>
            <span className="text-slate-600">·</span>
            <Link href="/admin" className="inline-block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 transition hover:text-[var(--gold-light)]">Owner login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
