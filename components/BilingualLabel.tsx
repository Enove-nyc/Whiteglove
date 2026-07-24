type BilingualLabelProps = {
  primary: string;
  secondary: string;
  primaryDir?: "rtl" | "ltr";
  secondaryDir?: "rtl" | "ltr";
  primaryClassName?: string;
  secondaryClassName?: string;
  compact?: boolean;
};

export default function BilingualLabel({
  primary,
  secondary,
  primaryDir = "rtl",
  secondaryDir = "ltr",
  primaryClassName = "text-4xl",
  secondaryClassName = "text-base",
  compact = false,
}: BilingualLabelProps) {
  return (
    <span className="block">
      <span dir={primaryDir} className={`block font-[family-name:var(--font-display)] leading-tight text-[var(--navy)] ${primaryClassName}`}>
        {primary}
      </span>
      <span dir={secondaryDir} className={`block text-stone-500 ${compact ? "mt-1" : "mt-2"} ${secondaryClassName}`}>
        {secondary}
      </span>
    </span>
  );
}
