import Link from "next/link";
import BlockEditor from "@/components/BlockEditor";
import PageList from "@/components/PageList";
import { isDbEnabled } from "@/lib/content-admin";
import { getPageForAdmin, listPagesForAdmin } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  const dbReady = isDbEnabled();
  const [pages, selected] = await Promise.all([listPagesForAdmin(), slug ? getPageForAdmin(slug) : null]);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Pages</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          The words and pictures on the website. Open a page, change a section, and publish when it reads right —
          or save a draft and the website keeps showing what it shows now.
        </p>
      </header>

      {!dbReady && (
        <p className="mt-6 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Editing needs the content database connected. Until then every page shows the version it came with, which is
          what visitors are seeing — nothing is broken, it just cannot be changed from here yet.
        </p>
      )}

      {selected ? (
        <div className="mt-8">
          <Link
            href="/admin/pages"
            className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4"
          >
            ← All pages
          </Link>
          <div className="mt-5">
            <BlockEditor page={selected} />
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <PageList pages={pages} />
        </div>
      )}
    </>
  );
}
