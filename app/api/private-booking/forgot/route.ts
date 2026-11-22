import { NextResponse, type NextRequest } from "next/server";
import { sendBookingPasswordResetEmail } from "@/lib/email";
import { BOOKING_ORIGIN, bookingOwnerEmail, bookingRecoveryAvailable, createBookingResetToken, getBookingOrigin } from "@/lib/private-booking";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (getBookingOrigin(request.headers) !== BOOKING_ORIGIN || request.headers.get("origin") !== BOOKING_ORIGIN) {
    return new NextResponse(null, { status: 403 });
  }
  const redirect = (query: string) => NextResponse.redirect(new URL("/private-booking/reset?" + query, BOOKING_ORIGIN), 303);
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const attempt = await rateLimit(`booking-reset-ip:${address}`, { limit: 4, windowSeconds: 900 });
  if (!attempt.ok) return redirect("limited=1");

  const form = await request.formData().catch(() => null);
  const email = form?.get("email");
  const owner = bookingOwnerEmail();
  if (!bookingRecoveryAvailable() || typeof email !== "string" || email.trim().toLowerCase() !== owner) {
    return redirect("sent=1");
  }
  const delivery = await rateLimit("booking-reset-owner", { limit: 3, windowSeconds: 900 });
  if (!delivery.ok) return redirect("sent=1");
  try {
    const token = await createBookingResetToken();
    if (!token) return redirect("unavailable=1");
    const link = new URL("/api/private-booking/reset", BOOKING_ORIGIN);
    link.searchParams.set("token", token);
    return redirect(await sendBookingPasswordResetEmail(owner, link.href) ? "sent=1" : "unavailable=1");
  } catch {
    return redirect("unavailable=1");
  }
}
