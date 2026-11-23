"use client";

import { useState } from "react";

export default function ShareTripWithSupport({ tripId }: { tripId: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function update(revoke: boolean) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/account/support-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(revoke ? { revoke: code } : { tripId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Could not update support access.");
        return;
      }
      setCode(revoke ? "" : result.code);
    } catch {
      setError("Could not update support access. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="rounded-xl border bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold">Share with support</summary>
      <p className="mt-2">Share a read-only copy of this saved trip’s schedule, without notes, booking references, documents or chat. The support code can be used once and expires in one hour.</p>
      {code && <p role="status" className="mt-2 break-all font-mono">{code}</p>}
      <button type="button" disabled={pending} onClick={() => void update(Boolean(code))} className="mt-2 min-h-11 font-semibold underline">
        {code ? "Revoke support code" : "Create support code"}
      </button>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
