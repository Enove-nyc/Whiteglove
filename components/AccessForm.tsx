"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminHref } from "@/lib/admin-nav";
import { safeAdminNext } from "@/lib/admin-host";
import { biometricAvailable, forgetSecret, hasRememberedSecret, rememberSecret, unlockSecret } from "@/lib/native-biometric";

export default function AccessForm({ scope, next }: { scope: "admin" | "site"; next?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  /**
   * Fingerprint / face unlock, only inside the native app with the plugin
   * present. `bioReady` shows the checkbox that offers to remember; `bioStored`
   * shows the unlock button because something was already remembered here. The
   * secret is namespaced per door so admin and adviser never cross.
   */
  const bioServer = `white-glove-${scope}`;
  const [bioReady, setBioReady] = useState(false);
  const [bioStored, setBioStored] = useState(false);
  const [rememberBio, setRememberBio] = useState(true);

  useEffect(() => {
    let live = true;
    void (async () => {
      const available = await biometricAvailable();
      if (!live) return;
      setBioReady(available);
      if (available) setBioStored(await hasRememberedSecret(bioServer));
    })();
    return () => {
      live = false;
    };
  }, [bioServer]);
  function destination() {
    if (scope !== "admin") return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
    const canonical = safeAdminNext(next);
    return adminHref(canonical, pathname);
  }

  /**
   * One sign-in attempt, from the typed password or from a biometric unlock.
   * Extracted so the fingerprint path and the form submit share exactly the
   * same server round-trip.
   */
  async function runAccess(pw: string, fromBio = false) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        password: pw.trim(),
      }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      // A stored fingerprint secret the server now rejects is a password that
      // was changed — forget it so the stale unlock button stops offering,
      // and send them back to typing the new one.
      if (fromBio) {
        await forgetSecret(bioServer);
        setBioStored(false);
      }
      setMessage(data?.error || "Please try again.");
      setSaving(false);
      return;
    }
    // The password was right. Remember it behind biometrics if the person asked
    // and the app can, so next time is a fingerprint. Only ever after a success,
    // so a wrong password is never stored.
    if (bioReady && rememberBio) {
      const stored = await rememberSecret(bioServer, pw.trim());
      if (stored) setBioStored(true);
    }
    // A short code has to say so. Letting it lapse silently halfway through
    // what somebody came to read is the one thing worse than not letting them in.
    const data = await response.json().catch(() => null);
    const dest = destination();
    if (data?.expiresInMinutes) {
      setMinutes(data.expiresInMinutes);
      setTimeout(() => {
        router.replace(dest);
        router.refresh();
      }, 1800);
      return;
    }
    router.replace(dest);
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAccess(password);
  }

  /**
   * The fingerprint button. Confirm the person with the OS, read the stored
   * password, and sign in with it. A cancel or a missing secret just leaves
   * them on the password box; a stored password the server now rejects (it was
   * changed) is forgotten so the stale button stops offering.
   */
  async function unlock() {
    setMessage("");
    const secret = await unlockSecret(bioServer, scope === "admin" ? "Unlock the admin dashboard" : "Unlock White Glove");
    if (!secret) {
      // Cancelled, not recognised, or nothing readable — say so, rather than
      // going quiet and leaving the button looking broken.
      setMessage("Not unlocked. Try the fingerprint again, or type the password below.");
      return;
    }
    await runAccess(secret, true);
  }
  if (minutes) {
    return (
      <p className="mt-7 border-l-4 border-[var(--gold)] bg-[var(--cream)] px-4 py-3 text-sm leading-6 text-[var(--navy)]">
        That is a short-stay code — you have <strong>{minutes} minutes</strong>. Taking you in now.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      {/* Inside the app, with something already remembered here, the fingerprint
          is the fast way in. Outside the app this never renders. The password
          stays right below it, always. */}
      {bioStored && (
        <button
          type="button"
          onClick={unlock}
          disabled={saving}
          className="w-full border border-[var(--navy)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white disabled:opacity-60"
        >
          Unlock with fingerprint or face
        </button>
      )}
      <label className="block text-sm font-semibold text-[var(--navy)]">
        Password
        <input
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 outline-none focus:border-[var(--gold)]"
        />
      </label>
      {/* Offer to remember only inside the app, and only when nothing is stored
          here yet — once it is, the unlock button above is the standing offer. */}
      {bioReady && !bioStored && (
        <label className="flex items-start gap-3 text-sm font-normal leading-6 text-stone-700">
          <input
            type="checkbox"
            checked={rememberBio}
            onChange={(event) => setRememberBio(event.target.checked)}
            className="mt-1 size-4 shrink-0"
          />
          <span>
            <span className="font-semibold text-[var(--navy)]">Unlock with fingerprint or face next time</span> on this
            device. The password is kept in the phone&rsquo;s secure store and never leaves it.
          </span>
        </label>
      )}
      {message && <p className="text-sm text-red-700">{message}</p>}
      <button
        disabled={saving}
        className="w-full bg-[var(--navy)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] disabled:opacity-60"
      >
        {saving ? "Checking..." : scope === "admin" ? "Open admin" : "Enter White Glove"}
      </button>
    </form>
  );
}
