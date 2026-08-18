"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminCatalogEntry } from "@/lib/admin-listing-catalog";

export default function AdminCatalogList({
  entries,
  empty,
}: {
  entries: AdminCatalogEntry[];
  empty: string;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("en");
    if (!needle) return entries;
    return entries.filter((item) =>
      [item.name, item.city, item.country, item.kind].join(" ").toLocaleLowerCase("en").includes(needle),
    );
  }, [entries, query]);

  if (entries.length === 0) {
    return <p className="mt-8 max-w-xl text-sm leading-6 text-stone-600">{empty}</p>;
  }

  return (
    <div className="mt-8">
      <label className="block max-w-xl text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
        Search
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, city, country…"
          className="mt-1 w-full border border-[var(--gold-light)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--navy)] outline-none focus:border-[var(--gold)]"
        />
      </label>
      <p className="mt-3 text-sm text-stone-600">
        {shown.length === entries.length ? `${entries.length} listings.` : `${shown.length} of ${entries.length} match.`}
      </p>
      <ul className="mt-4 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
        {shown.map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
            <div>
              <p className="font-semibold text-[var(--navy)]">{item.name}</p>
              <p className="mt-1 text-sm text-stone-600">
                {item.kind} · {item.city}, {item.country}
                {item.ownerAdded ? " · added here" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={item.viewHref} className="underline decoration-[var(--gold)] underline-offset-4">
                Public page
              </Link>
              <Link href={item.editHref} className="underline decoration-[var(--gold)] underline-offset-4">
                Edit
              </Link>
              {item.sourceUrl ? (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-[var(--gold)] underline-offset-4">
                  Source
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
