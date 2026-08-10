"use client";

import { useActionState, useState } from "react";
import type { CaseStudy } from "@/data/case-studies";
import { caseStudyCompleteness } from "@/data/case-studies";
import { deleteCaseStudyAction, saveCaseStudyAction } from "@/app/admin/settings/proof/actions";

const input =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";

function emptyDraft(): {
  id: string;
  attribution: string;
  anonymised: boolean;
  tripRequest: string;
  whatSolved: string;
  outcome: string;
  permissionRecorded: boolean;
  approved: boolean;
} {
  return {
    id: "",
    attribution: "",
    anonymised: false,
    tripRequest: "",
    whatSolved: "",
    outcome: "",
    permissionRecorded: false,
    approved: false,
  };
}

/**
 * Genuine case studies only. Nothing is seeded. Incomplete / unpermitted /
 * unapproved records never reach the public site.
 */
export default function CaseStudiesForm({
  studies,
  storeReady,
}: {
  studies: CaseStudy[];
  storeReady: boolean;
}) {
  const [saveState, save, saving] = useActionState(saveCaseStudyAction, null);
  const [deleteState, del, deleting] = useActionState(deleteCaseStudyAction, null);
  const [draft, setDraft] = useState(emptyDraft());

  const completeness = caseStudyCompleteness(draft);

  if (!storeReady) {
    return (
      <p className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-stone-600">
        The private store is not connected. Case studies cannot be saved yet — and nothing invented is shown publicly.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      <section className="border border-[var(--gold-light)] bg-white p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
          {draft.id ? "Edit case study" : "Add a case study"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Only publish what a real client permitted. This is not the sample itinerary. Approval is refused until trip
          request, what you solved, outcome, and permission are all filled in.
        </p>

        <form
          action={save}
          className="mt-6 space-y-4"
          onSubmit={() => {
            /* values come from controlled inputs via name= */
          }}
        >
          <input type="hidden" name="id" value={draft.id} />
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Attribution</span>
            <input
              name="attribution"
              className={input}
              value={draft.attribution}
              onChange={(e) => setDraft((d) => ({ ...d, attribution: e.target.value }))}
              placeholder="Name they agreed to, or “A family from Manchester”"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="anonymised"
              checked={draft.anonymised}
              onChange={(e) => setDraft((d) => ({ ...d, anonymised: e.target.checked }))}
            />
            Anonymised (name withheld on the public page)
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Trip request</span>
            <textarea
              name="tripRequest"
              rows={3}
              className={input}
              value={draft.tripRequest}
              onChange={(e) => setDraft((d) => ({ ...d, tripRequest: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">What White Glove solved</span>
            <textarea
              name="whatSolved"
              rows={3}
              className={input}
              value={draft.whatSolved}
              onChange={(e) => setDraft((d) => ({ ...d, whatSolved: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Outcome</span>
            <textarea
              name="outcome"
              rows={3}
              className={input}
              value={draft.outcome}
              onChange={(e) => setDraft((d) => ({ ...d, outcome: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="permissionRecorded"
              checked={draft.permissionRecorded}
              onChange={(e) => setDraft((d) => ({ ...d, permissionRecorded: e.target.checked }))}
            />
            I have permission to publish this
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="approved"
              checked={draft.approved}
              onChange={(e) => setDraft((d) => ({ ...d, approved: e.target.checked }))}
              disabled={Boolean(completeness)}
            />
            Approve for the public site
            {completeness && <span className="text-xs text-stone-500">— {completeness}</span>}
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {draft.id && (
              <button
                type="button"
                className="text-xs font-semibold text-stone-600 underline"
                onClick={() => setDraft(emptyDraft())}
              >
                Clear form
              </button>
            )}
            {saveState && (
              <span className={`text-sm font-semibold ${saveState.ok ? "text-emerald-700" : "text-red-700"}`}>
                {saveState.message}
              </span>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Saved studies</h2>
        {studies.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">None yet — and that is correct. Do not invent any.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {studies.map((study) => (
              <li key={study.id} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-[var(--navy)]">{study.attribution}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    {study.approved && !caseStudyCompleteness(study) ? "Public" : "Draft — not public"}
                  </p>
                </div>
                <p className="mt-2 text-sm text-stone-600 line-clamp-2">{study.tripRequest}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--navy)] underline"
                    onClick={() =>
                      setDraft({
                        id: study.id,
                        attribution: study.attribution,
                        anonymised: study.anonymised,
                        tripRequest: study.tripRequest,
                        whatSolved: study.whatSolved,
                        outcome: study.outcome,
                        permissionRecorded: study.permissionRecorded,
                        approved: study.approved,
                      })
                    }
                  >
                    Edit
                  </button>
                  <form action={del}>
                    <input type="hidden" name="id" value={study.id} />
                    <button type="submit" disabled={deleting} className="text-xs font-semibold text-red-700 underline disabled:opacity-50">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        {deleteState && (
          <p className={`mt-3 text-sm font-semibold ${deleteState.ok ? "text-emerald-700" : "text-red-700"}`}>
            {deleteState.message}
          </p>
        )}
      </section>
    </div>
  );
}
