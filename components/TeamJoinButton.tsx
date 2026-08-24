"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function TeamJoinButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Could not join. Try again.");
        return;
      }
      router.push("/account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col items-start gap-3">
      <Button onClick={() => void join()} disabled={busy}>
        {busy ? "Joining…" : "Join the team"}
      </Button>
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
