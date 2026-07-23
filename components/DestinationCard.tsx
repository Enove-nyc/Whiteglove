import Link from "next/link";

type DestinationCardProps = {
  name: string;
  yiddishName?: string;
  country: string;
  description: string;
  href?: string;
  featured?: boolean;
};

export default function DestinationCard({
  name,
  yiddishName,
  country,
  description,
  href = "#contact",
  featured = false,
}: DestinationCardProps) {
  return (
    <Link
      href={href}
      className={`group block overflow-hidden border border-[var(--gold-light)] bg-[#fcfaf6] transition duration-300 hover:-translate-y-1 hover:shadow-xl ${featured ? "md:col-span-2" : ""}`}
    >
      <div className={`h-32 bg-[radial-gradient(circle_at_75%_25%,rgba(217,199,163,.8),transparent_24%),linear-gradient(125deg,#18345d,${featured ? "#5d6480" : "#344461"})] p-6 ${featured ? "sm:h-40" : ""}`}>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f2e9d8]">{country}</p>
      </div>
      <div className="p-6">
        <h3 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{name}{yiddishName && <span className="mt-1 block text-xl text-stone-500">{yiddishName}</span>}</h3>
        <p className="mt-3 leading-7 text-stone-600">{description}</p>
        <span className="mt-5 inline-block text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)] group-hover:text-[var(--navy)]">Explore the journey →</span>
      </div>
    </Link>
  );
}
