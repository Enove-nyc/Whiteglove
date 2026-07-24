import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-[var(--gold-light)] bg-[var(--navy-deep)] text-[#f7f3eb]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <Image src="/Logo.png.jpeg" alt="White Glove Itineraries" width={500} height={300} className="h-20 w-auto rounded-sm bg-white object-contain" />
          <p className="mt-5 max-w-md leading-7 text-slate-300">Thoughtfully planned kosher travel and Jewish heritage journeys, with every detail handled with care.</p>
        </div>
        <div className="md:justify-self-end">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">Begin a conversation</p>
          <a className="mt-4 inline-block font-[family-name:var(--font-display)] text-3xl transition hover:text-[var(--gold-light)]" href="mailto:whitegloveitineraries@gmail.com">whitegloveitineraries@gmail.com</a>
          <p className="mt-6 text-sm text-slate-400">White Glove Itineraries - Personalized travel, planned with purpose.</p>
          <Link href="/login" className="mt-5 inline-block text-xs font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:text-[var(--gold-light)]">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
