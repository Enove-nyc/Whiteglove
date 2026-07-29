import { NextRequest, NextResponse } from "next/server";
import { readApiKey } from "@/lib/api-key";
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

  const read = readApiKey("GOOGLE_MAPS_API_KEY");
  if (!read.key && !read.unusable) {
    return NextResponse.json({
      keySet: false,
      ok: false,
      engine: "none",
      advice:
        "GOOGLE_MAPS_API_KEY is not set on this deployment. Driving times are falling back to the open router, which assumes empty roads and runs short. Add the variable in Vercel, then redeploy — environment variables are read at build time.",
    });
  }

  // The value is set but is not a key. Say that here rather than sending it and
  // reporting whatever fetch throws — "invalid header value" told the owner
  // nothing, and the advice underneath it sent them looking at the network.
  if (read.unusable || !read.key) {
    return NextResponse.json({
      keySet: true,
      ok: false,
      engine: "google",
      error: "The value in GOOGLE_MAPS_API_KEY is not a usable key.",
      advice: read.problems.join(" "),
    });
  }
  const key = read.key;

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
      // Working, but say so if it only worked because the value was cleaned on
      // the way out — the next person to copy that variable inherits the fault.
      advice: read.cleaned
        ? `Working, but the stored value needed cleaning first. ${read.problems.join(" ")}`
        : "Working. The planner is showing the same driving times Google Maps would give for typical traffic.",
      warning: read.cleaned ? read.problems.join(" ") : undefined,
    });
  } catch (error) {
    const message = redactError(error);
    // Not every failure here is the network, and saying it is sends people to
    // look in the wrong place. Separate the request that never left this
    // process from the one that left and got nowhere.
    let advice = "The request to Google could not be completed. If this persists, check the deployment has outbound network access.";
    if (/invalid header|Headers\.append|invalid character/i.test(message)) {
      advice =
        "The request was never sent — it could not even be assembled, because the stored key is not something that can go in an HTTP header. That is almost always an invisible character pasted in with the key. Delete the variable in Vercel, type or paste the key again, and redeploy.";
    } else if (/aborted|timeout|timed out/i.test(message)) {
      advice = "Google did not answer within twelve seconds. That is usually Google being slow rather than anything wrong with the key — try again.";
    } else if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)) {
      advice = "The deployment could not resolve routes.googleapis.com. This one really is the network.";
    }
    return NextResponse.json({ keySet: true, ok: false, engine: "google", error: message, advice });
  }
}
