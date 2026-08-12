"use client";

import { useActionState } from "react";
import { adminSendFollowup } from "@/app/admin/alerts/actions";
import { ALERT_TOPIC_LABELS, ALERT_TOPICS } from "@/lib/email-alerts";

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-base text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)] sm:text-sm";

/**
 * Send a follow-up to people who asked for a topic.
 *
 * The words have to be written here. An empty subject or body is refused on
 * the server, so this form cannot become a generated blast.
 */
export default function AlertFollowupForm() {
  const [state, act, busy] = useActionState(adminSendFollowup, null);

  return (
    <form action={act} className="mt-4 space-y-4">
      <label className="block text-sm font-semibold text-[var(--navy)]">
        Topic they asked for
        <select name="topic" className={inputClass} defaultValue="pesach_sukkos" required>
          {ALERT_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {ALERT_TOPIC_LABELS[topic]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-[var(--navy)]">
        Destination slug, if this is about one place
        <input name="destinationSlug" className={inputClass} placeholder="rome" autoComplete="off" />
      </label>
      <label className="block text-sm font-semibold text-[var(--navy)]">
        Link on this site
        <input name="href" className={inputClass} placeholder="/collections/seasonal-programmes" autoComplete="off" />
      </label>
      <label className="block text-sm font-semibold text-[var(--navy)]">
        Subject
        <input name="subject" className={inputClass} required />
      </label>
      <label className="block text-sm font-semibold text-[var(--navy)]">
        What happened
        <textarea name="body" rows={5} className={inputClass} required />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send to the people who asked"}
      </button>
      {state && (
        <p role="status" className={`text-sm ${state.ok ? "text-stone-600" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
