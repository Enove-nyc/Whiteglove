import { NextResponse, type NextRequest } from "next/server";
import {
  BOOKING_COOKIE, BOOKING_ORIGIN, BOOKING_PASSWORD_MIN, BOOKING_RESET_COOKIE, BOOKING_RESET_SECONDS,
  getBookingOrigin, resetBookingPassword, validBookingResetToken,
} from "@/lib/private-booking";

const options = { secure: true, httpOnly: true, sameSite: "lax" as const, path: "/" };
const redirect = (path: string) => NextResponse.redirect(new URL(path, BOOKING_ORIGIN), {
  status: 303, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
});

export async function GET(request: NextRequest) {
  if (getBookingOrigin(request.headers) !== BOOKING_ORIGIN) return new NextResponse(null, { status: 404 });
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!(await validBookingResetToken(token).catch(() => false))) {
    return redirect("/private-booking/reset?expired=1");
  }
  const response = redirect("/private-booking/reset");
  response.cookies.set(BOOKING_RESET_COOKIE, token, { ...options, maxAge: BOOKING_RESET_SECONDS });
  return response;
}

export async function POST(request: NextRequest) {
  if (getBookingOrigin(request.headers) !== BOOKING_ORIGIN || request.headers.get("origin") !== BOOKING_ORIGIN) {
    return new NextResponse(null, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  const password = form?.get("password");
  if (typeof password !== "string" || password.trim().length < BOOKING_PASSWORD_MIN || password.length > 128) {
    return redirect("/private-booking/reset?length=1");
  }
  const token = request.cookies.get(BOOKING_RESET_COOKIE)?.value ?? "";
  try {
    if (!await resetBookingPassword(token, password)) {
      return redirect(await validBookingResetToken(token) ? "/private-booking/reset?invalid=1" : "/private-booking/reset?expired=1");
    }
  } catch {
    return redirect("/private-booking/reset?unavailable=1");
  }
  const response = redirect("/private-booking/access?reset=1");
  response.cookies.set(BOOKING_RESET_COOKIE, "", { ...options, maxAge: 0 });
  response.cookies.set(BOOKING_COOKIE, "", { ...options, sameSite: "strict", maxAge: 0 });
  return response;
}
