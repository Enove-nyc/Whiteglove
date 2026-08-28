"use client";

import { useState } from "react";
import CappedGrid from "@/components/CappedGrid";
import HechsherBadge from "@/components/HechsherBadge";
import ListToolbar, { listMatches } from "@/components/ListToolbar";
import type { Hechsher } from "@/data/hechsherim";

/**
 * The certifying bodies, with a way to find one.
 *
 * THE PAGE'S OWN REASON FOR EXISTING WAS UNREACHABLE. It was written for
 * somebody who has just seen an unfamiliar mark on a package and wants to know
 * whose it is — and it answered that by printing two hundred and eighty-seven
 * agencies under eighty-one region headings, in one column, with no search
 * box anywhere on it. On a phone that measured 39,211 pixels. The one question
 * the page exists to answer could only be answered by scrolling past every
 * answer it was not.
 *
 * So the search comes first, and it matches the same things the badge does:
 * the agency's name, the letters inside the circle, the region, and the
 * aliases the site uses to recognise the body in free text. Somebody with
 * "OU" or "בד״ץ" or "Star-K" on a wrapper types what they can see.
 *
 * The grouping stays. It is the second question — "who certifies in Israel" —
 * and it was the only thing the page had before.
 */
export default function HechsherimDirectory({
  agencies,
}: {
  /** Already filtered of local-rov, which is not an agency. */
  agencies: Hechsher[];
}) {
  const [query, setQuery] = useState("");

  const shown = agencies.filter((agency) =>
    listMatches([agency.name, agency.mark, agency.region, ...agency.aliases].join(" "), query),
  );

  // Rebuilt for whatever is on screen: a region heading over nothing is a
  // heading that lies. In the order the list is written, so somebody looking
  // at a package in Antwerp is not reading down the American agencies first.
  const groups = new Map<string, Hechsher[]>();
  for (const agency of shown) {
    const list = groups.get(agency.region) ?? [];
    list.push(agency);
    groups.set(agency.region, list);
  }

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="OU, Star-K, בד״ץ, London…"
        searchLabel="Search certification marks"
        empty={shown.length === 0}
      />

      {/* AND THE HEADINGS THEMSELVES ARE CAPPED, one level up. Eighty-one
          regions is what actually makes this page long — seventy-four of them
          hold six agencies or fewer, and a good many hold exactly one, so
          capping inside each group barely touched it. Twelve regions open,
          the rest one press away and all of them still in the HTML. */}
      <CappedGrid
        className="mt-8 space-y-12"
        total={groups.size}
        showAllLabel={`Show all ${groups.size} regions`}
      >
        {[...groups].map(([region, list]) => (
          <div key={region}>
            <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
              {region}
            </h2>
            {/* Six, because eighty-one of these headings is what makes the
                page long — the reader is skimming past most of them to reach
                one, not reading each in full. */}
            <CappedGrid
              tag="ul"
              cap={6}
              className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              total={list.length}
              showAllLabel={`Show all ${list.length} in ${region}`}
            >
              {list.map((agency) => (
                <li
                  key={agency.id}
                  className="flex items-start gap-4 rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5"
                >
                  {/* The mark only. Every row names its agency in the line
                      beside it, so a badge that also carried the name printed
                      it twice on the screen and read it three times aloud. */}
                  <HechsherBadge
                    status={{ state: "certified", hechsherId: agency.id }}
                    agencies={agencies}
                    size="md"
                    decorative
                  />
                  <div className="min-w-0">
                    <p className="font-semibold leading-6 text-[var(--navy)]">{agency.name}</p>
                    {agency.website ? (
                      <a
                        href={agency.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex min-h-11 max-w-full items-center gap-1 text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                      >
                        <span className="min-w-0 break-all">{agency.website.replace(/^https?:\/\/(www\.)?/, "")}</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </CappedGrid>
          </div>
        ))}
      </CappedGrid>
    </>
  );
}
