"use client";

import { useActionState, useState } from "react";
import {
  MAX_DETAIL_CHARS,
  UPDATE_KIND_LABEL,
  emptyUpdate,
  hasExpired,
  isCurrent,
  updateProblem,
  type CurrentUpdate,
  type CurrentUpdateDraft,
  type UpdateKind,
} from "@/data/current-updates";
import SearchableSelect from "@/components/SearchableSelect";
import { deleteUpdateAction, publishUpdateAction, saveUpdateAction, type ActionResult } from "@/app/admin/updates/actions";
import { useOnActionSuccess } from "@/components/useOnActionSuccess";

/**
 * Writing a dated notice, in about as long as it takes to say it out loud.
 *
 * THE ONE THING THIS SCREEN INSISTS ON is the end date. Everything else can be
 * corrected later; a notice with no end date is the thing that turns a
 * destination page into a graveyard of last year's Pesach programmes, which is
 * worse than never having posted one. So it is a required field on the form
 * rather than a rule enforced only on save, and the state a row shows —
 * Live, Not yet, Ended — is worked out from today's date rather than a flag
 * somebody has to remember to flip.
 *
 * The source line is the owner's own note about where he knows it from, and
 * never leaves the admin: a source shown beside a claim reads as an
 * endorsement of whatever it points at. See AGENTS.md.
 */

const KINDS = Object.keys(UPDATE_KIND_LABEL) as UpdateKind[];

