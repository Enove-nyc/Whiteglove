"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ImportReviewQueue,
  ReviewQueueItem,
  ReviewQueueItemStatus,
  ReviewQueueKind,
} from "@/lib/review-queue";
import { isOpenReviewStatus, reviewQueueKindLabel, reviewQueueStatusLabel } from "@/lib/review-queue";

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--gold-ink)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{value}</p>
    </div>
  );
}

function statusClass(status: ReviewQueueItemStatus) {
  if (status === "PUBLISHED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "DUPLICATE") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "REJECTED") return "border-stone-200 bg-stone-50 text-stone-600";
  if (status === "AWAITING_VERIFICATION") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function matches(item: ReviewQueueItem, query: string) {
  const text = [item.name, item.city, item.country, item.destination, item.market, item.batchName]
    .join(" ")
    .toLocaleLowerCase("en");
  return text.includes(query.toLocaleLowerCase("en"));
}

export default function ImportNeedsReviewQueue({ queue }: { queue: ImportReviewQueue }) {
  const [status, setStatus] = useState<"OPEN" | "ALL" | ReviewQueueItemStatus>("OPEN");
  const [kind, setKind] = useState<"ALL" | ReviewQueueKind>("ALL");
  const [market, setMarket] = useState("ALL");
  const [batch, setBatch] = useState("ALL");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(100);

  const markets = useMemo(
    () => [...new Set(queue.items.map((item) => item.market).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en")),
    [queue.items],
  );
  const batches = useMemo(() => {
    const map = new Map(queue.items.map((item) => [item.batchSlug, item.batchName]));
    for (const pack of queue.packs) map.set(pack.slug, pack.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "en"));
  }, [queue.items, queue.packs]);

  const filtered = useMemo(
    () =>
      queue.items.filter((item) => {
        if (status === "OPEN" && !isOpenReviewStatus(item.status)) return false;
        if (status !== "OPEN" && status !== "ALL" && item.status !== status) return false;
        if (kind !== "ALL" && item.kind !== kind) return false;
        if (market !== "ALL" && item.market !== market) return false;
        if (batch !== "ALL" && item.batchSlug !== batch) return false;
        return matches(item, query);
      }),
    [queue.items, status, kind, market, batch, query],
  );
  const shown = filtered.slice(0, limit);

  return (
    <section className="mt-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Count label="Awaiting verification" value={queue.counts.awaitingVerification} />
        <Count label="Needs review" value={queue.counts.needsReview} />
        <Count label="In source packs only" value={queue.counts.sourcePackOnly} />
        <Count label="Possible duplicates" value={queue.counts.duplicates} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(queue.counts.byKind) as ReviewQueueKind[]).map((key) => (
          <Count key={key} label={reviewQueueKindLabel(key)} value={queue.counts.byKind[key]} />
        ))}
      </div>

      {queue.counts.byBatch.length > 0 && (
        <p className="mt-4 text-sm leading-6 text-stone-600">
          By batch:{" "}
          {queue.counts.byBatch
            .slice(0, 6)
            .map((item) => `${item.name} (${item.count})`)
            .join(" · ")}
        </p>
      )}
      {queue.counts.byMarket.length > 0 && (
        <p className="mt-1 text-sm leading-6 text-stone-600">
          By market:{" "}
          {queue.counts.byMarket
            .slice(0, 8)
            .map((item) => `${item.market} (${item.count})`)
            .join(" · ")}
        </p>
      )}

      <section className="mt-8 space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Private import packs</h2>
        {queue.packs.length === 0 ? (
          <p className="text-sm text-stone-600">No private import packs were found under data/imports.</p>
        ) : (
          queue.packs.map((pack) => (
            <article key={pack.slug} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">{pack.path}</p>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{pack.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {pack.candidateCount} candidate{pack.candidateCount === 1 ? "" : "s"}
                    {pack.needsReviewCount > 0 ? ` · ${pack.needsReviewCount} awaiting verification` : ""}
                    {pack.inDatabase ? " · already in the database queue" : " · not yet in the database"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{pack.note}</p>
                </div>
                <Link
                  href={pack.href}
                  className="inline-flex min-h-11 shrink-0 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white"
                >
                  {pack.href.includes("trello") ? "Open Trello review" : "Open Bulk imports"}
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <label className="block flex-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
            Search
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(100);
              }}
              placeholder="Name, destination, market…"
              className="mt-1 w-full border border-[var(--gold-light)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--navy)] outline-none focus:border-[var(--gold)]"
            />
          </label>
          <Filter
            label="Status"
            value={status}
            onChange={(value) => {
              setStatus(value as typeof status);
              setLimit(100);
            }}
          >
            <option value="OPEN">Still needs attention</option>
            <option value="ALL">Every state</option>
            <option value="AWAITING_VERIFICATION">{reviewQueueStatusLabel("AWAITING_VERIFICATION")}</option>
            <option value="NEEDS_REVIEW">{reviewQueueStatusLabel("NEEDS_REVIEW")}</option>
            <option value="DUPLICATE">{reviewQueueStatusLabel("DUPLICATE")}</option>
            <option value="REJECTED">{reviewQueueStatusLabel("REJECTED")}</option>
            <option value="PUBLISHED">{reviewQueueStatusLabel("PUBLISHED")}</option>
          </Filter>
          <Filter
            label="Type"
            value={kind}
            onChange={(value) => {
              setKind(value as typeof kind);
              setLimit(100);
            }}
          >
            <option value="ALL">Every type</option>
            <option value="attraction">{reviewQueueKindLabel("attraction")}</option>
            <option value="stay">{reviewQueueKindLabel("stay")}</option>
            <option value="food">{reviewQueueKindLabel("food")}</option>
            <option value="practical">{reviewQueueKindLabel("practical")}</option>
          </Filter>
          <Filter
            label="Market"
            value={market}
            onChange={(value) => {
              setMarket(value);
              setLimit(100);
            }}
          >
            <option value="ALL">Every market</option>
            {markets.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Filter>
          <Filter
            label="Batch"
            value={batch}
            onChange={(value) => {
              setBatch(value);
              setLimit(100);
            }}
          >
            <option value="ALL">Every batch</option>
            {batches.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </Filter>
        </div>

        {!queue.databaseReady && (
          <p className="mt-5 border-l-4 border-[var(--gold)] bg-[var(--cream)] px-4 py-3 text-sm leading-6 text-stone-700">
            {queue.configured
              ? "The private database is not ready yet, so staged review rows are unavailable. Source packs below are still private and not public."
              : "The private content database is not connected. Source packs below are still private and not public."}
          </p>
        )}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="border-b border-[var(--gold-light)] text-xs font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)]">
              <tr>
                <th className="px-3 py-3">Listing</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Market / destination</th>
                <th className="px-3 py-3">Batch</th>
                <th className="px-3 py-3">State</th>
                <th className="px-3 py-3">Review</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <tr key={item.id} className="border-b border-[var(--gold-light)] align-top">
                  <td className="px-3 py-4">
                    <p className="font-semibold text-[var(--navy)]">{item.name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {item.city}, {item.country}
                    </p>
                  </td>
                  <td className="px-3 py-4 text-stone-700">{item.kindLabel}</td>
                  <td className="px-3 py-4 text-stone-700">
                    <p>{item.destination}</p>
                    {item.market && <p className="mt-1 text-xs text-stone-500">{item.market}</p>}
                  </td>
                  <td className="px-3 py-4 text-stone-700">{item.batchName}</td>
                  <td className="px-3 py-4">
                    <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                      {item.statusLabel}
                    </span>
                    {item.publishBlockers > 0 && (
                      <p className="mt-1 text-xs text-stone-500">
                        {item.publishBlockers} blocker{item.publishBlockers === 1 ? "" : "s"}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <Link href={item.href} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
                      {item.origin === "database"
                        ? "Open review →"
                        : item.href.includes("trello")
                          ? "Open Trello review →"
                          : "Open Bulk imports →"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <p className="mt-6 text-sm text-stone-600">No candidates match these filters.</p>}
        {filtered.length > shown.length && (
          <button
            type="button"
            onClick={() => setLimit((current) => current + 100)}
            className="mt-6 min-h-11 border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
          >
            Show 100 more
          </button>
        )}
      </section>
    </section>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-w-40 border border-[var(--gold-light)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--navy)] outline-none focus:border-[var(--gold)]"
      >
        {children}
      </select>
    </label>
  );
}
