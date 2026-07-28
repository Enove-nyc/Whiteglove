import Link from "next/link";
import { ADMIN_TOOL_GROUPS } from "@/lib/admin-tools";

// What you can do, grouped and described.
//
// A dozen buttons all labelled with a noun and styled the same is a memory
// test. These say what each screen is for, in the words you would use asking
// for it, and sit under headings that answer "which one holds the thing I want".
export default function AdminToolGrid() {
  return (
    <div className="space-y-8">
      {ADMIN_TOOL_GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{group.title}</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">{group.detail}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)]"
              >
                <span className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
                  {tool.name}
                </span>
                <span className="mt-2 text-sm leading-6 text-stone-600">{tool.blurb}</span>
                <span className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] transition group-hover:text-[var(--navy)]">
                  Open →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
