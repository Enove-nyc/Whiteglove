import { NextResponse, type NextRequest } from "next/server";
import { recordFailedAttempt, tooManyAttempts } from "@/lib/access-attempts";
import {
  BOOKING_COOKIE, createBookingSession, getBookingOrigin,
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
  const form = await request.formData().catch(() => null);
  const submitted = form?.get("password");
  const session = typeof submitted === "string"
    ? await createBookingSession(request.headers, submitted).catch(() => undefined)
    : null;
  if (session === undefined) return new NextResponse("Booking sign-in is temporarily unavailable.", { status: 503 });
  if (!session) {
    await recordFailedAttempt(request, "booking");
    return NextResponse.redirect(new URL("/private-booking/access?invalid=1", origin), 303);
  }
  const response = NextResponse.redirect(origin, 303);
  response.cookies.set(BOOKING_COOKIE, session.value, {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: session.maxAge,
  });
  return response;
}
