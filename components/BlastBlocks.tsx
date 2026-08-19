"use client";

import { useRef, useState } from "react";
import {
  BLAST_BLOCK_KINDS,
  BLAST_BLOCK_LABELS,
  type BlastBlock,
  type BlastBlockKind,
  emptyBlastBlock,
  MAX_BLOCKS,
  MAX_BODY,
  MAX_BUTTON_LABEL,
  MAX_CAPTION,
  MAX_HEADING,
} from "@/lib/email-blast";

/**
 * Building the message out of pieces.
 *
 * SHAPED LIKE THE PAGE EDITOR ON PURPOSE. The owner already edits his own pages
 * as a stack of sections he can add, move and take away — components/BlockEditor
 * — and a second, different way of doing the same thing on another screen is a
 * second thing to learn. Same idea, same buttons, same words.
 *
 * NO FONT PICKER, NO COLOURS, NO COLUMNS. Every one of those is a way to make a
 * message that renders differently in Outlook from the screen it was written
 * on, and the moment an email has them it starts looking like a template
 * somebody bought rather than a letter from this site.
 */

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";
const smallButton =
  "min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)] disabled:opacity-30";

/** Comfortably inside what the media store will take once base64 grows it. */
const MAX_IMAGE_BYTES = 600 * 1024;

function Fields({
  block,
  onChange,
}: {
  block: BlastBlock;
  onChange: (next: BlastBlock) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState("");

  async function pickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || block.kind !== "image") return;
    setUploadNote("");
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadNote(`That picture is ${Math.round(file.size / 1024)}KB. Keep it under ${Math.round(MAX_IMAGE_BYTES / 1024)}KB.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
    if (!dataUrl) {
      setUploading(false);
      setUploadNote("Could not read that file.");
      return;
    }
    try {
      // The same upload the advertisements use. One store, one route, one place
      // where the size and type rules live.
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setUploadNote(data.error || "That upload did not work. Try a smaller file.");
        return;
      }
      onChange({ ...block, url: data.url });
      setUploadNote("Picture added.");
    } catch {
      setUploadNote("That upload did not work. Check the connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  switch (block.kind) {
    case "heading":
      return (
        <label className="block">
          <span className={captionClass}>The heading</span>
          <input
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            maxLength={MAX_HEADING}
            placeholder="Pesach in the Dolomites"
            className={inputClass}
          />
        </label>
      );

    case "text":
      return (
        <label className="block">
          <span className={captionClass}>The words</span>
          <textarea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            rows={6}
            maxLength={MAX_BODY}
            placeholder={"Write it the way you would write to one person.\n\nA blank line starts a new paragraph. Paste a web address and it becomes a link."}
            className={inputClass}
          />
        </label>
      );

    case "image":
      return (
        <div className="grid gap-4">
          <div>
            <span className={captionClass}>The picture</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={pickImage}
              disabled={uploading}
              className="mt-1.5 block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border file:border-[var(--gold-light)] file:bg-white file:px-4 file:py-2.5 file:text-xs file:font-bold file:uppercase file:tracking-[0.12em] file:text-[var(--navy)]"
            />
            <p className="mt-1.5 text-xs leading-5 text-stone-500">
              Under {Math.round(MAX_IMAGE_BYTES / 1024)}KB. A wide picture reads better than a tall one — it will be
              shown at full width, about 520 pixels across.
            </p>
            {uploadNote && <p className="mt-1 text-xs font-semibold text-[var(--gold-ink)]">{uploadNote}</p>}
            {block.url && (
              // eslint-disable-next-line @next/next/no-img-element -- an uploaded blob from /api/media
              <img src={block.url} alt="" className="mt-3 max-h-40 w-auto rounded-md border border-[var(--gold-light)]" />
            )}
          </div>
          <label className="block">
            <span className={captionClass}>What it shows, in a few words</span>
            <input
              value={block.alt}
              onChange={(e) => onChange({ ...block, alt: e.target.value })}
              maxLength={MAX_CAPTION}
              placeholder="The main shul in Vienna"
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-stone-500">
              Read out instead of the picture by anybody whose email does not show images — which on a phone is a lot
              of people. Not optional.
            </span>
          </label>
          <label className="block">
            <span className={captionClass}>Caption under it (optional)</span>
            <input
              value={block.caption}
              onChange={(e) => onChange({ ...block, caption: e.target.value })}
              maxLength={MAX_CAPTION}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={captionClass}>Where it goes when pressed (optional)</span>
            <input
              value={block.href}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
              placeholder="https://www.whiteglovekoshertravel.com/destinations/vienna"
              className={inputClass}
            />
          </label>
        </div>
      );

    case "button":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={captionClass}>What it says</span>
            <input
              value={block.label}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
              maxLength={MAX_BUTTON_LABEL}
              placeholder="See the programme"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={captionClass}>Where it goes</span>
            <input
              value={block.href}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
              placeholder="https://www.whiteglovekoshertravel.com/…"
              className={inputClass}
            />
          </label>
        </div>
      );

    case "divider":
      return <p className="text-sm leading-6 text-stone-500">A gold line across the message. Nothing to fill in.</p>;
  }
}

export default function BlastBlocks({
  blocks,
  onChange,
}: {
  blocks: BlastBlock[];
  onChange: (next: BlastBlock[]) => void;
}) {
  const patch = (index: number, next: BlastBlock) => onChange(blocks.map((b, i) => (i === index ? next : b)));
  const move = (index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {blocks.length === 0 && (
        <p className="rounded-md border border-dashed border-[var(--gold-light)] p-5 text-sm leading-6 text-stone-500">
          Nothing in the message yet. Start with some words, and add a picture or a button where it helps.
        </p>
      )}

      {blocks.map((block, index) => (
        <div key={index} className="rounded-lg border border-[var(--gold-light)] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--navy)]">{BLAST_BLOCK_LABELS[block.kind].label}</p>
              <p className="text-xs text-stone-500">{BLAST_BLOCK_LABELS[block.kind].detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className={smallButton}>
                Up
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === blocks.length - 1}
                className={smallButton}
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => onChange(blocks.filter((_, i) => i !== index))}
                className="min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-400 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="mt-4">
            <Fields block={block} onChange={(next) => patch(index, next)} />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {BLAST_BLOCK_KINDS.map((kind: BlastBlockKind) => (
          <button
            key={kind}
            type="button"
            disabled={blocks.length >= MAX_BLOCKS}
            onClick={() => onChange([...blocks, emptyBlastBlock(kind)])}
            className={smallButton}
          >
            + {BLAST_BLOCK_LABELS[kind].label}
          </button>
        ))}
      </div>
    </div>
  );
}
