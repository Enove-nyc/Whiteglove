/**
 * Official Duffel API request building blocks.
 *
 * These headers exist so every server call matches
 * https://duffel.com/docs/api/overview/making-requests — versioning, Bearer
 * auth, JSON, and gzip. They belong on requests from this app's server to
 * api.duffel.com. They must not appear in public pages, partner widgets, or
 * visitor-facing JavaScript.
 */

export const DUFFEL_API_ORIGIN = "https://api.duffel.com";
export const DUFFEL_API_VERSION = "v2";
export const DUFFEL_DASHBOARD = "https://duffel.com";

export function duffelApiHeaders(token: string, extra?: Record<string, string>): HeadersInit {
  return {
    Accept: "application/json",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
    "Duffel-Version": DUFFEL_API_VERSION,
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}
