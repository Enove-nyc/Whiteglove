import { CHECKS, NOT_CHECKED, type HealthState } from "@/lib/health-checks";

/**
 * What was actually working, last time anything asked.
 *
 * The list beside this one says whether a variable has a value in it. That is
 * all it can say, and it says so — but a key that expired last Tuesday still
 * has a value, and reads as "set" forever. This is the other half: a read
 * against each service, run nightly, with the answer and when it was obtained.
 *
 * WHAT IS NOT CHECKED IS NAMED. Four green ticks above six unmentioned
 * services is the same lie as a variable that is set and not working — it
 * reads as "everything is fine". The ones billed per request are listed with
 * the reason, and the test buttons on this screen are how to ask them.
 */

function ago(at: string): string {
  const when = Date.parse(at);
  if (!Number.isFinite(when)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - when) / 60_000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export default function HealthPanel({ state }: { state: HealthState }) {
  const anyRun = CHECKS.some((check) => state[check.id]);

  return (
    <section aria-labelledby="health-heading" className="border border-[var(--gold)] bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Actually working</p>
      <h2 id="health-heading" className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
        {anyRun ? "Checked overnight" : "Not checked yet"}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        {anyRun
          ? "A real read against each of these every night. You are emailed the night one stops working, and the night it comes back — never nightly, or you would stop reading it."
          : "These are checked every night from tonight. Until the first run there is nothing to show, which is not the same as nothing being wrong."}
      </p>

      <ul className="mt-5 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
        {CHECKS.map((check) => {
          const result = state[check.id];
          return (
            <li key={check.id} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="font-semibold text-[var(--navy)]">{check.what}</span>
                <span className="block text-sm leading-6 text-stone-600">
                  {result ? result.detail : "Not checked yet."}
                </span>
                {result && !result.ok && <span className="block text-sm leading-6 text-red-800">{check.without}</span>}
              </span>
              <span className="flex-none text-right">
                <span
                  className={`px-2 py-1 text-xs font-bold ${
                    !result ? "bg-stone-100 text-stone-600" : result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
                  }`}
                >
                  {!result ? "Unknown" : result.ok ? "Working" : "Not working"}
                </span>
                {result && <span className="mt-1 block text-[11px] text-stone-500">{ago(result.at)}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Named, not omitted. An unchecked thing must not look like a working one. */}
      <p className="mt-4 text-xs leading-5 text-stone-500">
        Not checked here, because a nightly job should not spend money to tell you what you mostly know:{" "}
        {NOT_CHECKED.map((item, index) => (
          <span key={item.what}>
            {index > 0 ? "; " : ""}
            <strong className="font-semibold">{item.what}</strong> ({item.why})
          </span>
        ))}
        . The test buttons on this screen are how to ask those.
      </p>
    </section>
  );
}
