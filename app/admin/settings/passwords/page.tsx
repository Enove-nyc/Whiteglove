import PasswordSettings from "@/components/PasswordSettings";
import { passwordStorageAvailable } from "@/lib/access-passwords";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default function PasswordSettingsPage() {
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
      </div>
    </>
  );
}
