"use client";

import { useActionState, useState } from "react";
import { useOnValueChange } from "@/components/useOnValueChange";
import { useOnActionSuccess } from "@/components/useOnActionSuccess";
import { useFocusTrap } from "@/components/useFocusTrap";
import { removeTeamMemberAction, saveTeamMemberAction, type ActionResult } from "@/app/admin/team/actions";
import { ADMIN_AREAS, AREA_LABELS, describeAreas, grantedAreas } from "@/lib/admin-permissions";
import type { TeamMember } from "@/lib/admin-roles";

/**
 * Who may get into the admin — as a list you press into.
 *
 * Changing what someone could do used to mean retyping their email into a
 * form at the bottom so the save would match and replace them; the list
 * itself only let you remove a person. Now each teammate is pressable and
 * opens a pop-up filled with what they can do now, where the same form
 * narrows their access, widens it, or takes it away. "Give access" opens the
 * pop-up empty. The email is still the match key, so editing keeps it fixed.
 */

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)] disabled:bg-[#f4f1ea] disabled:text-stone-500";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";
const submitClass =
  "min-h-[44px] border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60";
const addButtonClass =
  "min-h-11 border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-50";

function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <p role="status" className={`mt-3 text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
      {state.message}
    </p>
  );
}

export default function TeamEditor({ members, storageReady }: { members: TeamMember[]; storageReady: boolean }) {
  const [saveState, saveAction, savePending] = useActionState<ActionResult | null, FormData>(saveTeamMemberAction, null);
  const [removeState, removeAction] = useActionState<ActionResult | null, FormData>(removeTeamMemberAction, null);
  // null = closed; "new" = giving access; a member = editing them.
  const [editing, setEditing] = useState<TeamMember | "new" | null>(null);
  const [adminChecked, setAdminChecked] = useState(false);
  const dialogRef = useFocusTrap<HTMLDivElement>(Boolean(editing), () => setEditing(null));

  const member = editing === "new" ? null : editing;

  // Opening the pop-up seeds the "run the admin area" tick from the person
  // being edited, so the areas list appears already reflecting what they hold.
  useOnValueChange(member, () => setAdminChecked(member ? member.admin : false));

  useOnActionSuccess([saveState, removeState], () => setEditing(null));

  const granted = member ? grantedAreas(member.areas) : null; // null = all areas
  const areaChecked = (area: string) => (member ? granted === null || granted.includes(area as (typeof ADMIN_AREAS)[number]) : true);

  return (
    <div className="space-y-8">
      {!storageReady && (
        <p className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Giving other people access needs the private store connected. Until then you are the only person who can get
          in, which is safe — nothing is broken.
        </p>
      )}

      <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Who has access</h2>
          <button type="button" onClick={() => setEditing("new")} disabled={!storageReady} className={addButtonClass}>
            Give access
          </button>
        </div>

        {members.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-[var(--gold-light)] bg-white p-5 text-sm leading-6 text-stone-600">
            Nobody yet. You are the only one who can get in.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--gold-light)] rounded-lg border border-[var(--gold-light)] bg-white">
            {members.map((m) => {
              const detail = (
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[var(--navy)]">
                    {m.name ? `${m.name} · ` : ""}
                    {m.email}
                  </span>
                  <span className="mt-1 block text-sm text-stone-600">
                    {m.owner
                      ? "You — full access, and it cannot be taken away here."
                      : [m.admin ? "Can run the admin area" : null, m.siteAccess && !m.admin ? "Can see the site while it is closed" : null]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                  {!m.owner && m.admin && (
                    <span className="mt-1 block text-sm text-stone-500">{describeAreas(grantedAreas(m.areas))}</span>
                  )}
                  {m.note && <span className="mt-1 block text-sm text-stone-500">{m.note}</span>}
                </span>
              );
              return (
                <li key={m.email}>
                  {m.owner ? (
                    <div className="flex w-full items-start justify-between gap-4 px-4 py-3">
                      {detail}
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">You</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(m)}
                      className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#fcfaf6]"
                    >
                      {detail}
                      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)]">Edit</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Status state={removeState} />
      </section>

      {editing && (
        <div
          className="fixed inset-0 z-[var(--wg-z-modal,200)] flex items-end justify-center bg-[var(--navy)]/50 p-4 backdrop-blur-[2px] sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-modal-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--gold-light)] bg-white p-6 shadow-[0_24px_60px_rgba(23,45,82,.20)] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 id="team-modal-title" className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
                {member ? "Edit access" : "Give someone access"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 transition hover:text-[var(--navy)]"
              >
                Close
              </button>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              They need a White Glove account with this email address — they sign in normally and their access follows
              their account.
            </p>

            <form action={saveAction} key={member?.email ?? "new"} className="mt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={captionClass}>Their email *</span>
                  <input
                    name="email"
                    type="email"
                    required
                    readOnly={Boolean(member)}
                    defaultValue={member?.email ?? ""}
                    className={inputClass}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="block">
                  <span className={captionClass}>Their name</span>
                  <input name="name" defaultValue={member?.name ?? ""} className={inputClass} placeholder="So you remember who it is" />
                </label>
              </div>

              <fieldset className="mt-5">
                <legend className={captionClass}>What may they do?</legend>
                <label className="mt-3 flex items-start gap-3 border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
                  <input type="checkbox" name="siteAccess" defaultChecked={member ? member.siteAccess : true} className="mt-1 h-4 w-4 accent-[var(--navy)]" />
                  <span>
                    <span className="block font-semibold text-[var(--navy)]">See the site while it is closed</span>
                    <span className="block text-sm text-stone-600">
                      They can browse the website when the public cannot, without being told the shared password.
                    </span>
                  </span>
                </label>
                <label className="mt-3 flex items-start gap-3 border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
                  <input
                    type="checkbox"
                    name="admin"
                    checked={adminChecked}
                    onChange={(e) => setAdminChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--navy)]"
                  />
                  <span>
                    <span className="block font-semibold text-[var(--navy)]">Run the admin area</span>
                    <span className="block text-sm text-stone-600">
                      They can sign in and change the site. Choose below which parts — somebody helping with kevarim does
                      not need your finances or your passwords.
                    </span>
                  </span>
                </label>
              </fieldset>

              {adminChecked && (
                <fieldset className="mt-5 border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
                  <legend className={captionClass}>Which parts of the admin?</legend>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Untick anything they should not reach. Leave all five ticked and they can do everything you can,
                    except taking away your own access.
                  </p>
                  <div className="mt-3 space-y-2">
                    {ADMIN_AREAS.map((area) => (
                      <label key={area} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="areas"
                          value={area}
                          defaultChecked={areaChecked(area)}
                          className="mt-1 h-4 w-4 accent-[var(--navy)]"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-[var(--navy)]">{AREA_LABELS[area].label}</span>
                          <span className="block text-sm text-stone-600">{AREA_LABELS[area].blurb}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <label className="mt-5 block">
                <span className={captionClass}>Note to yourself</span>
                <input name="note" defaultValue={member?.note ?? ""} className={inputClass} placeholder="Why they have access, when to review it" />
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="submit" disabled={savePending || !storageReady} className={submitClass}>
                  {savePending ? "Saving…" : member ? "Save changes" : "Give access"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="min-h-[44px] px-4 text-xs font-bold uppercase tracking-[0.12em] text-stone-500 transition hover:text-[var(--navy)]"
                >
                  Cancel
                </button>
                {saveState && !saveState.ok && <span className="text-sm font-semibold text-red-700">{saveState.message}</span>}
              </div>
            </form>

            {member && (
              <form
                action={removeAction}
                onSubmit={(event) => {
                  if (!window.confirm(`Take away ${member.email}'s access?`)) event.preventDefault();
                }}
                className="mt-4 border-t border-[var(--gold-light)] pt-4"
              >
                <input type="hidden" name="email" value={member.email} />
                <button type="submit" className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-700 underline">
                  Remove — take away their access
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
