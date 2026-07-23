"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("whiteGloveAccountEmail")) router.replace("/account");
  }, [router]);

  function continueToAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    const registeredEmail = localStorage.getItem("whiteGloveRegisteredEmail");
    if (mode === "login" && registeredEmail !== cleanEmail) {
      setMessage("We could not find an account with that email on this browser. Choose Sign up to create one.");
      return;
    }
    if (mode === "signup") localStorage.setItem("whiteGloveRegisteredEmail", cleanEmail);
    sessionStorage.setItem("whiteGloveAccountEmail", cleanEmail);
    window.dispatchEvent(new Event("whiteglove-account"));
    router.push(`/account?email=${encodeURIComponent(cleanEmail)}`);
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
      {message && <p className="text-sm leading-6 text-amber-800">{message}</p>}
      <button type="submit" className="w-full bg-[var(--navy)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">{mode === "signup" ? "Create account" : "Log in"}</button>
    </form>
  );
}
