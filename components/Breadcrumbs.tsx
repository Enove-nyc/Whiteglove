import Link from "next/link";

/**
 * Short, visible breadcrumbs — "Destinations / Paris", nothing longer. The
 * last crumb is the page itself and isn't a link.
 */
export default function Breadcrumbs({ trail }: { trail: Array<{ name: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={crumb.name} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {crumb.href && !last ? (
                <Link href={crumb.href} className="hover:text-[var(--navy)]">
                  {crumb.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-[var(--navy)]" : undefined}>
                  {crumb.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