export default function CurrentUpdatesManager({
  updates,
  destinations,
  today,
  storeReady,
}: {
  updates: CurrentUpdate[];
  destinations: { slug: string; name: string }[];
  today: string;
  storeReady: boolean;
}) {
  const [saveState, save, saving] = useActionState(saveUpdateAction, null);
  const [publishState, publish, publishing] = useActionState(publishUpdateAction, null);
  const [deleteState, remove, deleting] = useActionState(deleteUpdateAction, null);
  const [editing, setEditing] = useState<CurrentUpdateDraft | null>(null);

  useOnActionSuccess([saveState], () => setEditing(null));

  const busy = saving || publishing || deleting;
  const message: ActionResult | null = saveState ?? publishState ?? deleteState;
  const problem = editing ? updateProblem(editing) : null;

  if (!storeReady) {
    return (
      <p className="mt-8 border border-[var(--gold-light)] bg-[#FAF8F3] px-4 py-3 text-sm leading-6 text-stone-600">
        The private store is not connected, so updates cannot be saved yet.
      </p>
    );
  }

  const field = "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]";
  const label = "block text-xs font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)]";

  function stateOf(update: CurrentUpdate): { text: string; tone: string } {
    if (!update.published) return { text: "Draft", tone: "border-stone-300 bg-stone-50 text-stone-600" };
    if (hasExpired(update, today)) return { text: "Ended", tone: "border-stone-300 bg-stone-100 text-stone-500" };
    if (isCurrent(update, today)) return { text: "Live", tone: "border-emerald-300 bg-emerald-50 text-emerald-800" };
    return { text: "Not yet", tone: "border-amber-300 bg-amber-50 text-amber-800" };
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setEditing(emptyUpdate())}
        className="inline-flex min-h-11 items-center rounded-full bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:opacity-90"
      >
        Add an update
      </button>

      {message && (
        <p className={`mt-4 text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.message}</p>
      )}

      {updates.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-[var(--gold-light)] bg-[#FAF8F3] p-5 text-sm leading-6 text-stone-600">
          Nothing current. Add one when something changes that a traveler would want to know before they go.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-[var(--gold-light)] rounded-lg border border-[var(--gold-light)]">
          {updates.map((update) => {
            const state = stateOf(update);
            const place = destinations.find((d) => d.slug === update.destinationSlug);
            return (
              <li key={update.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <button type="button" onClick={() => setEditing({ ...update })} className="w-full min-w-0 text-left sm:flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--navy)] underline decoration-[var(--gold-light)] decoration-2 underline-offset-4">
                      {update.title || "Untitled"}
                    </span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${state.tone}`}>
                      {state.text}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {UPDATE_KIND_LABEL[update.kind]} · {place?.name ?? (update.destinationSlug || "No destination")} ·{" "}
                    {update.startsOn} → {update.endsOn}
                  </span>
                  <span className="mt-1 block max-w-2xl text-xs leading-5 text-stone-500 line-clamp-2">{update.detail}</span>
                </button>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <form action={publish}>
                    <input type="hidden" name="id" value={update.id} />
                    {update.published && <input type="hidden" name="published" value="" />}
                    {!update.published && <input type="hidden" name="published" value="on" />}
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex min-h-11 items-center text-xs font-semibold text-emerald-800 underline disabled:opacity-50 sm:min-h-0"
                    >
                      {update.published ? "Take down" : "Publish"}
                    </button>
                  </form>
                  <form action={remove}>
                    <input type="hidden" name="id" value={update.id} />
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex min-h-11 items-center text-xs font-semibold text-red-700 underline disabled:opacity-50 sm:min-h-0"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <form action={save} className="mt-6 space-y-4 rounded-lg border border-[var(--gold)] bg-white p-5">
          <input type="hidden" name="id" value={editing.id ?? ""} />

          <label className="block">
            <span className={label}>What changed</span>
            <input
              name="title"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Pesach minyan at the Grand"
              className={field}
              autoFocus
            />
          </label>

          <label className="block">
            <span className={label}>What a traveler needs to know</span>
            <textarea
              name="detail"
              rows={3}
              value={editing.detail}
              onChange={(e) => setEditing({ ...editing, detail: e.target.value })}
              className={field}
            />
            <span className="mt-1 block text-xs text-stone-500">
              {editing.detail.trim().length}/{MAX_DETAIL_CHARS} — a notice, not an article.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Kind</span>
              <select
                name="kind"
                value={editing.kind}
                onChange={(e) => setEditing({ ...editing, kind: e.target.value as UpdateKind })}
                className={field}
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {UPDATE_KIND_LABEL[kind]}
                  </option>
                ))}
              </select>
            </label>
            <div className="block">
              {/* Hundreds of destinations: type the town rather than scrolling
                  for it. The value rides in a hidden field because the picker
                  is a combobox, not a form control. */}
              <label htmlFor="update-destination" className={label}>
                Destination
              </label>
              <SearchableSelect
                id="update-destination"
                value={editing.destinationSlug}
                onChange={(slug) => setEditing({ ...editing, destinationSlug: slug })}
                placeholder="Type a place — Rome, Vienna, Miami…"
                options={destinations.map((d) => ({ value: d.slug, label: d.name, keywords: d.slug }))}
              />
              <input type="hidden" name="destinationSlug" value={editing.destinationSlug} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Starts</span>
              <input
                type="date"
                name="startsOn"
                value={editing.startsOn}
                onChange={(e) => setEditing({ ...editing, startsOn: e.target.value })}
                className={field}
              />
            </label>
            <label className="block">
              {/* REQUIRED, and said so on the field rather than only on save. */}
              <span className={label}>Stops being true</span>
              <input
                type="date"
                name="endsOn"
                required
                value={editing.endsOn}
                onChange={(e) => setEditing({ ...editing, endsOn: e.target.value })}
                className={field}
              />
              <span className="mt-1 block text-xs text-stone-500">It disappears on its own after this.</span>
            </label>
          </div>

          <label className="block">
            <span className={label}>Where you know it from</span>
            <input
              name="source"
              value={editing.source}
              onChange={(e) => setEditing({ ...editing, source: e.target.value })}
              placeholder="Rang the hotel, 12 August"
              className={field}
            />
            <span className="mt-1 block text-xs text-stone-500">Your own note. Never shown to anybody.</span>
          </label>

          <label className="flex items-start gap-3 text-sm leading-6 text-stone-700">
            <input
              type="checkbox"
              name="published"
              checked={editing.published}
              onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              className="mt-1 size-4 shrink-0"
            />
            <span>
              <span className="font-semibold text-[var(--navy)]">Publish it</span> — shows on the destination page from
              the start date until it stops being true.
            </span>
          </label>

          {problem && <p className="text-sm font-semibold text-amber-800">{problem}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--gold-light)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
