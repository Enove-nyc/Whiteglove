import Link from "next/link";
import SiteWordsForm from "@/components/SiteWordsForm";
import { getAdminContent } from "@/lib/admin-content";
import { changedWords, whatTheOldScreenSaved } from "@/lib/site-words";
import { readWordsFresh, wordsStoreAvailable } from "@/lib/site-words-store";

export const dynamic = "force-dynamic";

export default async function SiteWordsSettings() {
  // Read uncached, unlike everywhere else: this screen has to show what was
  // saved a second ago, not what the site is serving from cache.
  const current = await readWordsFresh();
  // And whatever the previous settings screen had saved and never showed.
  const old = await getAdminContent().then((c) => c.bundle.settings as unknown as Record<string, string>).catch(() => null);

  const changed = changedWords(current);

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">The website’s words</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              The headline on the front page, the line under it, the address people are told to write to, and the
              paragraph at the bottom of every page. Each one says where it appears, and links to it.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              {changed.length === 0
                ? "Nothing here has been changed yet — the site is saying the words it ships with."
                : `Changed so far — ${changed.map((f) => f.label.toLowerCase()).join(" · ")}.`}
            </p>
          </div>
          <Link href="/admin/settings" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Settings</Link>
        </div>
      </header>

      <SiteWordsForm current={current} storeReady={wordsStoreAvailable()} oldSettings={whatTheOldScreenSaved(old, current)} />
    </>
  );
}
