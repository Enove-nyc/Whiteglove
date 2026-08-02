"use client";

import Image from "next/image";
import { buildDays, formatDateLong, travelerSummary, type Itinerary } from "@/data/itinerary";
import { BUILT_IN_ASSUMPTIONS, type PlannerAssumptions } from "@/data/planner-assumptions";
import { buildPrintTimeline, coverDates, dayCountries, dayRouteEnglishTitle, dayRouteTitle, tripCountries } from "@/data/itinerary-print";

// The printed itinerary — a keepsake document, not a screen dump.
//
// A cover, then one page per day laid out as a single running schedule: the
// time down the left, a marker, then what it is, where, and the one line of
// detail that matters. Everything comes from the planner; nothing is invented.
//
// One document, used by two routes: the traveler printing their own trip, and
// anyone printing a trip that was shared with them. A shared trip printing as a
// screen dump while the owner's printed as this was the whole problem — the
// person being handed the itinerary is usually the one who wants it on paper.

const INK = "#16293a";
const MAROON = "#6f2b3e";
const GOLD = "#b0894f";
const GOLD_RULE = "#e3d9cc";
const BODY = "#545454";

export default function PrintableItinerary({
  itin,
  burials,
  /** Whose trip it is, when somebody else is printing it. */
  sharedBy,
  /**
   * The owner's planning figures. The same set the planner used, so the paper
   * copy cannot give a different arrival time from the screen it came off.
   */
  assume = BUILT_IN_ASSUMPTIONS,
}: {
  itin: Itinerary;
  burials: Record<string, string[]>;
  sharedBy?: string;
  assume?: PlannerAssumptions;
}) {
  // No border cost, deliberately, and unchanged by the planning figures above.
  // A printed itinerary is made once and read weeks later; a queue somebody
  // measured at the crossing in June is not a fact about the morning this page
  // is actually carried through it. What to put on paper about a border is
  // still open — see the border crossings screen.
  const days = itin.startDate && itin.endDate ? buildDays(itin, undefined, assume) : [];
  const title = itin.title || "Itinerary";
  const countries = tripCountries(itin);
  const dates = coverDates(itin.startDate, itin.endDate);
  const year = itin.startDate.slice(0, 4);
  const month = dates ? dates.split(" ")[0] : "";
  const footerRight = [title, month && year ? `${month.charAt(0)}${month.slice(1).toLowerCase()} ${year}` : ""].filter(Boolean).join(" · ");

  // The cover used to say all of this in large type down the middle of the
  // page — the countries at 21px, the dates, who it was for, each on its own
  // line. It read as four competing headlines. It is one small list now, under
  // the title, which is what a summary is.
  const summary = [
    dates && { label: "When", value: dates },
    countries && { label: "Where", value: countries },
    travelerSummary(itin) && { label: "Travelling", value: travelerSummary(itin) },
    days.length > 0 && { label: "Days", value: `${days.length}` },
    itin.flights.length > 0 && { label: "Flights", value: `${itin.flights.length}` },
    itin.lodging.length > 0 && { label: "Where you sleep", value: `${itin.lodging.length} booked` },
    sharedBy && { label: "Shared by", value: sharedBy },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

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
          <div className="wg-cover-rule" />
          {summary.length > 0 && (
            <ul className="wg-cover-summary">
              {summary.map((item) => (
                <li key={item.label}>
                  <span className="wg-sum-label">{item.label}</span>
                  <span className="wg-sum-value">{item.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="wg-cover-foot">
          Thoughtfully arranged · meaningfully traveled
          <span className="wg-cover-site">whitegloveitineraries.com</span>
        </p>
      </section>

      {/* ---------------- One page per day ---------------- */}
      {days.map((day, index) => {
        const timeline = buildPrintTimeline(day, burials);
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
                <h2
                  className="wg-daytitle"
                  dir={day.activities.some((activity) => activity.yiddishName) ? "rtl" : undefined}
                  lang={day.activities.some((activity) => activity.yiddishName) ? "yi" : undefined}
                >
                  {dayRouteTitle(day)}
                </h2>
                {dayRouteEnglishTitle(day) && <p className="wg-daytitle-en">{dayRouteEnglishTitle(day)}</p>}
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
                      <span className="wg-what" dir={e.secondaryTitle ? "rtl" : undefined} lang={e.secondaryTitle ? "yi" : undefined}>{e.title}</span>
                      {e.secondaryTitle && <span className="wg-secondary">{e.secondaryTitle}</span>}
                      {e.detail && <span className="wg-detail">{e.detail}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <footer className="wg-foot">
              <span>White Glove Itineraries · whitegloveitineraries.com</span>
              <span>{footerRight}</span>
            </footer>
          </section>
        );
      })}

      {days.length === 0 && (
        <section className="wg-page wg-day">
          <p className="wg-empty">This trip has no dates and stops yet.</p>
        </section>
      )}

      {/* The traveler's own notes, on their own page at the back. A note you
          cannot take with you is not a note — and this is the printout that
          goes in the bag. */}
      {itin.notes?.trim() && (
        <section className="wg-page wg-day">
          <header className="wg-day-head">
            <p className="wg-day-eyebrow">Your notes</p>
          </header>
          <p className="wg-notes">{itin.notes.trim()}</p>
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

  .wg-notes {
    margin: 18px 0 0; white-space: pre-wrap; font-size: 14px; line-height: 1.85; color: ${BODY};
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
    margin-top: 18px; font-family: Georgia, "Times New Roman", serif; font-weight: 700;
    font-size: 30px; line-height: 1.12; color: ${INK}; max-width: 6in;
  }
  .wg-cover-rule { margin-top: 22px; width: 155px; height: 1.5px; background: ${GOLD}; }

  /* The summary: a short list, quietly set. Four large centred lines read as
     four headlines arguing with each other. */
  .wg-cover-summary {
    margin-top: 24px; list-style: none; padding: 0; text-align: left;
    display: grid; gap: 7px; max-width: 4.1in;
  }
  .wg-cover-summary li {
    display: grid; grid-template-columns: 1.35in 1fr; align-items: baseline;
    padding-bottom: 6px; border-bottom: 1px solid ${GOLD_RULE};
  }
  .wg-sum-label {
    font-size: 8.5px; font-weight: 700; letter-spacing: .16em;
    text-transform: uppercase; color: ${GOLD};
  }
  .wg-sum-value { font-size: 11.5px; line-height: 1.5; color: ${BODY}; }
  .wg-cover-foot {
    position: absolute; bottom: 0.8in; left: 0; right: 0;
    font-size: 10px; letter-spacing: .08em; color: ${BODY};
  }
  .wg-cover-site {
    display: block; margin-top: 6px; font-size: 10px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase; color: ${GOLD};
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
  .wg-daytitle-en { margin-top: 5px; font-size: 10px; line-height: 1.4; color: ${BODY}; }
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
  .wg-secondary { display: block; margin-top: 2px; font-size: 9.5px; line-height: 1.4; color: ${BODY}; }
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
