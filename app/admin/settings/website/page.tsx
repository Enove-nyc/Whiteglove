import LockedSectionsControl from "@/components/LockedSectionsControl";
import SiteLockControl from "@/components/SiteLockControl";
import { getDashboardStats, getLockedPaths } from "@/lib/site-analytics";

export const dynamic = "force-dynamic";

export default async function WebsiteAccessSettings() {
  const [stats, lockedPaths] = await Promise.all([getDashboardStats(), getLockedPaths()]);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Website access</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Close the whole website while you are working on it, or close just a few parts. Anyone you have given
          access to can still see it — they sign in to their own account, so nobody needs a shared password.
        </p>
      </header>

      <div className="mt-8 space-y-5">
        <SiteLockControl initialLocked={stats.siteLocked} configured={stats.configured} />
        <LockedSectionsControl initialPaths={lockedPaths} available={stats.configured} />
      </div>
    </>
  );
}
