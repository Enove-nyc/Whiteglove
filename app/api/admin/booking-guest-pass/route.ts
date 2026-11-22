import { NextResponse, type NextRequest } from "next/server";
import { currentAdmin } from "@/lib/admin-current";
import { canOpen } from "@/lib/admin-permissions";
import { BOOKING_GUEST_DURATIONS, createGuestPass } from "@/lib/private-booking";
import { BOOKING_GUEST_KEY, bookingStorage } from "@/lib/private-booking-storage";
import { sameOrigin } from "@/lib/secure-access";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  const admin = await currentAdmin();
  if (!admin.identity || !canOpen(admin.areas, "/admin/settings/passwords") || !sameOrigin(request)) {
    return NextResponse.json({ error: "Sign in to manage booking guest passes." }, { status: 403, headers });
  }
  const body = await request.json().catch(() => null);
  try {
    if (body?.action === "revoke") {
      await bookingStorage("DEL", BOOKING_GUEST_KEY);
      return NextResponse.json({ ok: true }, { headers });
    }
    const duration = BOOKING_GUEST_DURATIONS.find((value) => value === body?.duration);
    if (!duration) return NextResponse.json({ error: "Choose an hour, a day, or a week." }, { status: 400, headers });
    return NextResponse.json(await createGuestPass(duration), { headers });
  } catch {
    return NextResponse.json({ error: "Booking guest passes are temporarily unavailable." }, { status: 503, headers });
  }
}
