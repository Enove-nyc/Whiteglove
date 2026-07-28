"use client";

import { useState } from "react";
import AdWizard from "@/components/AdWizard";
import { adStatus, describeAd } from "@/lib/ad-types";
import type { Promotion } from "@/lib/admin-content";

// Every advertisement as a card that answers the four questions an owner has:
// is it running, where does it show, when, and is anybody clicking it.

const TONE: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-900",
  info: "bg-sky-100 text-sky-900",
  warn: "bg-amber-100 text-amber-900",
  muted: "bg-stone-200 text-stone-700",
};

const buttonClass =
  "min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)]";

function emptyAd(): Promotion {
  const now = new Date().toISOString();
  return {
    id: "",
    title: "",
    description: "",
    buttonText: "Learn more",
    targetHref: "/",
    imageUrl: "",
    pdfUrl: "",
    placements: ["fixed-top-banner"],
    targetPaths: "",
    device: "all",
    startDate: "",
    endDate: "",
    priority: 0,
    maxViewsPerVisitor: 0,
    enabled: false,
    impressions: 0,
    clicks: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export default function AdManager({ initial, configured }: { initial: Promotion[]; configured: boolean }) {
  const [ads, setAds] = useState(initial);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function send(ad: Promotion, remove = false) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: remove ? "promotion-delete" : "promotion", data: remove ? { id: ad.id } : ad }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { promotions?: Promotion[] };
      if (data.promotions) setAds(data.promotions);
      setMessage({ ok: true, text: remove ? "Deleted." : ad.enabled ? "Published — it is live now." : "Saved as a draft." });
      setEditing(null);
    } catch {
      setMessage({ ok: false, text: "Could not save. Check the connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <>
        {message && (
          <p role="status" className={`mb-4 text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
            {message.text}
          </p>
        )}
        <AdWizard initial={editing} onSave={(ad) => void send(ad)} onCancel={() => setEditing(null)} saving={saving} />
      </>
    );
  }

  return (
    <div>
      {!configured && (
        <p className="mb-5 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Advertisements need the private store connected before they can be saved.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          {ads.length === 0
            ? "No advertisements yet."
            : `${ads.length} advertisement${ads.length === 1 ? "" : "s"} · ${ads.filter((a) => adStatus(a).label === "Live").length} live`}
        </p>
        <button
          type="button"
          onClick={() => setEditing(emptyAd())}
          className="min-h-[44px] border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
        >
          Create an advertisement
        </button>
      </div>

      {message && (
        <p role="status" className={`mt-4 text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}

      {ads.length === 0 ? (
        <p className="mt-8 border border-dashed border-[var(--gold-light)] p-10 text-center text-sm text-stone-600">
          When you make one it will appear here, with how many people have seen it and how many clicked.
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 lg:grid-cols-2">
          {ads.map((ad) => {
            const status = adStatus(ad);
            return (
              <li key={ad.id} className="flex flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
                    {ad.title || "Untitled"}
                  </p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${TONE[status.tone]}`}>
                    {status.label}
                  </span>
                </div>

                <p className="mt-2 text-sm text-stone-600">{describeAd(ad.placements)}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {ad.targetPaths ? `Only on ${ad.targetPaths}` : "On every page it can appear"}
                  {ad.device !== "all" ? ` · ${ad.device === "mobile" ? "phones only" : "computers only"}` : ""}
                </p>
                {(ad.startDate || ad.endDate) && (
                  <p className="mt-1 text-sm text-stone-500">
                    {ad.startDate || "any time"} → {ad.endDate || "no end"}
                  </p>
                )}

                <p className="mt-3 text-sm text-stone-600">
                  <strong className="text-[var(--navy)]">{ad.impressions}</strong> seen ·{" "}
                  <strong className="text-[var(--navy)]">{ad.clicks}</strong> clicked
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditing(ad)} className={buttonClass}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void send({ ...ad, enabled: !ad.enabled })}
                    className={buttonClass}
                  >
                    {ad.enabled ? "Pause" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...ad, id: "", title: `${ad.title} (copy)`, enabled: false, impressions: 0, clicks: 0 })}
                    className={buttonClass}
                  >
                    Duplicate
                  </button>
                  {confirmDelete === ad.id ? (
                    <>
                      <span className="self-center text-sm text-stone-600">Delete for good?</span>
                      <button type="button" onClick={() => void send(ad, true)} className="min-h-[36px] border border-red-400 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-red-700 transition hover:bg-red-50">
                        Yes, delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className={buttonClass}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(ad.id)}
                      className="min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-400 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
