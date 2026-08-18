/**
 * The address a visitor is actually at, for a redirect that has to land there.
 *
 * `request.url` IS NOT IT, BEHIND A PROXY. Railway terminates TLS at its edge
 * and forwards to the container over plain HTTP on a local port, so Next sees
 * a request whose URL is http://localhost:8080/… — and `new URL("/account",
 * request.url)` produces a redirect to localhost. On the developer's machine
 * that is right and everything works; in production it is a page that cannot
 * load on any computer that is not the server.
 *
 * That is exactly what happened to Google sign-in. The trip out to Google was
 * fine, because it uses the configured site address on purpose. The trip back
 * — the redirect after a successful sign-in — used request.url, so anybody who
 * signed in with Google arrived at localhost and never reached their account.
 *
 * THE ORDER MATTERS. The configured address first: it is a decision somebody
 * made and it cannot be spoofed. Then the forwarded headers, which are what a
 * proxy tells us and are right in every ordinary deployment. Only then the
 * request's own URL, which is correct in development and wrong in production —
 * so it is the last resort rather than the first.
 */

import { siteOrigin } from "@/lib/seo";

type HeaderBag = { get(name: string): string | null };

export function publicOrigin(request: { headers: HeaderBag; url: string; nextUrl?: { origin: string } }): string {
  const configured = siteOrigin()?.origin;
  if (configured) return configured;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    // A proxy that terminates TLS says so here; without it, assume https for
    // anything that is not obviously a development machine.
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
    return `${proto}://${host}`;
  }

  return request.nextUrl?.origin ?? new URL(request.url).origin;
}

/** A path on this site, made absolute against the address the visitor is at. */
export function publicUrl(
  request: { headers: HeaderBag; url: string; nextUrl?: { origin: string } },
  path: string,
): URL {
  return new URL(path, publicOrigin(request));
}
