import { NextResponse, type NextRequest } from "next/server";
import { recordFailedAttempt, tooManyAttempts } from "@/lib/access-attempts";
import {
  BOOKING_COOKIE, BOOKING_SESSION_SECONDS, bookingPassword,
  bookingSignature, equalBookingValue, getBookingOrigin,
} from "@/lib/private-booking";

export async function POST(request: NextRequest) {
  const origin = getBookingOrigin(request.headers);
  if (!origin || request.headers.get("origin") !== origin) {
    return new NextResponse(null, { status: 403 });
  }
  // Eight wrong tries in 15 minutes from one connection locks it out for the
  // rest of the window — the same rule as the admin sign-in.
  if (await tooManyAttempts(request, "booking")) {
    return NextResponse.redirect(new URL("/private-booking/access?locked=1", origin), 303);
  }
  const password = bookingPassword();
  const form = await request.formData().catch(() => null);
  const submitted = form?.get("password");
  if (!password || typeof submitted !== "string" || !equalBookingValue(submitted, password)) {
    await recordFailedAttempt(request, "booking");
    return NextResponse.redirect(new URL("/private-booking/access?invalid=1", origin), 303);
  }
  const expires = Math.floor(Date.now() / 1000) + BOOKING_SESSION_SECONDS;
  const signature = await bookingSignature(`access:${expires}:${password}`);
  if (!signature) return new NextResponse(null, { status: 503 });
  const response = NextResponse.redirect(origin, 303);
  response.cookies.set(BOOKING_COOKIE, `${expires}.${signature}`, {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: BOOKING_SESSION_SECONDS,
  });
  return response;
}
