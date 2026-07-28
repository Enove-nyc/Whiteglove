"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { buildDays, emptyItinerary, formatDateLong, travelerSummary, type Itinerary } from "@/data/itinerary";
import { buildPrintTimeline, coverDates, dayCountries, dayRouteTitle, tripCountries } from "@/data/itinerary-print";

// The printed itinerary — a keepsake document, not a screen dump.
//
// A cover, then one page per day laid out as a single running schedule: the
// time down the left, a marker, then what it is, where, and the one line of
// detail that matters. Everything comes from the planner; nothing is invented.

const LS_KEY = "whiteGloveItinerary";

const INK = "#16293a";
const MAROON = "#6f2b3e";
const GOLD = "#b0894f";
const GOLD_RULE = "#e3d9cc";
const BODY = "#545454";

export default function PrintItineraryPage() {
  const [itin, setItin] = useState<Itinerary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/itinerary", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.itinerary) {
            setItin({ ...emptyItinerary(), ...data.itinerary });
            return;
          }
        }
      } catch {
        /* not signed in */
      }
      try {
        const local = localStorage.getItem(LS_KEY);
        setItin(local ? { ...emptyItinerary(), ...JSON.parse(local) } : emptyItinerary());
      } catch {
        setItin(emptyItinerary());
      }
    })();
  }, []);

  if (!itin) return <main className="p-10 text-sm text-stone-500">Loading your itinerary…</main>;

  const days = itin.startDate && itin.endDate ? buildDays(itin) : [];
  const title = itin.title || "Itinerary";
  const countries = tripCountries(itin);
  const dates = coverDates(itin.startDate, itin.endDate);
  const year = itin.startDate.slice(0, 4);
  const month = dates ? dates.split(" ")[0] : "";
  const footerRight = [title, month && year ? `${month.charAt(0)}${month.slice(1).toLowerCase()} ${year}` : ""].filter(Boolean).join(" · ");

  return (
    <>
      <style>{css}</style>

      <div className="wg-toolbar">
        <p>
          Use your browser&apos;s <strong>Print → Save as PDF</strong>. Choose <strong>Letter</strong>, margins{" "}
          <strong>None</strong>, and tick <strong>Background graphics</strong>.
        </p>
        <button type="button" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      {/* ---------------- Cover ---------------- */}
      <section className="wg-page wg-cover">
        <div className="wg-frame" />
        <svg className="wg-arc" viewBox="0 0 260 260" aria-hidden="true">
          <path d="M260 0 A260 260 0 0 0 0 260" fill="none" stroke={GOLD_RULE} strokeWidth="1.2" />
        </svg>

        <div className="wg-cover-inner">
          <Image src="/logo.png" alt="White Glove Itineraries" width={480} height={320} className="wg-crest" priority />
          <p className="wg-cover-eyebrow">A White Glove Itineraries journey</p>
          <h1 className="wg-cover-title">{title}</h1>
          {countries && <p className="wg-cover-countries">{countries}</p>}
          <div className="wg-cover-rule" />
          {dates && <p className="wg-cover-dates">{dates}</p>}
          {travelerSummary(itin) && <p className="wg-cover-for">Prepared for {travelerSummary(itin)}</p>}
        </div>

        <p className="wg-cover-foot">Thoughtfully arranged · meaningfully traveled</p>
      </section>

      {/* ---------------- One page per day ---------------- */}
      {days.map((day, index) => {
        const timeline = buildPrintTimeline(day);
        return (
          <section className="wg-page wg-day" key={day.date}>
            <header className="wg-head">
              <Image src="/logo.png" alt="" width={160} height={110} className="wg-head-mark" />
              <span className="wg-head-name">White Glove Itineraries · {title}</span>
              <span className="wg-head-day">Day {String(index + 1).padStart(2, "0")}</span>
            </header>

            <div className="wg-titleblock">
              <div>
                <p className="wg-eyebrow">{formatDateLong(day.date)}</p>
                <h2 className="wg-daytitle">{dayRouteTitle(day)}</h2>
              </div>
              {dayCountries(day) && <p className="wg-daymeta">{dayCountries(day)}</p>}
            </div>

            <div className="wg-bar" />

            {timeline.length === 0 ? (
              <p className="wg-empty">Nothing scheduled for this day yet.</p>
            ) : (
              <ol className="wg-timeline">
                {timeline.map((e, i) => (
                  <li key={i}>
                    <span className="wg-time">{e.time}</span>
                    <span className="wg-dot" aria-hidden="true" />
                    <span className="wg-entry">
                      <span className="wg-kind">{e.kind}</span>
                      <span className="wg-what">{e.title}</span>
                      {e.detail && <span className="wg-detail">{e.detail}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <footer className="wg-foot">
              <span>White Glove Itineraries</span>
              <span>{footerRight}</span>
            </footer>
          </section>
        );
      })}

      {days.length === 0 && (
        <section className="wg-page wg-day">
          <p className="wg-empty">Add start and end dates and some stops in the planner, then come back here.</p>
        </section>
      )}
    </>
  );
}

const css = `
  @page { size: letter; margin: 0; }

  .wg-toolbar {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
    gap: 12px; padding: 14px 22px; background: #f7f3eb; border-bottom: 1px solid ${GOLD_RULE};
    font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${BODY};
  }
  .wg-toolbar button {
    border: 1px solid ${INK}; background: ${INK}; color: #fff; padding: 10px 18px;
    font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; cursor: pointer;
  }

  .wg-page {
    position: relative; box-sizing: border-box;
    width: 8.5in; min-height: 11in; margin: 24px auto; padding: 0.62in 0.72in;
    background: #fff; color: ${INK};
    font-family: Arial, Helvetica, sans-serif;
    display: flex; flex-direction: column;
    box-shadow: 0 10px 30px rgba(0,0,0,.10);
  }
  .wg-page + .wg-page { break-before: page; }

  /* ---- cover ---- */
  .wg-cover { align-items: center; justify-content: center; text-align: center; }
  .wg-frame { position: absolute; inset: 0.3in; border: 1px solid ${GOLD_RULE}; pointer-events: none; }
  .wg-arc { position: absolute; top: 0; right: 0; width: 2.6in; height: 2.6in; }
  .wg-cover-inner { position: relative; display: flex; flex-direction: column; align-items: center; }
  .wg-crest { width: 2.1in; height: auto; object-fit: contain; }
  .wg-cover-eyebrow {
    margin-top: 26px; font-size: 9px; font-weight: 700; letter-spacing: .26em;
    text-transform: uppercase; color: ${GOLD};
  }
  .wg-cover-title {
    margin-top: 20px; font-family: Georgia, "Times New Roman", serif; font-weight: 700;
    font-size: 42px; line-height: 1.08; color: ${INK}; max-width: 6in;
  }
  .wg-cover-countries {
    margin-top: 12px; font-family: Georgia, "Times New Roman", serif; font-size: 21px; color: ${MAROON};
  }
  .wg-cover-rule { margin-top: 22px; width: 155px; height: 1.5px; background: ${GOLD}; }
  .wg-cover-dates { margin-top: 20px; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: ${BODY}; }
  .wg-cover-for { margin-top: 12px; font-size: 11px; color: ${BODY}; }
  .wg-cover-foot {
    position: absolute; bottom: 0.95in; left: 0; right: 0;
    font-size: 10px; letter-spacing: .08em; color: ${BODY};
  }

  /* ---- day header ---- */
  .wg-head { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid ${GOLD_RULE}; }
  .wg-head-mark { width: 34px; height: auto; object-fit: contain; }
  .wg-head-name { flex: 1; font-family: Georgia, "Times New Roman", serif; font-size: 15px; color: ${INK}; }
  .wg-head-day { font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: ${MAROON}; }

  .wg-titleblock { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-top: 30px; }
  .wg-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: ${GOLD}; }
  .wg-daytitle {
    margin-top: 12px; font-family: Georgia, "Times New Roman", serif; font-weight: 700;
    font-size: 31px; line-height: 1.14; color: ${INK}; max-width: 5.4in;
  }
  .wg-daymeta {
    flex-shrink: 0; padding-top: 2px; font-size: 9px; letter-spacing: .16em;
    text-transform: uppercase; color: ${GOLD}; text-align: right; max-width: 2in;
  }

  .wg-bar {
    margin-top: 26px; height: 3.5px; background: ${MAROON};
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  /* ---- timeline ---- */
  .wg-timeline { margin-top: 26px; list-style: none; padding: 0; }
  .wg-timeline li { display: grid; grid-template-columns: 0.78in 22px 1fr; align-items: start; padding-bottom: 20px; }
  .wg-time { text-align: right; font-size: 10.5px; font-weight: 700; color: ${INK}; padding-top: 8px; }
  .wg-dot {
    justify-self: center; margin-top: 11px; width: 7px; height: 7px; border-radius: 50%;
    border: 1.6px solid ${MAROON};
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .wg-entry { display: block; }
  .wg-kind { display: block; font-size: 8px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: ${GOLD}; }
  .wg-what { display: block; margin-top: 3px; font-family: Georgia, "Times New Roman", serif; font-weight: 700; font-size: 15.5px; color: ${INK}; }
  .wg-detail { display: block; margin-top: 3px; font-size: 10.5px; line-height: 1.5; color: ${BODY}; }

  .wg-empty { margin-top: 40px; font-size: 12px; color: ${BODY}; }

  .wg-foot {
    margin-top: auto; padding-top: 12px; border-top: 1px solid ${GOLD_RULE};
    display: flex; justify-content: space-between; font-size: 8.5px; color: ${BODY};
  }

  @media print {
    .wg-toolbar { display: none; }
    .wg-page { margin: 0; box-shadow: none; width: auto; min-height: 100vh; }
  }
`;
