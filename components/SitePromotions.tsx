"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Promotion } from "@/lib/admin-content";

type PromoSet = { topBanner: Promotion | null; popup: Promotion | null; bottomBanner: Promotion | null };

function track(type: "promotion_view" | "promotion_click", id: string, placement: string) {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, id, value: placement }),
    keepalive: true,
  }).catch(() => undefined);
}

// A visitor may only see a promotion up to maxViewsPerVisitor times per day
// (0 = unlimited). Returns true if it may still be shown.
function underDailyCap(promo: Promotion): boolean {
  if (!promo.maxViewsPerVisitor || promo.maxViewsPerVisitor <= 0) return true;
  try {
    const key = `wg-promo:${promo.id}:${new Date().toISOString().slice(0, 10)}`;
    return Number(localStorage.getItem(key) || "0") < promo.maxViewsPerVisitor;
  } catch {
    return true;
  }
}

function recordView(promo: Promotion) {
  if (!promo.maxViewsPerVisitor || promo.maxViewsPerVisitor <= 0) return;
  try {
    const key = `wg-promo:${promo.id}:${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(key, String(Number(localStorage.getItem(key) || "0") + 1));
  } catch {
    /* ignore */
  }
}

export default function SitePromotions() {
  const pathname = usePathname();
  const [promos, setPromos] = useState<PromoSet>({ topBanner: null, popup: null, bottomBanner: null });
  const [closedTop, setClosedTop] = useState(false);
  const [closedBottom, setClosedBottom] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Don't run promotions inside the admin area or the access gate.
  const suppressed = pathname.startsWith("/admin") || pathname.startsWith("/access");

  useEffect(() => {
    if (suppressed) return;
    let active = true;
    setClosedTop(false);
    setClosedBottom(false);
    setShowPopup(false);
    fetch(`/api/promotions?path=${encodeURIComponent(pathname)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: PromoSet) => {
        if (!active) return;
        setPromos(data);
        // Popup: once per session per promotion, honoring the daily cap.
        if (data.popup && underDailyCap(data.popup)) {
          const seenKey = `wg-popup-seen:${data.popup.id}`;
          let seen = false;
          try {
            seen = sessionStorage.getItem(seenKey) === "1";
          } catch {
            /* ignore */
          }
          if (!seen) {
            setShowPopup(true);
            try {
              sessionStorage.setItem(seenKey, "1");
            } catch {
              /* ignore */
            }
            recordView(data.popup);
            track("promotion_view", data.popup.id, "popup");
          }
        }
        if (data.topBanner) track("promotion_view", data.topBanner.id, "fixed-top-banner");
        if (data.bottomBanner) track("promotion_view", data.bottomBanner.id, "sticky-bottom-banner");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname, suppressed]);

  if (suppressed) return null;

  const { topBanner, popup, bottomBanner } = promos;

  return (
    <>
      {/* Thin fixed banner, directly under the header */}
      {topBanner && !closedTop && (
        <div className="w-full border-b border-[var(--gold-light)] bg-[var(--navy)] text-[#f7f3eb]">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-8">
            <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--gold-light)] sm:inline">Sponsored</span>
            <p className="min-w-0 flex-1 truncate text-sm">
              <span className="font-semibold">{topBanner.title}</span>
              {topBanner.description ? <span className="hidden text-slate-300 sm:inline"> — {topBanner.description}</span> : null}
            </p>
            {topBanner.buttonText && (
              <a
                href={topBanner.targetHref}
                onClick={() => track("promotion_click", topBanner.id, "fixed-top-banner")}
                className="shrink-0 border border-[var(--gold-light)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--gold)] hover:text-[var(--navy)]"
              >
                {topBanner.buttonText}
              </a>
            )}
            <button type="button" onClick={() => setClosedTop(true)} aria-label="Dismiss" className="shrink-0 px-1 text-slate-300 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Entry popup */}
      {popup && showPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/60 px-5 py-8" role="dialog" aria-modal="true">
          <div className="w-full max-w-md border border-[var(--gold-light)] bg-[var(--cream)] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">Sponsored</p>
              <button type="button" onClick={() => setShowPopup(false)} aria-label="Close" className="text-stone-500 hover:text-[var(--navy)]">✕</button>
            </div>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{popup.title}</h2>
            {popup.description && <p className="mt-3 text-sm leading-6 text-stone-600">{popup.description}</p>}
            {popup.imageUrl ? <img src={popup.imageUrl} alt="" className="mt-4 max-h-56 w-full object-cover" /> : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {popup.buttonText && (
                <a href={popup.targetHref} onClick={() => track("promotion_click", popup.id, "popup")} className="border border-[var(--gold)] bg-[var(--navy)] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">
                  {popup.buttonText}
                </a>
              )}
              {popup.pdfUrl ? (
                <a href={popup.pdfUrl} target="_blank" rel="noreferrer" onClick={() => track("promotion_click", popup.id, "popup")} className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)]">View PDF</a>
              ) : null}
              <button type="button" onClick={() => setShowPopup(false)} className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">No thanks</button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom banner */}
      {bottomBanner && !closedBottom && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--gold-light)] bg-[#fcfaf6] shadow-[0_-6px_20px_rgba(23,45,82,0.08)]">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-8">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Sponsored</p>
              <p className="truncate text-sm text-[var(--navy)]"><span className="font-semibold">{bottomBanner.title}</span>{bottomBanner.description ? <span className="hidden text-stone-500 sm:inline"> — {bottomBanner.description}</span> : null}</p>
            </div>
            {bottomBanner.buttonText && (
              <a href={bottomBanner.targetHref} onClick={() => track("promotion_click", bottomBanner.id, "sticky-bottom-banner")} className="shrink-0 border border-[var(--gold)] bg-[var(--navy)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--gold)]">
                {bottomBanner.buttonText}
              </a>
            )}
            <button type="button" onClick={() => setClosedBottom(true)} aria-label="Dismiss" className="shrink-0 px-1 text-stone-500 hover:text-[var(--navy)]">✕</button>
          </div>
        </div>
      )}
    </>
  );
}
