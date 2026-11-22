import { EmptyState } from "@/components/ui/EmptyState";

// Served by the service worker (public/sw.js) when a page isn't already
// saved on the phone and there's no connection to fetch it fresh. Static and
// tiny on purpose — this has to render from the cache with nothing else to
// fetch, the one moment guaranteed to have no network at all.
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-5">
      <div className="w-full max-w-md">
        <EmptyState
          title="You're offline"
          description="Pages you already opened still work."
        />
      </div>
    </main>
  );
}
