import { NextResponse, type NextRequest } from "next/server";
import {
  BOOKING_COOKIE, BOOKING_SESSION_SECONDS, bookingPassword,
  bookingSignature, equalBookingValue, getBookingOrigin,
} from "@/lib/private-booking";

export async function POST(request: NextRequest) {
  const origin = getBookingOrigin(request.headers);
  if (!origin || request.headers.get("origin") !== origin) {
    return new NextResponse(null, { status: 403 });
  }
  const password = bookingPassword();
  const form = await request.formData().catch(() => null);
  const submitted = form?.get("password");
  if (!password || typeof submitted !== "string" || !equalBookingValue(submitted, password)) {
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
