import type { ItinActivity, ItinFlight, ItinLodging, Itinerary } from "@/data/itinerary";
import type { SavedPlace } from "@/data/route-utils";
import { ADD_TO_ROUTE_LABEL, ADD_TO_TRIP_LABEL, SAVE_TRIP_LABEL, VIEW_ROUTE_LABEL, VIEW_TRIP_LABEL } from "@/lib/save-copy";

/**
 * What somebody asked to save, held only long enough to finish signing in.
 *
 * IN MEMORY for the modal. sessionStorage only for the Google round-trip,
 * which has to leave this page — that stash is not a trip, and it is thrown
 * away the moment the action runs or the modal is closed. localStorage is
 * never the record of a trip.
 */

export type TripPatch = {
  flights?: ItinFlight[];
  lodging?: ItinLodging[];
  activities?: ItinActivity[];
  dates?: string[];
};

export type PendingSave =
  | { type: "add-place-to-route"; place: SavedPlace }
  | { type: "remove-place-from-route"; placeId: string; name?: string }
  | { type: "replace-route"; places: SavedPlace[] }
  | { type: "anchor-route"; place: SavedPlace; anchor: "start" | "end" }
  | { type: "add-favorite"; place: SavedPlace }
  | { type: "remove-favorite"; placeId: string }
  | { type: "add-activity-to-trip"; activity: ItinActivity }
  | { type: "merge-trip-patch"; patch: TripPatch; successName?: string }
  | { type: "save-itinerary"; itinerary: Itinerary }
  | { type: "import-shared"; itinerary: Itinerary }
  | { type: "import-route-into-trip"; itinerary: Itinerary };

export type SaveNotice = {
  ok: boolean;
  message: string;
  viewHref?: string;
  viewLabel?: string;
};

const STASH_KEY = "whiteGlovePendingSave";
export const SAVE_RETURN_PARAM = "wg_save";

export function confirmationFor(action: PendingSave): SaveNotice {
  switch (action.type) {
    case "add-place-to-route":
      return {
        ok: true,
        message: `${action.place.name} was added to your route.`,
        viewHref: "/my-route",
        viewLabel: VIEW_ROUTE_LABEL,
      };
    case "remove-place-from-route":
      return { ok: true, message: action.name ? `${action.name} was removed from your route.` : "Removed from your route." };
    case "replace-route":
      return { ok: true, message: "Your route was updated.", viewHref: "/my-route", viewLabel: VIEW_ROUTE_LABEL };
    case "anchor-route":
      return {
        ok: true,
        message: action.anchor === "start" ? `${action.place.name} is now the start of your route.` : `${action.place.name} is now the end of your route.`,
        viewHref: "/my-route",
        viewLabel: VIEW_ROUTE_LABEL,
      };
    case "add-favorite":
      return { ok: true, message: `${action.place.name} was saved to your account.` };
    case "remove-favorite":
      return { ok: true, message: "Removed from your saved places." };
    case "add-activity-to-trip":
      return {
        ok: true,
        message: `${action.activity.name} was added to your trip.`,
        viewHref: "/itinerary",
        viewLabel: VIEW_TRIP_LABEL,
      };
    case "merge-trip-patch":
      return {
        ok: true,
        message: action.successName ? `${action.successName} was added to your trip.` : "Added to your trip.",
        viewHref: "/itinerary",
        viewLabel: VIEW_TRIP_LABEL,
      };
    case "save-itinerary":
      return { ok: true, message: "Your trip was saved to your account.", viewHref: "/itinerary", viewLabel: VIEW_TRIP_LABEL };
    case "import-shared":
      return { ok: true, message: "Added as its own trip — your other trips are untouched.", viewHref: "/itinerary", viewLabel: VIEW_TRIP_LABEL };
    case "import-route-into-trip":
      return { ok: true, message: "Your route was added to this trip.", viewHref: "/itinerary", viewLabel: VIEW_TRIP_LABEL };
  }
}

export function actionLabel(action: PendingSave): string {
  switch (action.type) {
    case "add-place-to-route":
    case "remove-place-from-route":
    case "replace-route":
    case "anchor-route":
      return ADD_TO_ROUTE_LABEL;
    case "save-itinerary":
      return SAVE_TRIP_LABEL;
    default:
      return ADD_TO_TRIP_LABEL;
  }
}

/** Current path plus the flag that tells the page to finish a pending save after Google. */
export function returnToWithSaveFlag(here: string): string {
  const url = new URL(here, "https://whiteglove.invalid");
  url.searchParams.set(SAVE_RETURN_PARAM, "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function stripSaveReturnFlag(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete(SAVE_RETURN_PARAM);
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function stashPendingSave(action: PendingSave): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STASH_KEY, JSON.stringify(action));
  } catch {
    /* private mode — the in-memory copy still covers password sign-in */
  }
}

export function takePendingSave(): PendingSave | null {
  const action = peekPendingSave();
  clearPendingSave();
  return action;
}

export function peekPendingSave(): PendingSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STASH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSave;
    return parsed && typeof parsed.type === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingSave(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STASH_KEY);
  } catch {
    /* ignore */
  }
}
