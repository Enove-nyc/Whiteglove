"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signup" | "login" | "verify" | "forgot" | "reset">("signup");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/account/me")
      .then((response) => response.json())
      .then((data) => {
        if (active && data?.account?.email) router.replace("/account");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [router]);

  async function continueToAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (mode === "forgot") {
      const response = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setSaving(false);
      if (!response.ok) {
        setMessage(data?.error || "Please try again.");
        return;
      }
      setMode("reset");
      setMessage("Check your email for the reset code, then enter it below with a new password.");
      return;
    }

    if (mode === "reset") {
      const response = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password: newPassword }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setSaving(false);
      if (!response.ok) {
        setMessage(data?.error || "Please try again.");
        return;
      }
      setMode("login");
      setPassword("");
      setCode("");
      setNewPassword("");
      setMessage("Password updated. Log in with your new password.");
      return;
    }

    const endpoint = mode === "signup" ? "/api/account/register" : mode === "login" ? "/api/account/login" : "/api/account/verify";
    const payload = mode === "verify" ? { email, code } : { email, password };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null) as { error?: string; email?: string; verificationRequired?: boolean } | null;
    if (!response.ok) {
      setMessage(data?.error || "Please try again.");
      setSaving(false);
      if (data?.verificationRequired) setMode("verify");
      return;
    }
    if (mode === "signup") {
      setMode("verify");
      setMessage("Check your email for the verification code, then enter it below.");
      setSaving(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={continueToAccount}>
      {(mode === "signup" || mode === "login") && (
        <div className="grid grid-cols-2 border border-[var(--gold-light)] p-1">
          <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} className={`px-3 py-2 text-xs font-bold uppercase tracking-[0.13em] transition ${mode === "signup" ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]"}`}>Sign up</button>
          <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className={`px-3 py-2 text-xs font-bold uppercase tracking-[0.13em] transition ${mode === "login" ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]"}`}>Log in</button>
        </div>
      )}

      <label className="block text-sm font-semibold text-[var(--navy)]">Email address
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="you@example.com" className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 outline-none focus:border-[var(--gold)]" />
      </label>

      {(mode === "signup" || mode === "login") && (
        <label className="block text-sm font-semibold text-[var(--navy)]">Password
          <div className="relative mt-2">
            <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} required placeholder="Choose a password" className="w-full border border-[var(--gold-light)] bg-white px-4 py-3 pr-12 outline-none focus:border-[var(--gold)]" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--navy)] hover:text-[var(--gold)]">
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </label>
      )}

      {mode === "login" && (
        <button type="button" onClick={() => { setMode("forgot"); setMessage(""); }} className="text-xs font-bold uppercase tracking-[0.13em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">
          Forgot password?
        </button>
      )}

      {mode === "verify" && (
        <label className="block text-sm font-semibold text-[var(--navy)]">Verification code
          <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required placeholder="Enter the 6-digit code" className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 outline-none focus:border-[var(--gold)]" />
        </label>
      )}

      {mode === "reset" && (
        <>
          <label className="block text-sm font-semibold text-[var(--navy)]">Reset code
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" required placeholder="Enter the 6-digit code" className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 outline-none focus:border-[var(--gold)]" />
          </label>
          <label className="block text-sm font-semibold text-[var(--navy)]">New password
            <div className="relative mt-2">
              <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type={showPassword ? "text" : "password"} required placeholder="Choose a new password" className="w-full border border-[var(--gold-light)] bg-white px-4 py-3 pr-12 outline-none focus:border-[var(--gold)]" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--navy)] hover:text-[var(--gold)]">
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </label>
        </>
      )}

      {message && <p className="text-sm leading-6 text-amber-800">{message}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="submit" disabled={saving} className="w-full bg-[var(--navy)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] disabled:opacity-60">
          {saving ? "Checking..." : mode === "signup" ? "Create account" : mode === "verify" ? "Verify account" : mode === "forgot" ? "Send reset code" : mode === "reset" ? "Update password" : "Log in"}
        </button>
        {mode === "verify" && (
          <button type="button" disabled={saving} onClick={async () => { setSaving(true); const response = await fetch("/api/account/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const data = await response.json().catch(() => null) as { error?: string } | null; setSaving(false); setMessage(response.ok ? "A new verification code was sent." : data?.error || "Please try again."); }} className="w-full border border-[var(--gold-light)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">Resend code</button>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <button type="button" disabled={saving} onClick={() => { setMode("login"); setMessage(""); }} className="w-full border border-[var(--gold-light)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">Back to log in</button>
        )}
      </div>
    </form>
  );
}