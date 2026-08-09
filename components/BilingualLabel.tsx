type BilingualLabelProps = {
  primary: string;
  secondary: string;
  primaryDir?: "rtl" | "ltr";
  secondaryDir?: "rtl" | "ltr";
  primaryClassName?: string;
  secondaryClassName?: string;
  compact?: boolean;
  /**
   * What language the right-to-left side is in.
   *
   * dir= gets the ORDER right and says nothing about the LANGUAGE: without
   * this, a screen reader reads a Yiddish town name with English phonetics,
   * which is not a near miss but unintelligible. Yiddish is the default
   * because every right-to-left primary on this site is a Yiddish place or
   * person name; a Hebrew phrase passes "he".
   */
  primaryLang?: "he" | "yi";
};

export default function BilingualLabel({
  primary,
  secondary,
  primaryDir = "rtl",
  secondaryDir = "ltr",
  primaryClassName = "text-4xl",
  secondaryClassName = "text-base",
  compact = false,
  primaryLang = "yi",
}: BilingualLabelProps) {
  return (
    <span className="block">
      {/* Marked only when it really is right-to-left: this label is also used
          with two Latin lines, and lang="yi" on an English word is worse than
          no lang at all. */}
      <span
        dir={primaryDir}
        lang={primaryDir === "rtl" ? primaryLang : undefined}
        className={`block font-[family-name:var(--font-display)] leading-tight text-[var(--navy)] ${primaryClassName}`}
      >
        {primary}
      </span>
      <span dir={secondaryDir} className={`block text-stone-500 ${compact ? "mt-1" : "mt-2"} ${secondaryClassName}`}>
        {secondary}
      </span>
    </span>
  );
}
