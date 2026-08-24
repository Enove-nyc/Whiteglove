"use client";

import { useCallback, useEffect, useState } from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import { Button } from "@/components/ui/Button";
import { describeSeats, type TeamMember } from "@/data/team";

/**
 * A Business account's own staff — invite, see who's on the team, remove.
 *
 * NO EMAIL IS SENT. Inviting produces a join link (app/team/join/[token])
 * the owner copies and sends however they already reach this person — the
 * same "here is a link, you send it" pattern a client's app link and a
 * proposal link already use on this site.
 */
export default function TeamMembersPanel() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [seats, setSeats] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/team", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setTeam(Array.isArray(data.team) ? data.team : []);
        setSeats(data.staffSeats ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // The first read does its own guarded fetch rather than calling load()
  // straight out of the effect body — setState synchronously in an effect
  // cascades renders. `load` stays for the refresh after invite/remove.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/account/team", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && data) {
          setTeam(Array.isArray(data.team) ? data.team : []);
          setSeats(data.staffSeats ?? null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function invite() {
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    setError("");
    setJoinLink("");
    try {
      const res = await fetch("/api/account/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Could not send that invite.");
        return;
      }
      setEmail("");
      setJoinLink(`${window.location.origin}${data.joinPath}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(memberEmail: string) {
    if (!window.confirm(`Remove ${memberEmail} from your team? Their own account stays — only the link to yours is cut.`)) return;
    await fetch("/api/account/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: memberEmail }),
    });
    await load();
  }

  if (loading) return <p className="text-sm text-stone-500">Loading your team…</p>;

  return (
    <div>
      <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Team members</span>
      <p className="mt-1 text-sm leading-6 text-stone-600">
        Staff logins that see the same trips, pipeline, library and clients you do. {describeSeats(team, seats)}
      </p>

      {team.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {team.map((m) => (
            <li key={m.email} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--gold-light)] bg-[#fcfaf6] px-4 py-3">
              <div>
                <span className="block font-semibold text-[var(--navy)]">{m.email}</span>
                <span className="block text-xs text-stone-500">{m.status === "active" ? "Active" : "Invited — waiting to join"}</span>
              </div>
              <button
                type="button"
                onClick={() => void remove(m.email)}
                className="text-xs font-semibold text-red-700 underline decoration-red-300 underline-offset-2"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Invite by email or phone</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="mt-1.5 min-w-[240px] rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]"
          />
        </label>
        <Button onClick={() => void invite()} disabled={busy || !email.trim()}>
          {busy ? "Sending…" : "Send invite"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
      {joinLink && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3">
          <span className="text-sm text-emerald-900">Send them this link to join:</span>
          <CopyLinkButton value={joinLink} />
        </div>
      )}
    </div>
  );
}
