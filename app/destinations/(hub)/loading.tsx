/**
 * While the destinations are being read.
 *
 * IN A ROUTE GROUP, AND THAT IS THE WHOLE REASON THE GROUP EXISTS. A loading.tsx
 * applies to its segment AND every segment below it, so this file — sitting at
 * app/vacation-ideas — was also the loading boundary for one destination page.
 * Two things followed, both bad. Opening /vacation-ideas/rome from a search
 * result said "Loading vacation destinations…" over a grid of card outlines,
 * which is the shape of the hub and not of the page that was coming. And an
 * address that is not a destination answered 200 with this skeleton on it for
 * ever, because the shell had already been flushed by the time notFound() ran:
 * a wrong URL was a permanent loading spinner rather than a 404.
 *
 * The (hub) group holds the page this is actually for. It changes no URL and
 * takes the destination pages out from under this boundary — they are
 * prerendered whole and have their own skeletons inside, per section.
 *
 * The vacation pages are rendered per request — they read the attractions,
 * stays and quarters through lib/attractions-view.ts so anything the owner
 * adds appears without a deploy — and on a cold database that read is not
 * instant. Without this the browser sits on the previous page and the site
 * feels stuck rather than busy.
 *
 * SHAPED LIKE WHAT IS COMING, not a spinner: a heading block and a grid of
 * cards, so the page does not jump when the real content lands.
 *
 * It says so out loud as well as showing it. A screen reader gets nothing at
 * all from a grey rectangle, so the status line is the real message and the
 * blocks below it are hidden from the accessibility tree entirely.
 */
export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--cream)] px-5 py-16 sm:px-8" aria-busy="true">
      <div className="mx-auto max-w-7xl">
        <p role="status" className="text-sm font-semibold text-[var(--navy)]">
          Loading vacation destinations…
        </p>

        <div aria-hidden="true" className="mt-8 animate-pulse">
          <div className="h-4 w-40 rounded bg-[var(--cream-deep)]" />
          <div className="mt-4 h-10 w-2/3 max-w-xl rounded bg-[var(--cream-deep)]" />
          <div className="mt-3 h-4 w-full max-w-2xl rounded bg-[var(--cream-deep)]" />

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="overflow-hidden rounded-xl border border-[var(--gold-light)] bg-[var(--surface)]">
                <div className="h-28 bg-[var(--cream-deep)]" />
                <div className="space-y-3 p-6">
                  <div className="h-4 w-full rounded bg-[var(--cream-deep)]" />
                  <div className="h-4 w-4/5 rounded bg-[var(--cream-deep)]" />
                  <div className="h-9 w-1/2 rounded bg-[var(--cream-deep)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
