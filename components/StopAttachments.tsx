"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { ItinAttachment } from "@/data/itinerary";
import {
  ALLOWED_TYPES,
  ATTACHMENT_KINDS,
  KIND_LABELS,
  MAX_ATTACHMENT_BYTES,
  MAX_PER_ITEM,
  type AttachmentKind,
  dataUrlBytes,
  describeSize,
  opensInTheBrowser,
} from "@/lib/attachments";
import { PreviewDialog } from "@/components/PreviewDialog";

const photoTypes = Object.keys(ALLOWED_TYPES).filter((type) => type.startsWith("image/")).join(",");

async function encodePhoto(file: File): Promise<string> {
  if (!photoTypes.split(",").includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP photo.");
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare that photo.");
    for (const maxSide of [1600, 1200, 900, 600]) {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      if (dataUrlBytes(dataUrl) <= MAX_ATTACHMENT_BYTES) return dataUrl;
    }
    throw new Error("Could not make that photo small enough. Try a smaller picture.");
  } finally {
    image.close();
  }
}

const smallButton =
  "inline-flex min-h-11 items-center rounded-full border border-[var(--gold-light)] bg-white px-3.5 text-xs font-bold text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)] disabled:opacity-60";

export default function StopAttachments({
  attachments = [],
  signedIn,
  onChange,
  allowPhotos = false,
}: {
  attachments?: ItinAttachment[];
  signedIn: boolean;
  allowPhotos?: boolean;
  onChange: (next: ItinAttachment[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<AttachmentKind>("boarding-pass");
  const fileRef = useRef<HTMLInputElement>(null);
  const kindId = useId();

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      // Read in the browser and post as a data URL, the same way a picture is
      // sent in. The size is checked again on the server from the data itself.
      const dataUrl = kind === "photo" ? await encodePhoto(file) : await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/account/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: kind === "photo" ? file.name.replace(/\.[^.]+$/, "") + ".jpg" : file.name, kind, dataUrl, existingCount: attachments.length }),
      });
      const data = (await res.json().catch(() => null)) as { attachment?: ItinAttachment; error?: string } | null;
      if (!res.ok || !data?.attachment) {
        setError(data?.error ?? "Could not keep that file. Try again.");
        return;
      }
      onChange([...attachments, data.attachment]);
      setOpen(false);
    } catch (cause) {
      setError(kind === "photo" && cause instanceof Error ? cause.message : "Could not read that file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/account/attachments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not take that off.");
        return;
      }
      onChange(attachments.filter((a) => a.id !== id));
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-[var(--gold-light)] pt-3">
      {attachments.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {attachments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <a
                href={`/api/account/attachments?id=${encodeURIComponent(a.id)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
              >
                {a.kind === "photo" && a.contentType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- authenticated attachment URL
                  <img src={`/api/account/attachments?id=${encodeURIComponent(a.id)}`} alt="" loading="lazy" className="mb-1 aspect-[4/3] w-28 rounded object-cover" />
                ) : <span aria-hidden="true">📎</span>} {KIND_LABELS[a.kind as AttachmentKind]?.label ?? "File"} — {a.name}
              </a>
              <span className="flex items-center gap-2 text-stone-400">
                <span>{describeSize(a.bytes)}</span>
                {/* Look at it without leaving the trip. Only a photo or a PDF
                    has anything to show in a panel; anything else keeps its
                    download link and no eye. */}
                {opensInTheBrowser(a.contentType) && (
                  <PreviewDialog label={`Preview ${a.name}`} title={a.name}>
                    {a.contentType.startsWith("image/") ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- an
                         account-scoped attachment served by our own route, not a
                         fixed-size asset next/image can optimise. */
                      <img
                        src={`/api/account/attachments?id=${encodeURIComponent(a.id)}`}
                        alt={a.name}
                        className="mx-auto max-h-[70vh] w-auto max-w-full"
                      />
                    ) : (
                      <object
                        data={`/api/account/attachments?id=${encodeURIComponent(a.id)}`}
                        type="application/pdf"
                        aria-label={a.name}
                        className="h-[70vh] w-full"
                      >
                        <p className="text-sm leading-6 text-stone-600">
                          This browser will not show the PDF here.{" "}
                          <a
                            href={`/api/account/attachments?id=${encodeURIComponent(a.id)}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="font-semibold underline"
                          >
                            Open it in a new tab
                          </a>
                          .
                        </p>
                      </object>
                    )}
                  </PreviewDialog>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(a.id)}
                  className="text-stone-400 transition hover:text-red-700 disabled:opacity-60"
                >
                  Take off
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <div className="flex flex-wrap gap-2">
          {allowPhotos && (
            <button type="button" className={smallButton} disabled={busy} onClick={() => { setKind("photo"); setOpen(true); }}>
              Add photo
            </button>
          )}
          <button type="button" className={smallButton} disabled={busy} onClick={() => { setKind("boarding-pass"); setOpen(true); }}>
            Add document
          </button>
        </div>
      ) : !signedIn ? (
        <p className="text-xs leading-5 text-stone-600">
          Sign in to save photos and documents with your trip.{" "}
          <Link href="/login" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
            Sign in
          </Link>
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={kindId}>
              Kind of file
            </label>
            <select
              id={kindId}
              disabled={busy}
              value={kind}
              onChange={(e) => setKind(e.target.value as AttachmentKind)}
              className="min-h-11 rounded-md border border-[var(--gold-light)] bg-white px-2 text-xs text-[var(--navy)]"
            >
              {ATTACHMENT_KINDS.filter((value) => allowPhotos || value !== "photo").map((value) => (
                <option key={value} value={value}>
                  {KIND_LABELS[value].label}
                </option>
              ))}
            </select>
            <input
              ref={fileRef}
              type="file"
              aria-label={kind === "photo" ? "Choose a photo" : "Choose a document"}
              accept={kind === "photo" ? photoTypes : Object.keys(ALLOWED_TYPES).join(",")}
              disabled={busy || attachments.length >= MAX_PER_ITEM}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
              className="text-xs text-stone-600 file:mr-2 file:min-h-11 file:rounded-full file:border file:border-[var(--gold-light)] file:bg-white file:px-3.5 file:text-xs file:font-bold file:text-[var(--navy)]"
            />
            <button type="button" disabled={busy} onClick={() => { setOpen(false); setError(""); }} className={smallButton}>
              Cancel
            </button>
          </div>
          <p className="text-xs leading-5 text-stone-500">
            {KIND_LABELS[kind].hint} {kind === "photo" ? "JPEG, PNG or WebP photos are resized for the itinerary." : `PDF or a picture, up to ${describeSize(MAX_ATTACHMENT_BYTES)}.`} Files added here are private.{" "}
            <strong className="font-semibold text-stone-600">Not for passports or identity documents.</strong>
          </p>
          {busy && <p className="text-xs font-semibold text-[var(--navy)]">Keeping it…</p>}
        </div>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}
