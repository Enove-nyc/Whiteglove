"use client";

import { useState } from "react";

/**
 * Runs the one-off copy of uploaded files from the two old Railway hosts into
 * Netlify Blobs (app/api/admin/media-copy), a small batch at a time, and says
 * how far it has got. Safe to press again: files already copied are skipped.
 */
const SOURCES = [
  { id: "kosher", label: "Old Kosher Travel host" },
  { id: "itineraries", label: "Old Itineraries host" },
] as const;

type Progress = { copied: number; skipped: number; failed: number; done: boolean; error?: string };

export default function MoveFilesPanel() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Record<string, Progress>>({});

  async function run() {
    setRunning(true);
    for (const source of SOURCES) {
      let after = "";
      const tally: Progress = { copied: 0, skipped: 0, failed: 0, done: false };
      for (;;) {
        const response = await fetch("/api/admin/media-copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: source.id, after }),
        }).catch(() => null);
        const data = (await response?.json().catch(() => null)) as
          | { copied: number; skipped: number; failed: string[]; next: string | null; done: boolean; error?: string }
          | null;
        if (!response?.ok || !data) {
          tally.error = data?.error || "The copy stopped. Press the button again to carry on.";
          setProgress((all) => ({ ...all, [source.id]: { ...tally } }));
          break;
        }
        tally.copied += data.copied;
        tally.skipped += data.skipped;
        tally.failed += data.failed.length;
        if (data.done || !data.next) {
          tally.done = true;
          setProgress((all) => ({ ...all, [source.id]: { ...tally } }));
          break;
        }
        after = data.next;
        setProgress((all) => ({ ...all, [source.id]: { ...tally } }));
      }
    }
    setRunning(false);
  }

  return (
    <section className="border border-[var(--gold-light)] bg-white p-6">
      <p className="text-sm leading-6 text-stone-600">
        Copies every uploaded photo, document, voice note and video from the two old Railway hosts into this site&rsquo;s
        own file store. Run it once after the move, before the Railway services are shut down.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="mt-5 min-h-11 rounded-md bg-[var(--navy)] px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {running ? "Copying…" : "Copy files from the old hosts"}
      </button>
      <ul className="mt-5 space-y-2 text-sm text-stone-700">
        {SOURCES.map((source) => {
          const p = progress[source.id];
          if (!p) return null;
          return (
            <li key={source.id}>
              <span className="font-semibold text-[var(--navy)]">{source.label}:</span> {p.copied} copied, {p.skipped} already here
              {p.failed ? `, ${p.failed} could not be copied` : ""}
              {p.done ? " — done." : p.error ? ` — ${p.error}` : "…"}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
