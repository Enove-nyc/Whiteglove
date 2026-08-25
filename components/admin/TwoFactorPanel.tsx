"use client";

import { useState } from "react";

/**
 * Setting up the admin's second factor, from inside the admin.
 *
 * NO QR CODE, DELIBERATELY. Drawing one needs an encoder — a few hundred lines
 * or a dependency — to save typing thirty-two characters once. What is here
 * instead is the two things that actually work: the key as text, which every
 * authenticator app accepts under "enter a setup key", and the otpauth link,
 * which on the phone itself opens the app with everything already filled in.
 *
 * THE RECOVERY CODES ARE SHOWN ONCE AND THAT IS SAID LOUDLY, because only
 * their hashes are kept. Somebody who closes this screen without saving them
 * has not lost their admin — they can generate a new set from here while still
 * signed in — but they have lost their way back in from a lost phone, and that
 * is worth a sentence in plain words rather than a footnote.
 */

type Stage = "idle" | "setup" | "codes";

export default function TwoFactorPanel({ enrolled, who, shared }: { enrolled: boolean; who: string; shared: boolean }) {
  const [on, setOn] = useState(enrolled);
  const [stage, setStage] = useState<Stage>("idle");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(payload: Record<string, string>) {
    const res = await fetch("/api/admin/two-factor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as
      | { error?: string; secret?: string; uri?: string; recoveryCodes?: string[] }
      | null;
    if (!res.ok) throw new Error(data?.error || "That did not work.");
    return data ?? {};
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const begin = () =>
    run(async () => {
      const data = await call({ action: "begin" });
      setSecret(data.secret ?? "");
      setUri(data.uri ?? "");
      setCode("");
      setStage("setup");
    });

  const confirm = () =>
    run(async () => {
      const data = await call({ action: "confirm", secret, code });
      setCodes(data.recoveryCodes ?? []);
      setOn(true);
      setStage("codes");
    });

  const regenerate = () =>
    run(async () => {
      const data = await call({ action: "regenerate" });
      setCodes(data.recoveryCodes ?? []);
      setStage("codes");
    });

  const disable = () =>
    run(async () => {
      await call({ action: "disable" });
      setOn(false);
      setStage("idle");
      setCodes([]);
    });

  const field = "mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 outline-none focus:border-[var(--gold)]";
  const primary =
    "bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] disabled:opacity-60";
  const quiet =
    "border border-[var(--gold-light)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] disabled:opacity-60";

  return (
    <div className="border border-[var(--gold)] bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Two-factor</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
        {on ? "A code is required to get in" : "A password is the only thing in the way"}
      </h2>
      {/* WHICH DOOR, SAID BEFORE THE BUTTON IS PRESSED — not only afterwards.
          The first version named it only once two-factor was already on, so
          somebody signed in with the shared password could turn it on without
          being told that everybody else holding that password would need a
          code from THEIR phone from then on. That is a decision, and it has
          to be in front of them while it is still a decision. */}
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        {on
          ? `${shared ? "Signing in with the shared admin password" : `Signing in as ${who}`} needs the six digits from your authenticator app as well as the password.`
          : `Behind this password is the money, every visitor's email and phone number, every shomer's number, and the switch that closes the site. Adding a code from your phone means a password on its own no longer opens any of it.`}
      </p>
      {!on && (
        <p className="mt-3 max-w-2xl border-l-4 border-[var(--gold)] bg-[var(--cream)] px-4 py-3 text-sm leading-6 text-[var(--navy)]">
          {shared ? (
            <>
              This would secure <strong className="font-semibold">the shared admin password</strong> — the door you came
              in through. Everybody else who has that password would need a code from{" "}
              <strong className="font-semibold">your</strong> phone from then on, so anyone helping you today would be
              locked out until you gave them one of your recovery codes. To protect only yourself instead, sign out and
              come back in through <strong className="font-semibold">Open the admin area</strong> on your account page.
            </>
          ) : (
            <>
              This would secure <strong className="font-semibold">{who}</strong> — your own account, and nobody else&rsquo;s
              way in.
            </>
          )}
        </p>
      )}

      {stage === "setup" && (
        <div className="mt-6 border-t border-[var(--gold-light)] pt-6">
          <p className="text-sm leading-6 text-stone-700">
            In your authenticator app, choose to add an account by entering a setup key, and type this:
          </p>
          <p className="mt-3 select-all break-all border border-[var(--gold-light)] bg-[var(--cream)] px-4 py-3 font-mono text-base tracking-[0.15em] text-[var(--navy)]">
            {(secret.match(/.{1,4}/g) ?? []).join(" ")}
          </p>
          {uri && (
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Reading this on the phone itself?{" "}
              <a href={uri} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
                Open it straight in your app
              </a>
              .
            </p>
          )}
          <label className="mt-5 block text-sm font-semibold text-[var(--navy)]">
            Then type the six digits it shows
            <input
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              placeholder="123456"
              className={`${field} tracking-[0.3em]`}
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-stone-600">
            Nothing is saved until this works, so a half-finished setup cannot lock you out.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={confirm} disabled={busy} className={primary}>
              {busy ? "Checking…" : "Turn it on"}
            </button>
            <button type="button" onClick={() => setStage("idle")} disabled={busy} className={quiet}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === "codes" && (
        <div className="mt-6 border-t border-[var(--gold-light)] pt-6">
          <p className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
            <strong className="font-semibold">Save these now — this is the only time they are shown.</strong> Each one
            works once, in place of the code from your app. Without them, a lost phone means a locked door.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm text-[var(--navy)] sm:grid-cols-3">
            {codes.map((entry) => (
              <li key={entry} className="select-all">
                {entry}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setStage("idle")} className={`${primary} mt-5`}>
            I have saved them
          </button>
        </div>
      )}

      {stage === "idle" && (
        <div className="mt-6 flex flex-wrap gap-3">
          {on ? (
            <>
              <button type="button" onClick={regenerate} disabled={busy} className={quiet}>
                New recovery codes
              </button>
              <button type="button" onClick={disable} disabled={busy} className={quiet}>
                Turn it off
              </button>
            </>
          ) : (
            <button type="button" onClick={begin} disabled={busy} className={primary}>
              {busy ? "One moment…" : "Set it up"}
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
