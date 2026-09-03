import { headers } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * The admin app's web manifest — served here rather than as a static file so it
 * can be HOST-AWARE, which is the whole reason the installed icon was opening in
 * the browser instead of as an app.
 *
 * WHY start_url CANNOT BE A CONSTANT. The dashboard lives at two different URLs
 * depending on where it is served: under /admin on the main site, but at the
 * ROOT ("/") on the dedicated admin hostname (ADMIN_HOST), where middleware
 * rewrites every path. A manifest whose start_url is "/admin" launches fine on
 * the main site, but on the admin host "/admin" 3xx-redirects (to the sign-in,
 * or to "/") the instant it opens — and iOS/Android react to a redirect at
 * launch by dumping the app into the browser instead of opening it standalone.
 * That is exactly the "it goes straight to the browser" symptom.
 *
 * So start_url and scope follow the host: "/" on the admin host (no redirect,
 * and a scope that covers the real pages), "/admin" everywhere else. The
 * manifest itself is reachable without a login — middleware lets any path with a
 * file extension straight through — so the browser can read it before anyone
 * signs in, which installing the app requires.
 *
 * After this ships, an already-installed icon keeps its OLD cached manifest:
 * remove it from the home screen and add it again to pick up the fix.
 */
export async function GET() {
  const host = (await headers()).get("host")?.toLowerCase().split(":")[0] ?? "";
  const configured = process.env.ADMIN_HOST?.trim().toLowerCase().split(":")[0] ?? "";
  const onAdminHost = Boolean(configured && host === configured);
  // The one non-redirecting, in-scope launch URL for this host.
  const base = onAdminHost ? "/" : "/admin";

  const manifest = {
    id: base,
    name: "White Glove Admin",
    short_name: "WG Admin",
    description: "Owner dashboard for White Glove — content, accounts, finances, advertisements, and analytics.",
    start_url: base,
    scope: base,
    display: "standalone",
    background_color: "#D5CEC3",
    theme_color: "#102F35",
    orientation: "portrait",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-admin-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-admin-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-admin-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      // Host-dependent, so never let a shared cache hand one host the other's
      // copy; small and fetched rarely, so no-store costs nothing.
      "cache-control": "no-store",
    },
  });
}
