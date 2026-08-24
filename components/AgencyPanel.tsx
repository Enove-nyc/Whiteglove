"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { describeIdentity } from "@/lib/identity";
import { MAX_SEATS } from "@/lib/agency";

type Member = { account: string; role: "owner" | "advisor"; joinedAt: string; you: boolean };
type PendingInvite = { email: string; invitedAt: string; expiresAt: string };

type AgencyStatus = {
  plan: string;
  hasAgency: boolean;
  isOwner: boolean;
  seatsUsed: number;
  seatsPurchased: number;
  maxSeats: number;
  seatsDescription: string;
  members: Member[];
  pendingInvites: PendingInvite[];
  canBuySeats: boolean;
  seatLine: string;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";
const buttonClass =
  "min-h-11 rounded-md border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:text-[var(--navy)] disabled:opacity-50";

/**
 * The agency screen — one of four things, depending on who is looking:
 *
 * NOT ADVISOR PRO. Agency is built on Advisor Pro, and says so plainly.
 * PRO, NO AGENCY YET, CAN BUY SEATS. Buying the first extra seat is what
 *   starts one — see lib/agency.ts. Nothing before that is an agency.
 * PRO, NO AGENCY YET, CANNOT. Stripe is not configured for seats, or this
 *   Pro was granted by hand with no live subscription behind it to attach a
 *   seat to. Said plainly rather than hiding the whole screen.
 * ON AN AGENCY. The owner sees the member list, the invite form, and the
 *   seat count; a member sees the same list read-only, and a way to leave.
 */
export default function AgencyPanel() {
  const router = useRouter();
  const [status, setStatus] = useState<AgencyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [seatDraft, setSeatDraft] = useState("");

  /** Re-read from the server — after mount, and after anything that changes it. */
  async function load() {
    try {
      const res = await fetch("/api/account/agency", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Could not load your agency.");
      } else {
        setStatus(data);
        setSeatDraft(String(Math.max(2, (data?.seatsPurchased as number) || 2)));
      }
    } catch {
      setError("Could not reach the account service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await load();
    })();
    return () => {
      active = false;
    };
  }, []);

  async function act(action: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error || "That could not be done just now." });
        return false;
      }
      return true;
    } catch {
      setMessage({ ok: false, text: "That could not be reached just now." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function buySeats(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const seats = Number(seatDraft);
    if (await act("buy-seats", { seats })) {
      setMessage({ ok: true, text: "Done." });
      setLoading(true);
      await load();
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await act("invite", { email: inviteEmail })) {
      setMessage({ ok: true, text: `Invited ${inviteEmail}.` });
      setInviteEmail("");
      setLoading(true);
      await load();
    }
  }

  async function revoke(email: string) {
    if (await act("revoke-invite", { email })) {
      setLoading(true);
      await load();
    }
  }

  async function remove(account: string) {
    if (!window.confirm(`Remove ${describeIdentity(account)} from the agency? Their account drops to no plan.`)) return;
    if (await act("remove-member", { account })) {
      setLoading(true);
      await load();
    }
  }

  async function leave() {
    if (!window.confirm("Leave this agency? Your account drops to no plan until you buy or are invited to another.")) return;
    if (await act("leave")) router.push("/account");
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (error) return <p className="text-sm font-semibold text-red-700">{error}</p>;
  if (!status) return null;

  if (status.plan !== "pro") {
    return (
      <p className="text-sm leading-6 text-stone-600">
        An agency is Advisor Pro plus extra advisor seats. Choose Advisor Pro from your account first.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className={`text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>
      )}

      {status.hasAgency ? (
        <>
          <div>
            <p className="text-sm leading-6 text-stone-600">{status.seatsDescription}</p>
            <ul className="mt-3 space-y-2">
              {status.members.map((m) => (
                <li
                  key={m.account}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--gold-light)] bg-white px-4 py-2.5 text-sm"
                >
                  <span className="text-[var(--navy)]">
                    {describeIdentity(m.account)}
                    {m.you ? " (you)" : ""}
                    <span className="ml-2 text-xs font-bold uppercase tracking-[0.1em] text-stone-400">{m.role}</span>
                  </span>
                  {status.isOwner && m.role !== "owner" && (
                    <button
                      type="button"
                      onClick={() => remove(m.account)}
                      disabled={busy}
                      className="text-xs font-semibold text-red-700 underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {status.isOwner && status.pendingInvites.length > 0 && (
            <div>
              <p className={captionClass}>Invited, not yet accepted</p>
              <ul className="mt-2 space-y-2">
                {status.pendingInvites.map((i) => (
                  <li
                    key={i.email}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--gold-light)] bg-white px-4 py-2.5 text-sm text-stone-600"
                  >
                    <span>{i.email}</span>
                    <button
                      type="button"
                      onClick={() => revoke(i.email)}
                      disabled={busy}
                      className="text-xs font-semibold text-stone-500 underline disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.isOwner ? (
            <>
              <form onSubmit={invite} className="border border-[var(--gold-light)] bg-white p-4">
                <p className={captionClass}>Invite another advisor</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="advisor@example.com"
                    className={`${inputClass} max-w-xs`}
                  />
                  <button type="submit" disabled={busy} className={buttonClass}>
                    Invite
                  </button>
                </div>
              </form>

              {status.canBuySeats && (
                <form onSubmit={buySeats} className="border border-[var(--gold-light)] bg-white p-4">
                  <p className={captionClass}>Total seats (yours plus every advisor) — {status.seatLine} each extra</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={status.maxSeats}
                      value={seatDraft}
                      onChange={(e) => setSeatDraft(e.target.value)}
                      className={`${inputClass} w-24`}
                    />
                    <button type="submit" disabled={busy} className={buttonClass}>
                      Update seats
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <button type="button" onClick={leave} disabled={busy} className="text-xs font-semibold text-red-700 underline">
              Leave this agency
            </button>
          )}
        </>
      ) : status.canBuySeats ? (
        <form onSubmit={buySeats} className="border border-[var(--gold-light)] bg-white p-5">
          <p className="text-sm leading-6 text-stone-600">
            Buying a seat is what starts an agency — one login for you, and one for each advisor beyond that, all
            sharing this subscription and one letterhead. {status.seatLine} a seat, beyond your own.
          </p>
          <label className="mt-4 block max-w-[10rem]">
            <span className={captionClass}>Total seats</span>
            <input
              type="number"
              min={2}
              max={MAX_SEATS}
              value={seatDraft}
              onChange={(e) => setSeatDraft(e.target.value)}
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={busy} className={`${buttonClass} mt-4`}>
            Start the agency
          </button>
        </form>
      ) : (
        <p className="text-sm leading-6 text-stone-600">
          Agency seats are not offered on this deployment right now — write in and we will sort it out by hand.
        </p>
      )}
    </div>
  );
}
