"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { describeIdentity } from "@/lib/identity";

/**
 * The one button that actually accepts an agency invite. See the note on
 * app/agency/join/page.tsx for why this is a POST, never a GET.
 */
export default function AgencyJoinCard({
  token,
  matches,
  invitedEmail,
  signedInAs,
}: {
  token: string;
  /** Whether the signed-in account is the one the invite was sent to. */
  matches: boolean;
  invitedEmail: string;
  signedInAs: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!matches) {
    return (
      <div className="border-l-4 border-amber-400 bg-white px-4 py-3">
        <p className="text-sm leading-6 text-stone-700">
          This invitation was sent to <strong>{describeIdentity(invitedEmail)}</strong>, and you are signed in as{" "}
          <strong>{describeIdentity(signedInAs)}</strong>. Sign out and sign in as {describeIdentity(invitedEmail)} to
          accept it.
        </p>
      </div>
    );
  }

  async function accept() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/agency/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setBusy(false);
        setMessage({ ok: false, text: data?.error || "That could not be accepted just now." });
        return;
      }
      router.push("/agency");
    } catch {
      setBusy(false);
      setMessage({ ok: false, text: "That could not be reached just now. Please try again." });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="min-h-11 rounded-full bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Joining…" : "Accept and join"}
      </button>
      {message && !message.ok && <p className="mt-3 text-sm font-semibold text-red-700">{message.text}</p>}
    </div>
  );
}
