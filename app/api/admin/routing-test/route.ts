import { NextRequest, NextResponse } from "next/server";
import { redact, redactError } from "@/lib/redact";
import { isValidAccessToken } from "@/lib/secure-access";

// Is the Google Routes key actually working?
//
// "The key is set" and "the key works" are different questions, and only the
// second one matters. A key can be present but unrestricted-in-the-wrong-way,
// attached to a project without billing, or restricted to the Directions API
// instead of Routes — and every one of those failures looks identical from the
// planner: driving times quietly fall back to the estimate.
//
// So this runs a real request over a known road and reports exactly what came
// back, including Google's own error text when it refuses.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kraków → Leżajsk. A route this site actually sends people down, long enough
// that a wrong answer is obvious.
const FROM = { lat: 50.0647, lng: 19.945, name: "Kraków" };
const TO = { lat: 50.2511, lng: 22.4226, name: "Leżajsk" };

function admin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

function nextTuesday9am(): string {
  const d = new Date();
  d.setUTCHours(9, 0, 0, 0);
  const daysAhead = (2 - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString();
}

export async function GET(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });

  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({
      keySet: false,
      ok: false,
      engine: "none",
      advice:
        "GOOGLE_MAPS_API_KEY is not set on this deployment. Driving times are falling back to the open router, which assumes empty roads and runs short. Add the variable in Vercel, then redeploy — environment variables are read at build time.",
    });
  }

  const point = (p: { lat: number; lng: number }) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });

  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: point(FROM),
        destination: point(TO),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        departureTime: nextTuesday9am(),
        units: "METRIC",
      }),
    });

    const body = await res.text().catch(() => "");

    if (!res.ok) {
      // Google's message names the actual problem; pass it through rather than
      // guessing, and add the fix for the mistakes that are easy to make.
      let advice = "Google refused the request. The message above is Google's own.";
      if (/API_KEY_SERVICE_BLOCKED|not authorized to use this API|has not been used/i.test(body)) {
        advice =
          "The key is not allowed to call the Routes API. Two things to check: the Routes API is enabled on the project (console.cloud.google.com/apis/library/routes.googleapis.com), and the key's API restrictions list Routes API — not Directions API, which is the older service this site does not use.";
      } else if (/API key not valid|API_KEY_INVALID/i.test(body)) {
        advice = "The key itself is not valid. Copy it again from APIs & Services → Credentials, checking the project name at the top matches the one where Routes API is enabled.";
      } else if (/billing/i.test(body)) {
        advice = "Billing is not enabled on the Google Cloud project. Routes API needs a billing account attached even while you are inside the free monthly credit.";
      } else if (/referer|referrer|IP address|application restrictions/i.test(body)) {
        advice =
          "The key's Application restrictions are blocking this. Requests come from the server, not a browser, so set Application restrictions to None and rely on the API restriction instead.";
      }
      // Google quotes the request back in some refusals, so the key can appear
      // in its own error text. Never let that reach the browser.
      return NextResponse.json({ keySet: true, ok: false, engine: "google", status: res.status, error: redact(body).slice(0, 800), advice });
    }

    const data = JSON.parse(body) as { routes?: Array<{ duration?: string; distanceMeters?: number }> };
    const route = data.routes?.[0];
    const seconds = Number(/^(\d+(?:\.\d+)?)s$/.exec(route?.duration ?? "")?.[1]);
    if (!Number.isFinite(seconds)) {
      return NextResponse.json({ keySet: true, ok: false, engine: "google", error: "Google answered but without a usable duration.", raw: redact(body).slice(0, 400) });
    }

    const minutes = Math.round(seconds / 60);
    return NextResponse.json({
      keySet: true,
      ok: true,
      engine: "google",
      route: `${FROM.name} → ${TO.name}`,
      minutes,
      readable: `${Math.floor(minutes / 60)} h ${minutes % 60} m`,
      km: route?.distanceMeters ? Math.round(route.distanceMeters / 1000) : null,
      advice: "Working. The planner is showing the same driving times Google Maps would give for typical traffic.",
    });
  } catch (error) {
    return NextResponse.json({
      keySet: true,
      ok: false,
      engine: "google",
      error: redactError(error),
      advice: "The request to Google could not be completed. If this persists, check the deployment has outbound network access.",
    });
  }
}
