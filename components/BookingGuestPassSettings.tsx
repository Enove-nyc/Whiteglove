"use client";

import { useState, type FormEvent } from "react";

export default function BookingGuestPassSettings({ activeUntil }: { activeUntil: number | null }) {
  const [duration, setDuration] = useState(3600);
  const [expires, setExpires] = useState(activeUntil);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function update(action: "create" | "revoke") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/booking-guest-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, duration }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update the guest pass.");
      setPassword(result.password ?? "");
      setExpires(result.expires ?? null);
      setMessage(action === "create" ? "Guest password created." : "Guest password revoked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the guest pass.");
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void update("create");
  }

  return (
    <section className="mt-8 max-w-2xl rounded-lg border border-stone-300 p-5">
      <h2 className="text-xl font-semibold">Booking guest password</h2>
      <p className="mt-2 text-stone-600">Share the password with guests along with book.whitegloveitineraries.com. Creating a new pass ends the current pass and signs its guests out.</p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          Access duration
          <select className="rounded border border-stone-400 px-3 py-2" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            <option value={3600}>1 hour</option>
            <option value={86400}>1 day</option>
            <option value={604800}>1 week</option>
          </select>
        </label>
        <button type="submit" disabled={pending} className="rounded bg-[var(--navy)] px-4 py-2 text-white">Generate password</button>
        {expires && <button type="button" disabled={pending} onClick={() => void update("revoke")} className="rounded border border-stone-400 px-4 py-2">Revoke</button>}
      </form>
      {password && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code className="rounded bg-stone-100 px-3 py-2 text-lg">{password}</code>
          <button type="button" className="underline" onClick={() => {
            void navigator.clipboard.writeText(password).then(() => setMessage("Password copied."), () => setMessage("Select the password to copy it."));
          }}>Copy password</button>
        </div>
      )}
      {expires && <p className="mt-3">Expires {new Date(expires * 1000).toLocaleString()}.</p>}
      {message && <p className="mt-3" role="status">{message}</p>}
    </section>
  );
}
