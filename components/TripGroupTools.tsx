"use client";

import { useEffect, useState } from "react";
import type { SharedFavorite, TripVote } from "@/lib/trip-collaboration";
import { tallyVotes } from "@/lib/trip-collaboration";

/* load is recreated each render on purpose — shareId is the only input that matters */

/**
 * Voting and shared favorites for a shared trip.
 *
 * Shown on the shared itinerary view when the person can at least comment.
 * Viewers see tallies and the list; they cannot change either.
 */
export default function TripGroupTools({
  shareId,
  votingEnabled = true,
  favoritesEnabled = true,
}: {
  shareId: string;
  votingEnabled?: boolean;
  favoritesEnabled?: boolean;
}) {
  const [votes, setVotes] = useState<TripVote[]>([]);
  const [favorites, setFavorites] = useState<SharedFavorite[]>([]);
  const [canVote, setCanVote] = useState(false);
  const [canEditFavorites, setCanEditFavorites] = useState(false);
  const [you, setYou] = useState("");
  const [voteLabel, setVoteLabel] = useState("");
  const [favoriteLabel, setFavoriteLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function load() {
    try {
      const [voteRes, favRes] = await Promise.all([
        fetch(`/api/account/itinerary/votes?share=${encodeURIComponent(shareId)}`, { cache: "no-store" }),
        fetch(`/api/account/itinerary/favorites?share=${encodeURIComponent(shareId)}`, { cache: "no-store" }),
      ]);
      if (voteRes.ok) {
        const data = await voteRes.json();
        setVotes(data.votes ?? []);
        setCanVote(Boolean(data.canVote));
        setYou(data.you ?? "");
      }
      if (favRes.ok) {
        const data = await favRes.json();
        setFavorites(data.favorites ?? []);
        setCanEditFavorites(Boolean(data.canEdit));
      }
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the share link changes
  }, [shareId]);

  const targets = [...new Map(votes.map((v) => [v.targetId, v])).values()];

  async function vote(targetId: string, voteLabel: string, kind: TripVote["kind"], value: 1 | -1) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/account/itinerary/votes?share=${encodeURIComponent(shareId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, label: voteLabel, kind, value }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save that vote.");
      return;
    }
    setVotes(data.votes ?? []);
  }

  async function addFavorite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/account/itinerary/favorites?share=${encodeURIComponent(shareId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: favoriteLabel, kind: "place" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save that.");
      return;
    }
    setFavorites(data.favorites ?? []);
    setFavoriteLabel("");
  }

  if (!loaded) {
    return <p className="text-sm text-stone-500">Loading group tools…</p>;
  }

  return (
    <div className="space-y-8">
      {votingEnabled && (
      <section aria-labelledby="trip-votes-heading">
        <h3 id="trip-votes-heading" className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
          Group votes
        </h3>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Vote on hotels, restaurants and activities while you plan together.
          {canVote ? "" : " You can see the tallies; ask for comment access to vote."}
        </p>
        {targets.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No votes yet. Commenters and editors can start one from a place name below.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {targets.map((item) => {
              const tally = tallyVotes(votes, item.targetId);
              const yours = votes.find((v) => v.targetId === item.targetId && v.voter === you);
              return (
                <li key={item.targetId} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gold-light)] pt-3">
                  <div>
                    <p className="font-semibold text-[var(--navy)]">{item.label}</p>
                    <p className="text-xs uppercase tracking-[0.1em] text-stone-400">{item.kind}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {tally.up} for · {tally.down} against · score {tally.score}
                      {yours ? ` · you voted ${yours.value === 1 ? "for" : "against"}` : ""}
                    </p>
                  </div>
                  {canVote && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => vote(item.targetId, item.label, item.kind, 1)}
                        className="min-h-11 border border-[var(--navy)] px-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)]"
                      >
                        For
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => vote(item.targetId, item.label, item.kind, -1)}
                        className="min-h-11 border border-[var(--gold-light)] px-3 text-xs font-bold uppercase tracking-[0.1em] text-stone-600"
                      >
                        Against
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {canVote && (
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const value = voteLabel.trim();
              if (!value) return;
              void vote(`custom:${value.toLowerCase()}`, value, "activity", 1);
              setVoteLabel("");
            }}
          >
            <input
              value={voteLabel}
              onChange={(e) => setVoteLabel(e.target.value)}
              placeholder="Suggest a place to vote on"
              className="min-h-11 flex-1 rounded-md border border-[var(--gold-light)] px-3 text-sm"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white"
            >
              Start a vote
            </button>
          </form>
        )}
      </section>
      )}

      {favoritesEnabled && (
      <section aria-labelledby="trip-favorites-heading">
        <h3 id="trip-favorites-heading" className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
          Shared favorites
        </h3>
        <p className="mt-1 text-sm leading-6 text-stone-600">Places the group wants to keep visible while planning.</p>
        {favorites.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {favorites.map((fav) => (
              <li key={fav.id} className="text-sm text-stone-700">
                <span className="font-semibold text-[var(--navy)]">{fav.label}</span>
                {fav.addedByName || fav.addedBy ? (
                  <span className="text-stone-400"> — {fav.addedByName || fav.addedBy}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canEditFavorites && (
          <form onSubmit={addFavorite} className="mt-4 flex flex-wrap gap-2">
            <input
              value={favoriteLabel}
              onChange={(e) => setFavoriteLabel(e.target.value)}
              placeholder="Add a shared favorite"
              className="min-h-11 flex-1 rounded-md border border-[var(--gold-light)] px-3 text-sm"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 border border-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)]"
            >
              Add
            </button>
          </form>
        )}
      </section>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
