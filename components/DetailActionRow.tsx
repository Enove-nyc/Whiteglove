"use client";

import { useState } from "react";
import { IconButton, IconLink } from "@/components/icons/IconAction";
import MoreActions from "@/components/MoreActions";
import { useRequireSignIn } from "@/components/SignInGate";
import { useSignedIn } from "@/lib/use-signed-in";
import { placeDirectionsUrl, type SavedPlace } from "@/data/route-utils";
import { AddedToTrip, useAddToItinerary } from "@/components/useAddToItinerary";

/**
 * The essential action icons a detail page carries, in one consistent row.
 *
 * The same icons, in the same order, everywhere. Each is an icon with an
 * accessible name and a desktop tooltip (components/icons/IconAction.tsx) —
 * never a bare symbol a visitor has to guess at. Actions that only exist for
 * some places (no phone, no website) simply do not render, so the row stays
 * short rather than greying out.
 *
 * THREE IN FRONT, THE REST BEHIND ONE PRESS. All eight used to sit in one row
 * — Directions, Phone, Website, Share, Favorite, Route, Add to itinerary,
 * Report — at equal weight, so the page's answer to "what do I do with this
 * place" was eight identical squares and no order of importance. What somebody
 * on a detail page actually does is put it on the trip, put it on the route,
 * or go there, so those three stay out. Phone, Website, Share, Favorite and
 * Report are real and are one press away, with their names and tooltips
 * unchanged.
 *
 * The itinerary comes first now rather than last. It is the site's own
 * primary action — the whole planner is built on it — and it was sitting
 * seventh of eight, after Share.
 *
 * Save actions are gated exactly like everywhere else — pressed signed out,
 * the sign-in dialog opens and the action completes on success. See
 * components/SignInGate.tsx.
 *
 * THE SUITCASE CHANGES ITS NAME. "Add to itinerary" while it is an action;
 * once added it becomes a link named "View itinerary" — the tooltip and the
 * accessible name flip together, per the brief.
 */

const ROUTE_KEY = "whiteGloveMyRoute";
const FAVORITES_KEY = "whiteGloveFavorites";

function read(key: string): SavedPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(list) ? (list as SavedPlace[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, places: SavedPlace[]) {
  localStorage.setItem(key, JSON.stringify(places));
  window.dispatchEvent(new Event("whiteglove-route"));
}

export default function DetailActionRow({
  place,
  phone,
  website,
}: {
  /** Name, address, coordinates and href — what saving and directions need. */
  place: SavedPlace;
  phone?: string;
  website?: string;
}) {
  const signedIn = useSignedIn();
  const requireSignIn = useRequireSignIn();
  const [inRoute, setInRoute] = useState(() => read(ROUTE_KEY).some((item) => item.id === place.id));
  const [favorite, setFavorite] = useState(() => read(FAVORITES_KEY).some((item) => item.id === place.id));
  // One implementation of adding a stop, shared with the attraction
  // cards: it reads the account, and asks which trip when the account
  // holds more than one.
  const trip = useAddToItinerary();
  const [shared, setShared] = useState("");

  const syncPlaces = (collection: "route" | "favorites") => {
    void fetch("/api/account/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, action: "toggle", place }),
    }).catch(() => undefined);
  };

  const toggleRoute = () => {
    const next = inRoute ? read(ROUTE_KEY).filter((item) => item.id !== place.id) : [...read(ROUTE_KEY), place];
    write(ROUTE_KEY, next);
    setInRoute(!inRoute);
    syncPlaces("route");
  };

  const toggleFavorite = () => {
    const next = favorite ? read(FAVORITES_KEY).filter((item) => item.id !== place.id) : [...read(FAVORITES_KEY), place];
    write(FAVORITES_KEY, next);
    setFavorite(!favorite);
    syncPlaces("favorites");
  };


  const share = async () => {
    const url = typeof window !== "undefined" ? new URL(place.href ?? window.location.pathname, window.location.origin).toString() : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: place.name, url });
        return;
      } catch {
        // Dismissed or refused — fall through to the clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared("Link copied.");
    } catch {
      setShared(url);
    }
  };

  const reportHref = `/contact?reason=fault&from=${encodeURIComponent(place.href ?? "")}`;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-1">
        {/* A moment of nothing beats flashing sign-in state at somebody. */}
        {signedIn !== null && (
          <>
            {trip.phase.kind === "added" ? (
              <IconLink icon="suitcase" label="View itinerary" href="/itinerary" active />
            ) : (
              <IconButton
                icon="suitcase"
                label={trip.phase.kind === "working" ? "Adding to itinerary" : "Add to itinerary"}
                onClick={() => trip.start(place)}
              />
            )}
            <IconButton
              icon="route"
              label={inRoute ? "Remove from Route" : "Add to Route"}
              active={inRoute}
              onClick={() => requireSignIn(toggleRoute, "Sign in to add to Route")}
            />
          </>
        )}
        {(place.address || place.coordinates) && (
          <IconLink icon="directions" label="Directions" href={placeDirectionsUrl(place.address, place.coordinates)} />
        )}

        <MoreActions label={place.name}>
          {phone && <IconLink icon="phone" label="Phone" href={`tel:${phone.replace(/[^+\d]/g, "")}`} />}
          {website && <IconLink icon="website" label="Website" href={website} />}
          <IconButton icon="share" label="Share" onClick={() => void share()} />
          {signedIn !== null && (
            <IconButton
              icon={favorite ? "heart-filled" : "heart"}
              label={favorite ? "Remove favorite" : "Favorite"}
              active={favorite}
              onClick={() => requireSignIn(toggleFavorite, "Sign in to save")}
            />
          )}
          <IconLink icon="flag" label="Report" href={reportHref} />
        </MoreActions>
      </div>
      {shared && <p className="mt-2 text-sm font-semibold text-[var(--navy)]" role="status">{shared}</p>}
      {/* An icon that changes colour does not say which of several trips the
          stop landed on. This does. */}
      {trip.phase.kind === "added" && (
        <p className="mt-2" role="status">
          <AddedToTrip tripName={trip.phase.tripName} />
        </p>
      )}
      {trip.phase.kind === "failed" && (
        <p className="mt-2 text-sm font-semibold text-[var(--navy)]" role="status">
          That did not save — try again.
        </p>
      )}
      {trip.dialog}
    </div>
  );
}
