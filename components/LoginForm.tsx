"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "login">("signup");
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
    const endpoint = mode === "signup" ? "/api/account/register" : "/api/account/login";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => null) as { error?: string; email?: string } | null;
    if (!response.ok) {
      setMessage(data?.error || "Please try again.");
      setSaving(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={continueToAccount}>
      <div className="grid grid-cols-2 border border-[var(--gold-light)] p-1">
        <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} className={`px-3 py-2 text-xs font-bold uppercase tracking-[0.13em] transition ${mode === "signup" ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]"}`}>Sign up</button>
        <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className={`px-3 py-2 text-xs font-bold uppercase tracking-[0.13em] transition ${mode === "login" ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]"}`}>Log in</button>
      </div>
      <label className="block text-sm font-semibold text-[var(--navy)]">Email address
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="you@example.com" className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 outline-none focus:border-[var(--gold)]" />
      </label>
      <label className="block text-sm font-semibold text-[var(--navy)]">Password
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required placeholder="Choose a password" className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 outline-none focus:border-[var(--gold)]" />
      </label>
      {message && <p className="text-sm leading-6 text-amber-800">{message}</p>}
      <button type="submit" disabled={saving} className="w-full bg-[var(--navy)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] disabled:opacity-60">{saving ? "Checking..." : mode === "signup" ? "Create account" : "Log in"}</button>
    </form>
  );
}
