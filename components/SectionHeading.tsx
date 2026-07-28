import GloveMark from "@/components/GloveMark";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: SectionHeadingProps) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {/* The glove sits with every section eyebrow, so the mark recurs down
          the page instead of appearing only in the header. */}
      <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)] ${centered ? "justify-center" : ""}`}>
        <GloveMark size="xs" />
        {eyebrow}
      </p>
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">{title}</h2>
      {description && <p className="mt-5 text-lg leading-8 text-stone-600">{description}</p>}
    </div>
  );
}
