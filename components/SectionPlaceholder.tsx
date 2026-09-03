export default function SectionPlaceholder({
  title = "Nothing to show here",
  description = "There is nothing to show for this section right now.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="border border-dashed border-[var(--gold-light)] bg-[#FAF8F3] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">{title}</p>
      <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
    </div>
  );
}
