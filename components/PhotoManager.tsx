"use client";

import { useActionState, useState } from "react";
import type { Photo } from "@prisma/client";
import { type ActionResult, deletePhotoAction, savePhotoAction } from "@/app/admin/destinations/actions";

/**
 * Pictures for a destination.
 *
 * The schema has held photos since the July migration and nothing could put
 * one there — the completeness tracker counted them as missing on every record
 * and always would have.
 *
 * CREDIT IS THE POINT, not decoration. A photograph belongs to whoever took
 * it, and the site cannot publish one on the strength of having found it. So a
 * picture with no credit is saved as a draft rather than refused: upload it,
 * find out whose it is, then publish. The server enforces that too, because
 * this screen can be skipped.
 */

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function PhotoManager({ destinationId, slug, photos }: {
  destinationId: string;
  slug: string;
  photos: Photo[];
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState("");
  const [pending, setPending] = useState("");

  // The same upload the advertisement wizard uses: the file goes to
  // /api/admin/media and comes back as a URL this row then points at.
  async function upload(file: File) {
    setUploading(true);
    setUploadNote("");
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
    if (!dataUrl) {
      setUploading(false);
      setUploadNote("Could not read that file.");
      return;
    }
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setUploadNote(data.error || "That upload did not work. Try a smaller picture.");
        return;
      }
      setPending(data.url);
      setUploadNote("Added below — give it a credit before publishing it.");
    } catch {
      setUploadNote("That upload did not work. Check the connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Pictures</p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">What this place looks like</h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-stone-600">
            A picture goes on the page only once it has a credit. Whoever took it owns it, and &ldquo;found online&rdquo;
            is not permission.
          </p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]">
          {uploading ? "Adding…" : "Add a picture"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {uploadNote && <p className="mt-2 text-sm font-semibold text-[var(--navy)]">{uploadNote}</p>}

      {pending && (
        <PhotoRow key={pending} destinationId={destinationId} slug={slug} url={pending} onDone={() => setPending("")} />
      )}

      <div className="mt-5 space-y-4">
        {photos.length === 0 && !pending ? (
          <p className="border border-dashed border-[var(--gold-light)] p-6 text-center text-sm text-stone-500">
            No pictures yet.
          </p>
        ) : (
          photos.map((photo) => <PhotoRow key={photo.id} destinationId={destinationId} slug={slug} photo={photo} />)
        )}
      </div>
    </section>
  );
}

function PhotoRow({ destinationId, slug, photo, url, onDone }: {
  destinationId: string;
  slug: string;
  photo?: Photo;
  url?: string;
  onDone?: () => void;
}) {
  const [state, action, busy] = useActionState<ActionResult | null, FormData>(async (prev, data) => {
    const result = await savePhotoAction(prev, data);
    if (result.ok) onDone?.();
    return result;
  }, null);
  const [delState, delAction, delBusy] = useActionState<ActionResult | null, FormData>(deletePhotoAction, null);
  const src = photo?.url ?? url ?? "";

  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
      <div className="flex flex-wrap gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- the picture is
            an uploaded blob served from /api/media; next/image cannot optimise
            it and would only add a second fetch. */}
        <img src={src} alt={photo?.caption ?? ""} className="h-28 w-40 shrink-0 border border-[var(--gold-light)] object-cover" />
        <form action={action} className="min-w-0 flex-1">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="destinationId" value={destinationId} />
          {photo && <input type="hidden" name="photoId" value={photo.id} />}
          {!photo && <input type="hidden" name="url" value={src} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={captionClass}>Caption</span>
              <input name="caption" defaultValue={photo?.caption ?? ""} className={inputClass} placeholder="What this shows" />
            </label>
            <label className="block">
              <span className={captionClass}>Credit — who it belongs to</span>
              <input name="credit" defaultValue={photo?.credit ?? ""} className={inputClass} placeholder="Who took it" />
            </label>
            <label className="block">
              <span className={captionClass}>Where it came from</span>
              <input name="sourceUrl" defaultValue={photo?.sourceUrl ?? ""} className={inputClass} placeholder="A link, or who sent it" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="block">
              <span className="sr-only">Visibility</span>
              <select name="status" defaultValue={photo?.status ?? "DRAFT"} className="min-h-11 border border-[var(--gold-light)] bg-white px-3 text-sm text-[var(--navy)]">
                <option value="DRAFT">Draft — not on the site</option>
                <option value="PUBLISHED">Published — on the site</option>
              </select>
            </label>
            <button type="submit" disabled={busy} className="min-h-11 border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60">
              {busy ? "Saving…" : "Save"}
            </button>
            {state && <span className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>}
          </div>
        </form>
      </div>
      {photo && (
        <form action={delAction} className="mt-3 border-t border-[var(--gold-light)] pt-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="photoId" value={photo.id} />
          <button type="submit" disabled={delBusy} className="text-xs font-bold uppercase tracking-[0.12em] text-red-700 underline decoration-red-300 underline-offset-4 disabled:opacity-60">
            {delBusy ? "Removing…" : "Remove this picture"}
          </button>
          {delState && <span className="ml-3 text-sm text-stone-600">{delState.message}</span>}
        </form>
      )}
    </div>
  );
}
