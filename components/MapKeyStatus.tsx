"use client";

import { useEffect, useState } from "react";
import { googleMapsAvailable, googleMapsBrowserKeyMalformed, loadGoogleMaps } from "@/lib/google-maps-loader";

// Is the map drawing with Google, or with the free fallback?
//
// Worth its own check because the failure is silent. A browser key that is set
// but restricted to the wrong hostname, or on a project with no billing
// account, does not produce an error anywhere a person would look — the map
// simply draws with OpenStreetMap instead, which looks fine until somebody
// notices the roads are not the ones they navigate by.
//
// So this does the real thing: it asks the browser to load Google's map script
// exactly as the map pages do, and reports what happened.

type State = "checking" | "no-key" | "bad-key" | "working" | "refused";

export default function MapKeyStatus() {
  // Whether a key exists is a build-time constant, the same on the server and
  // in the browser, so it is the starting state rather than something an effect
  // has to discover. Only whether Google ACCEPTS it needs finding out.
  const hasKey = googleMapsAvailable();
  // "Set but not a key" is its own answer. Without it the screen tells the
  // owner to add a variable that is sitting right there in Vercel.
  const malformed = googleMapsBrowserKeyMalformed();
  const [state, setState] = useState<State>(hasKey ? "checking" : malformed ? "bad-key" : "no-key");

  useEffect(() => {
    if (!hasKey) return;
    let live = true;
    loadGoogleMaps()
      .then((ok) => live && setState(ok ? "working" : "refused"))
      .catch(() => live && setState("refused"));
    return () => {
      live = false;
    };
  }, [hasKey]);

  const tone =
    state === "working"
      ? "border-green-600 bg-green-50"
      : state === "refused" || state === "bad-key"
        ? "border-red-400 bg-red-50"
        : "border-[var(--gold)] bg-[#fcfaf6]";

  return (
    <section className={`border-l-4 ${tone} border-y border-r border-[var(--gold-light)] p-6`}>
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">The map</h2>

      {state === "checking" && <p className="mt-3 text-sm leading-6 text-stone-600">Checking…</p>}

      {state === "no-key" && (
        <>
          <p className="mt-3 text-sm leading-6 text-stone-700">
            <strong>Drawing with OpenStreetMap.</strong> The map works and nothing is broken, but it is not the map
            people navigate by, so a kever pinned on it can look like it is somewhere slightly different.
          </p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            To use Google&apos;s map, add <code className="rounded bg-white px-1">NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code>{" "}
            in Vercel and redeploy. It must be a <em>different</em> key from the one that works out driving times.
          </p>
        </>
      )}

      {state === "bad-key" && (
        <>
          <p className="mt-3 text-sm leading-6 text-stone-700">
            <strong>The key is set, but the value is not a key.</strong> It holds a character that cannot appear in
            one — almost always something invisible picked up when the key was copied, which looks identical to a
            correct key in every box you paste it into. Visitors are seeing the OpenStreetMap map.
          </p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Delete <code className="rounded bg-white px-1">NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code> in Vercel, copy
            the key again straight from Google&apos;s console rather than from a document or a message, and redeploy.
          </p>
        </>
      )}

      {state === "working" && (
        <p className="mt-3 text-sm leading-6 text-stone-700">
          <strong>Drawing with Google.</strong> The key is set, Google accepted it from this address, and the map
          script loaded.
        </p>
      )}

      {state === "refused" && (
        <>
          <p className="mt-3 text-sm leading-6 text-stone-700">
            <strong>A key is set, but Google would not load the map here.</strong> Visitors are seeing the
            OpenStreetMap map instead. Almost always one of three things:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-stone-600">
            <li>
              The key&apos;s <em>website restrictions</em> do not include this address. Add the site&apos;s domain and
              the Vercel preview domain, and remember the admin hostname if you have one.
            </li>
            <li>
              <em>Maps JavaScript API</em> is not enabled on the Google Cloud project the key belongs to.
            </li>
            <li>That project has no billing account. Google will not serve the map without one, even inside the free allowance.</li>
          </ul>
        </>
      )}

      {/* The one key on the site that is meant to be public, said plainly, so
          nobody tries to "fix" it by hiding it — or reuses the server key here. */}
      <p className="mt-4 border-t border-[var(--gold-light)] pt-3 text-xs leading-5 text-stone-500">
        This key is the one exception to keys never reaching the browser: Google&apos;s map runs in the visitor&apos;s
        browser, so its key necessarily goes out in the page. That is normal, and it is protected by restricting it —
        to the Maps JavaScript API and to your own hostnames — rather than by hiding it. Which is exactly why it must
        not be the same key as the server&apos;s.
      </p>
    </section>
  );
}
