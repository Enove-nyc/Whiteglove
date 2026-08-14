import Link from "next/link";
import BlastComposer from "@/components/BlastComposer";
import { emailConfigStatus } from "@/lib/email";
import { ALERT_TOPICS } from "@/lib/email-alerts";
import { alertsStoreAvailable, listAlertSignups } from "@/lib/email-alerts-store";
import { audienceFor } from "@/lib/email-blast";
import { alreadyHandled, blastStoreAvailable, listBlasts, readBlastSettings } from "@/lib/email-blast-store";

export const dynamic = "force-dynamic";

/**
 * Writing to the list.
 *
 * SEPARATE FROM /admin/alerts ON PURPOSE. That screen is the list — who asked,
 * for what, and how to take somebody off it — and it is looked at often. This
 * one sends mail to real people and cannot be undone, so it is its own address
 * with its own switch, rather than a button that appears halfway down a page
 * somebody is scrolling for another reason.
 */
export default async function SendUpdatesPage() {
  const [settings, blasts, signups, status] = await Promise.all([
    readBlastSettings(),
    listBlasts(),
    alertsStoreAvailable() ? listAlertSignups(5000) : Promise.resolve([]),
    emailConfigStatus(),
  ]);

  const active = signups.filter((signup) => !signup.unsubscribedAt);

  const reachByTopic: Record<string, number> = {};
  for (const topic of ALERT_TOPICS) {
    reachByTopic[topic] = active.filter((signup) => signup.topics.includes(topic)).length;
  }

  // A bitmask per person, no addresses. See the note on the component.
  const audienceMasks = active.map((signup) =>
    signup.topics.reduce((mask, topic) => {
      const index = ALERT_TOPICS.indexOf(topic);
      return index >= 0 ? mask | (1 << index) : mask;
    }, 0),
  );

  // How many are still waiting on each message. Worked out here rather than in
  // the browser because it needs the "already had it" set, which is the one
  // thing that keeps a half-sent blast from starting again from the top.
  const remaining: Record<string, number> = {};
  for (const blast of blasts) {
    const audience = audienceFor(active, blast.topics);
    const handled = blast.state === "draft" ? new Set<string>() : await alreadyHandled(blast.id);
    remaining[blast.id] = audience.filter((signup) => !handled.has(signup.email.toLowerCase())).length;
  }

  // The one thing that makes a send look successful and reach nobody.
  const deliveryWarning = !status.apiKeySet
    ? "Resend is not connected on this deployment (RESEND_API_KEY is missing), so nothing can be sent to anybody."
    : status.usingTestSender
      ? `Mail is going out from ${status.from}, which is Resend's shared test sender — it can only deliver to your own Resend inbox. Until whitegloveitineraries.com is verified in Resend and RESEND_FROM_EMAIL is set, a send here would report success and arrive nowhere.`
      : null;

  return (
    <div className="pb-12">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Customer updates</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Send an update</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          One message to the people who asked to hear about a particular thing. It reaches nobody else — not people with
          accounts, not people who have written in, not anybody whose address arrived some other way.
        </p>
        <p className="mt-2">
          <Link
            href="/admin/alerts"
            className="text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4"
          >
            ← Who is on the list
          </Link>
        </p>
      </header>

      <div className="mt-7">
        {!blastStoreAvailable() && (
          <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            The private store is not connected, so messages cannot be written down or sent.
          </p>
        )}
        <BlastComposer
          open={settings.open}
          storeReady={blastStoreAvailable()}
          reachByTopic={reachByTopic}
          audienceMasks={audienceMasks}
          blasts={blasts}
          remaining={remaining}
          deliveryWarning={deliveryWarning}
        />
      </div>
    </div>
  );
}
