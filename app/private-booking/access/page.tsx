import Link from "next/link";
import { headers } from "next/headers";
import BookingPasswordInput from "@/components/BookingPasswordInput";
import { BOOKING_ORIGIN, bookingLoginAvailable, bookingRecoveryAvailable, getBookingOrigin } from "@/lib/private-booking";

export const dynamic = "force-dynamic";

export default async function BookingAccess({ searchParams }: { searchParams: Promise<{ invalid?: string; locked?: string; reset?: string }> }) {
  const { invalid, locked, reset } = await searchParams;
  const requestHeaders = await headers();
  const canRecover = getBookingOrigin(requestHeaders) === BOOKING_ORIGIN && bookingRecoveryAvailable();
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-[var(--gold-light)] bg-white p-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Private flight booking</h1>
      {reset && <p role="status" className="mt-4">Booking password updated.</p>}
      {await bookingLoginAvailable(requestHeaders) ? (
        <form action="/api/private-booking/access" method="post" className="mt-6 grid gap-4">
          <label htmlFor="booking-password" className="font-semibold">Booking password</label>
          <BookingPasswordInput />
          {invalid && !locked && <p role="alert" className="text-red-800">That password didn’t match.</p>}
          {locked && <p role="alert" className="text-red-800">Too many tries. Try again in 15 minutes.</p>}
          <button type="submit" className="rounded bg-[var(--navy)] px-4 py-3 font-semibold text-white">Continue</button>
        </form>
      ) : <p className="mt-5">Private booking is currently unavailable.</p>}
      {canRecover && <Link href="/private-booking/reset" className="mt-5 inline-block underline">Forgot password?</Link>}
    </section>
  );
}
