import Link from "next/link";
import type { DestinationRecord, PracticalSection } from "@/data/destination-database";

const sections: Array<{ yiddish: string; english: string; key: keyof Pick<DestinationRecord, "accommodations" | "kosherFood" | "minyanim" | "mikvaos" | "transport"> }> = [
  { yiddish: "אכסניא", english: "Accommodations", key: "accommodations" },
  { yiddish: "כשר'ע עסן", english: "Kosher food", key: "kosherFood" },
  { yiddish: "מנינים", english: "Minyanim", key: "minyanim" },
  { yiddish: "מקוה", english: "Mikvaos", key: "mikvaos" },
  { yiddish: "טרענספארט", english: "Transport & drivers", key: "transport" },
];

function Detail({ section }: { section: PracticalSection }) {
  if (section.entries.length) {
    return <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-600">{section.entries.map((entry) => <li key={entry}>{entry}</li>)}</ul>;
  }

  return <p className="mt-4 text-sm leading-6 text-stone-600">{section.note}</p>;
}

function Status({ section }: { section: PracticalSection }) {
  if (section.status === "verified") return <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">Checked information</p>;
  if (section.status === "needs-verification") return <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-amber-800">Being checked</p>;
  return <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Not available yet</p>;
}

export default function PracticalInformation({ record }: { record: DestinationRecord }) {
  return (
    <div className="mt-12">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ yiddish, english, key }) => (
          <article key={key} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
            <h3 dir="rtl" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{yiddish}</h3>
            <p className="mt-1 text-sm text-stone-500">{english}</p>
            <Status section={record[key]} />
            <Detail section={record[key]} />
          </article>
        ))}
        <article className="border border-[var(--gold)] bg-[#fcfaf6] p-6">
          <h3 dir="rtl" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">פליגערס און האטעלן</h3>
          <p className="mt-1 text-sm text-stone-500">Flights & hotels</p>
          <p className="mt-4 text-sm leading-6 text-stone-600">Search travel options for your journey in one place.</p>
          <Link href="/booking" className="mt-5 inline-block border border-[var(--gold)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Search travel →</Link>
        </article>
      </div>
    </div>
  );
}
