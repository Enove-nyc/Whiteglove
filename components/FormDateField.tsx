"use client";

import { useState } from "react";
import DateField from "@/components/DateField";

/**
 * A date field for a form that is submitted, not read from React state.
 *
 * The admin's editors post a FormData to a server action, so their fields are
 * uncontrolled — `name` and `defaultValue`, no onChange. DateField is
 * controlled, so those screens were still using a bare `input type="date"`:
 * the browser's own box, in its own type, next to fields wearing the site's.
 *
 * This holds the value for it. Nothing else.
 */
export default function FormDateField({
  name,
  defaultValue = "",
  className = "",
  ariaLabel,
  id,
  min,
  max,
}: {
  name: string;
  defaultValue?: string | null;
  className?: string;
  ariaLabel?: string;
  id?: string;
  min?: string;
  max?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <DateField
      name={name}
      id={id}
      value={value}
      onChange={setValue}
      className={className}
      ariaLabel={ariaLabel}
      min={min}
      max={max}
    />
  );
}
