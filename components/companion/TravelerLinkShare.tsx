"use client";

import { useState } from "react";

export default function TravelerLinkShare({ code, disabled }: { code: string; disabled?: boolean }) {
  const link = `https://app.whitegloveitineraries.com/t/${encodeURIComponent(code)}/app`;
  const [status, setStatus] = useState("");
  const [showLink, setShowLink] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Traveler link copied.");
    } catch {
      setShowLink(true);
      setStatus("Select the traveler link to copy it.");
    }
  }

  async function shareLink() {
    setStatus("");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Your White Glove itinerary", url: link });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-x-4">
      <button type="button" disabled={disabled} onClick={() => void shareLink()} className="min-h-11 font-semibold underline disabled:opacity-50">Share link</button>
      <button type="button" disabled={disabled} onClick={() => void copyLink()} className="min-h-11 font-semibold underline disabled:opacity-50">Copy link</button>
      {showLink && <input readOnly aria-label="Traveler link" value={link} onFocus={(event) => event.target.select()} className="w-full rounded border border-stone-300 px-2 py-1" />}
      {status && <p role="status" className="w-full text-stone-700">{status}</p>}
    </div>
  );
}
