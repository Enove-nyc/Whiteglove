"use client";

import { useMemo, useState } from "react";
import {
  LISTING_CATEGORY_GROUPS,
  LISTING_CATEGORY_OTHER,
  LISTING_CATEGORY_PRESETS,
  isListingCategoryPreset,
} from "@/data/listing-categories";

type ListingCategoryFieldProps = {
  /** Form field name written on submit (kind for attractions, category for imports). */
  name: string;
  defaultValue?: string | null;
  className: string;
  /** When set (import review), wraps both controls with this label class. */
  labelClassName?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /** When set, only presets in these groups are offered (plus Other). */
  groupFilter?: ReadonlyArray<(typeof LISTING_CATEGORY_PRESETS)[number]["group"]>;
};

/**
 * Full site taxonomy select + write-in. Preserves unknown pack values as Other.
 */
export default function ListingCategoryField({
  name,
  defaultValue = "",
  className,
  labelClassName,
  label = "Category",
  required = false,
  disabled = false,
  groupFilter,
}: ListingCategoryFieldProps) {
  const presets = useMemo(() => {
    if (!groupFilter?.length) return LISTING_CATEGORY_PRESETS;
    const allowed = new Set(groupFilter);
    return LISTING_CATEGORY_PRESETS.filter((option) => allowed.has(option.group));
  }, [groupFilter]);

  const initial = (defaultValue ?? "").trim();
  const initialIsPreset = isListingCategoryPreset(initial) && presets.some((option) => option.value === initial);
  const [mode, setMode] = useState(initialIsPreset ? initial : initial ? LISTING_CATEGORY_OTHER : "");
  const [custom, setCustom] = useState(initialIsPreset ? "" : initial);
  const resolved = mode === LISTING_CATEGORY_OTHER ? custom.trim() : mode;

  const groups = LISTING_CATEGORY_GROUPS.filter((group) => presets.some((option) => option.group === group.id));
  const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

  const select = (
    <select
      value={mode}
      disabled={disabled}
      required={required && mode !== LISTING_CATEGORY_OTHER}
      onChange={(event) => setMode(event.target.value)}
      className={className}
    >
      <option value="">Choose a category</option>
      {groups.map((group) => (
        <optgroup key={group.id} label={group.label}>
          {presets
            .filter((option) => option.group === group.id)
            .map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </optgroup>
      ))}
      <option value={LISTING_CATEGORY_OTHER}>Other (write in)</option>
    </select>
  );

  const writeIn =
    mode === LISTING_CATEGORY_OTHER ? (
      <input
        value={custom}
        disabled={disabled}
        required={required}
        onChange={(event) => setCustom(event.target.value)}
        className={className}
        placeholder="e.g. Botanical garden, historic market…"
        maxLength={100}
      />
    ) : null;

  if (labelClassName) {
    return (
      <div className="space-y-2 md:col-span-1">
        <label className={labelClassName}>
          {label}
          {select}
        </label>
        {writeIn && (
          <label className={labelClassName}>
            Write-in category
            {writeIn}
          </label>
        )}
        <input type="hidden" name={name} value={resolved} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className={captionClass}>
          {label}
          {required ? " *" : ""}
        </span>
        {select}
      </label>
      {writeIn && (
        <label className="block">
          <span className={captionClass}>Write-in category{required ? " *" : ""}</span>
          {writeIn}
        </label>
      )}
      <input type="hidden" name={name} value={resolved} />
    </div>
  );
}
