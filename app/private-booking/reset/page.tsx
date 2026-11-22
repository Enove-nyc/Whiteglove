import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import BookingPasswordInput from "@/components/BookingPasswordInput";
import { BOOKING_ORIGIN, BOOKING_PASSWORD_MIN, BOOKING_RESET_COOKIE, bookingRecoveryAvailable, getBookingOrigin, validBookingResetToken } from "@/lib/private-booking";

export const dynamic = "force-dynamic";

export default async function BookingReset({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (getBookingOrigin(await headers()) !== BOOKING_ORIGIN || !bookingRecoveryAvailable()) notFound();
  const query = await searchParams;
  const token = (await cookies()).get(BOOKING_RESET_COOKIE)?.value ?? "";
  const ready = await validBookingResetToken(token).catch(() => false);
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-[var(--gold-light)] bg-white p-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Reset booking password</h1>
      {query.sent && <p role="status" className="mt-4">If that is the owner’s email, a reset link is on its way.</p>}
      {query.expired && <p role="alert" className="mt-4">This link has expired or has already been used. Request a new one below.</p>}
      {query.limited && <p role="alert" className="mt-4">Too many requests. Try again in 15 minutes.</p>}
      {query.unavailable && <p role="alert" className="mt-4">Password recovery is temporarily unavailable. Try again shortly.</p>}
      {ready ? (
        <form action="/api/private-booking/reset" method="post" className="mt-6 grid gap-4">
          <label htmlFor="booking-password" className="font-semibold">New booking password</label>
          <p>Use at least {BOOKING_PASSWORD_MIN} characters.</p>
          <BookingPasswordInput autoComplete="new-password" minLength={BOOKING_PASSWORD_MIN} />
          {query.length && <p role="alert">Use between {BOOKING_PASSWORD_MIN} and 128 characters.</p>}
          {query.invalid && <p role="alert">Choose a different password.</p>}
          <button type="submit" className="rounded bg-[var(--navy)] px-4 py-3 font-semibold text-white">Save new password</button>
        </form>
      ) : (
        <form action="/api/private-booking/forgot" method="post" className="mt-6 grid gap-4">
          <label htmlFor="booking-owner-email" className="font-semibold">Owner email address</label>
          <input id="booking-owner-email" name="email" type="email" required maxLength={254}
            autoComplete="email" className="rounded border border-stone-400 px-3 py-2" />
          <button type="submit" className="rounded bg-[var(--navy)] px-4 py-3 font-semibold text-white">Email reset link</button>
        </form>
      )}
      <Link href="/private-booking/access" className="mt-5 inline-block underline">Back to sign-in</Link>
    </section>
  );
}
