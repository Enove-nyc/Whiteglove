"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ItinAttachment } from "@/data/itinerary";
import { encodePhoto, photoTypes } from "@/lib/browser-trip-photo";

export default function TripPictureEditor({
  label, src, onPick, onRemove,
}: {
  label: string;
  src?: string;
  onPick: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- private attachment URL or local data URL
        <img src={src} alt={label} className={label === "Profile photo" ? "size-20 rounded-full object-cover" : "aspect-video w-full max-w-sm rounded-xl object-cover"} />
      )}
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-[#15204A] focus-within:outline focus-within:outline-2">
        {src ? "Change" : "Add"} {label.toLowerCase()}
        <input type="file" aria-label={`Choose ${label.toLowerCase()}`} accept={photoTypes} disabled={busy} className="sr-only" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void run(() => onPick(file));
        }} />
      </label>
      {src && <button type="button" disabled={busy} className="ml-2 min-h-11 text-sm underline" onClick={() => void run(onRemove)}>Remove photo</button>}
      {busy && <p role="status" className="text-sm">Saving photo…</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
  );
}

export function TripCoverEditor({ cover, signedIn, onSave }: {
  cover?: ItinAttachment;
  signedIn: boolean;
  onSave: (cover?: ItinAttachment) => Promise<boolean>;
}) {
  if (!signedIn) return <Link href="/login?next=%2Fitinerary" className="text-sm underline">Sign in to add a trip cover photo</Link>;
  return (
    <>
      <TripPictureEditor label="Trip cover photo" src={cover ? `/api/account/attachments?id=${encodeURIComponent(cover.id)}` : undefined} onPick={async (file) => {
        const dataUrl = await encodePhoto(file);
        const response = await fetch("/api/account/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Trip cover.jpg", kind: "photo", dataUrl }),
        });
        const result = await response.json().catch(() => null) as { attachment?: ItinAttachment; error?: string } | null;
        if (!response.ok || !result?.attachment) throw new Error(result?.error ?? "Could not upload the cover photo.");
        if (!await onSave(result.attachment)) throw new Error("Could not save the cover photo to this trip.");
      }} onRemove={async () => {
        if (!await onSave()) throw new Error("Could not remove this cover photo.");
      }} />
      <p className="mt-2 text-xs text-stone-600">Travelers with a link to this trip can see its cover photo.</p>
    </>
  );
}

const photoUpdate = "wg-profile-photo";
function subscribe(callback: () => void) {
  window.addEventListener(photoUpdate, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(photoUpdate, callback);
    window.removeEventListener("storage", callback);
  };
}
const noPhoto = () => undefined;

export function TravelerProfilePhoto({ travelerKey }: { travelerKey: string }) {
  const key = `wg:profile-photo:${travelerKey}`;
  const src = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key) ?? undefined; } catch { return undefined; }
  }, noPhoto);
  return (
    <>
      <TripPictureEditor label="Profile photo" src={src} onPick={async (file) => {
        localStorage.setItem(key, await encodePhoto(file, [384, 256]));
        window.dispatchEvent(new Event(photoUpdate));
      }} onRemove={async () => {
        localStorage.removeItem(key);
        window.dispatchEvent(new Event(photoUpdate));
      }} />
      <p className="text-xs text-stone-600">Your profile photo is saved on this device.</p>
    </>
  );
}
