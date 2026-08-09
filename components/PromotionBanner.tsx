"use client";

import { useEffect, useState } from "react";
import type { Promotion } from "@/lib/admin-content";

export default function PromotionBanner({
  promotion,
  placement,
  compact = false,
}: {
  promotion: Promotion | null;
  placement: string;
  compact?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!promotion) return;
    const key = `white-glove-promotion:${promotion.id}`;
    const today = new Date().toISOString().slice(0, 10);
    const seenKey = `${key}:${today}`;
    const seen = Number(localStorage.getItem(seenKey) || "0");
    if (promotion.maxViewsPerVisitor > 0 && seen < promotion.maxViewsPerVisitor) {
      localStorage.setItem(seenKey, String(seen + 1));
    }
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "promotion_view", id: promotion.id, value: placement }),
      keepalive: true,
    });
  }, [placement, promotion]);

  if (!promotion || dismissed) return null;

  const trackClick = () => {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "promotion_click", id: promotion.id, value: placement }),
      keepalive: true,
    });
  };

  const wrapperClass = promotion.placements.includes("full-page-takeover")
    ? "fixed inset-0 z-[var(--wg-z-modal)] flex items-center justify-center bg-stone-950/60 px-5 py-8"
    : compact
      ? "mx-auto max-w-6xl px-5 sm:px-8"
      : "";

  const cardClass = promotion.placements.includes("full-page-takeover")
    ? "w-full max-w-2xl border border-[var(--gold-light)] bg-[var(--cream)] p-6 shadow-2xl sm:p-8"
    : promotion.placements.includes("popup")
      ? "border border-[var(--gold-light)] bg-[#fcfaf6] p-4 shadow-2xl"
      : "border border-[var(--gold-light)] bg-[#fcfaf6] p-5";

  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">Sponsored</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)] sm:text-3xl">{promotion.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{promotion.description}</p>
          </div>
          <button type="button" onClick={() => setDismissed(true)} className="text-sm text-stone-500" aria-label="Dismiss promotion">
            ✕
          </button>
        </div>
        {/* A tall notice used to be forced into a 160px letterbox and CROPPED
            to fill it — object-cover — so the small print in it came out a few
            pixels high and could not be read at any size. It fits now instead
            of filling, and the title carries into alt, because alt="" told a
            screen reader there was nothing here at all. */}
        {promotion.videoUrl ? (
          <video
            src={promotion.videoUrl}
            className="mt-4 max-h-[60vh] w-full bg-black object-contain"
            controls
            playsInline
            preload="metadata"
            poster={promotion.imageUrl || undefined}
          />
        ) : promotion.imageUrl ? (
          <img src={promotion.imageUrl} alt={promotion.title} className="mt-4 max-h-[60vh] w-full object-contain" />
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a href={promotion.targetHref} onClick={trackClick} className="border border-[var(--gold)] bg-[var(--navy)] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white">
            {promotion.buttonText}
          </a>
          {promotion.pdfUrl ? (
            <a href={promotion.pdfUrl} target="_blank" rel="noreferrer" onClick={trackClick} className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)]">
              View PDF
            </a>
          ) : null}
          {promotion.placements.includes("full-page-takeover") ? (
            <button type="button" onClick={() => setDismissed(true)} className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)]">
              Close
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
