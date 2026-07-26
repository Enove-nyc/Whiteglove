"use client";

import { useActionState } from "react";
import { type ActionResult, savePageAction } from "@/app/admin/pages/actions";

type EditablePage = {
  slug: string;
  eyebrow: string;
  title: string;
  body: string;
  status: string;
  stored: boolean;
};

const STATUSES: Array<[string, string]> = [
  ["PUBLISHED", "Published — visible on the site"],
  ["DRAFT", "Draft — page shows the built-in default"],
  ["NEEDS_REVIEW", "Needs review — page shows the built-in default"],
];

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function PageEditor({ page }: { page: EditablePage }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(savePageAction, null);

  return (
    <form action={action} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <input type="hidden" name="slug" value={page.slug} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">{page.eyebrow}</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Edit “{page.title}”</h2>
        </div>
        <a
          href={`/${page.slug}`}
          target="_blank"
          rel="noreferrer"
          className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
        >
          View page ↗
        </a>
      </div>

      <p className="mt-3 text-xs leading-5 text-stone-500">
        The small kicker (“{page.eyebrow}”) and decorative Yiddish heading stay in the design. You edit the heading and the intro text below.
      </p>

      <label className="mt-5 block">
        <span className={captionClass}>Heading</span>
        <input name="title" defaultValue={page.title} className={inputClass} required />
      </label>

      <label className="mt-4 block">
        <span className={captionClass}>Intro text</span>
        <textarea name="body" defaultValue={page.body} rows={6} className={inputClass} />
        <span className="mt-1.5 block text-[11px] leading-4 text-stone-400">
          Blank lines separate paragraphs. Start a line with “## ” for a subheading or “- ” for a bullet point.
        </span>
      </label>

      <label className="mt-4 block">
        <span className={captionClass}>Visibility</span>
        <select name="status" defaultValue={page.status} className={inputClass}>
          {STATUSES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save page"}
        </button>
        {state && (
          <span className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
