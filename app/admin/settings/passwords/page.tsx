import BookingGuestPassSettings from "@/components/BookingGuestPassSettings";
import { BOOKING_GUEST_KEY, bookingStorage } from "@/lib/private-booking-storage";
import PasswordSettings from "@/components/PasswordSettings";
import { passwordStorageAvailable } from "@/lib/access-passwords";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function PasswordSettingsPage() {
  const guest = await bookingStorage<string | null>("GET", BOOKING_GUEST_KEY).catch(() => null);
  const expires = Number(guest?.split(".")[0]);
  const activeUntil = Number.isFinite(expires) ? expires : null;
  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Passwords" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Two codes: the one that opens this admin area, and the one visitors type when the website is closed.
          Changing either signs everyone out who was using the old one.
        </p>
      </header>

      <div className="mt-8">
        <PasswordSettings available={passwordStorageAvailable()} />
        <BookingGuestPassSettings activeUntil={activeUntil} />
      </div>
    </>
  );
}
