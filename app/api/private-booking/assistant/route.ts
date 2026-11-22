import { NextResponse, type NextRequest } from "next/server";
import { DUFFEL_API_ORIGIN, duffelApiHeaders } from "@/lib/duffel-api";
import { duffelBearer } from "@/lib/duffel-token";
import { bookingPreviewCanSearch, bookingSignature, equalBookingValue, getBookingOrigin, hasBookingAccess } from "@/lib/private-booking";

export async function POST(request: NextRequest) {
  const origin = getBookingOrigin(request.headers);
  if (!origin || request.headers.get("origin") !== origin || !(await hasBookingAccess(request))) {
    return NextResponse.json({ message: "Please unlock booking first." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const match = typeof body?.receipt === "string" && /^(icu_[A-Za-z0-9]+)\.(\d{10})\.([a-f0-9]{64})$/.exec(body.receipt);
  if (!match || Number(match[2]) <= Date.now() / 1000) {
    return NextResponse.json({ message: "This booking support session has expired." }, { status: 403 });
  }
  const [, userId, expires, received] = match;
  const signature = await bookingSignature(`assistant:${userId}.${expires}`);
  if (!signature || !equalBookingValue(received, signature)) {
    return NextResponse.json({ message: "This booking support session is invalid." }, { status: 403 });
  }

  if (!bookingPreviewCanSearch(request.headers)) {
    return NextResponse.json({ message: "Preview booking requires a Duffel test token." }, { status: 503 });
  }
  const access = duffelBearer();
  if (!access.ok) return NextResponse.json({ message: "Booking support is unavailable." }, { status: 503 });
  const response = await fetch(`${DUFFEL_API_ORIGIN}/identity/component_client_keys`, {
    method: "POST",
    headers: { ...duffelApiHeaders(access.token), "Duffel-Version": "v1" },
    body: JSON.stringify({ data: { user_id: userId } }),
    cache: "no-store",
  });
  const result = response.ok ? await response.json() : null;
  const clientKey = result?.data?.component_client_key;
  if (!clientKey) return NextResponse.json({ message: "Booking support is unavailable." }, { status: 502 });
  return NextResponse.json({ clientKey }, { headers: { "Cache-Control": "private, no-store" } });
}
