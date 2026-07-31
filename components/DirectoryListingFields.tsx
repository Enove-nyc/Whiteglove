"use client";

import { DIRECTORY_CATEGORIES, DIRECTORY_FIELDS, type DirectoryDraft, type DirectoryFieldKey } from "@/lib/directory-fields";

/**
 * The boxes a directory listing is made of.
 *
 * The same component on the public form and in the admin, so somebody sending
 * in a listing fills in exactly what the owner would have typed. That is what
 * makes accepting it one press instead of a transcription job.
 */

export default function DirectoryListingFields({
  draft,
  onChange,
  disabled = false,
  /** What is published now, so an edit form can show what it is replacing. */
  current,
  idPrefix = "dir",
}: {
  draft: DirectoryDraft;
  onChange: (key: DirectoryFieldKey, value: string) => void;
  disabled?: boolean;
  current?: DirectoryDraft;
  idPrefix?: string;
}) {
  const input =
    "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none disabled:bg-stone-50";
  const caption = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {DIRECTORY_FIELDS.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = draft[field.key] ?? "";
        const now = current?.[field.key];
        return (
          <div key={field.key} className={field.wide ? "sm:col-span-2" : ""}>
            <label htmlFor={id} className="block">
              <span className={caption}>
                {field.label}
                {field.required && <span className="ml-1 text-[var(--gold)]">·</span>}
              </span>
              {field.type === "category" ? (
                <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(field.key, e.target.value)} className={input}>
                  <option value="">Choose one…</option>
                  {DIRECTORY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea id={id} rows={3} value={value} disabled={disabled} onChange={(e) => onChange(field.key, e.target.value)} className={input} />
              ) : (
                <input id={id} value={value} disabled={disabled} onChange={(e) => onChange(field.key, e.target.value)} className={input} />
              )}
            </label>
            {field.hint && <p className="mt-1 text-[11px] leading-4 text-stone-400">{field.hint}</p>}
            {/* On an edit form: what this box is replacing, when it differs. */}
            {now && now !== value && (
              <p className="mt-1 text-[11px] leading-4 text-stone-500">
                Currently: <span className="text-[var(--navy)]">{now}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
