"use client";

import { useEffect, useState } from "react";

/**
 * A location field retained behind the existing component boundary.
 *
 * White Glove does not send typed locations to an external geocoder or places
 * database. Parents can still pass an already-known curated coordinate through
 * `onChange`, but ordinary typing is deliberately free-form and does not imply
 * that a map provider has resolved or verified the address.
 */
export default function AddressAutocomplete({
  value = "",
  onChange,
  placeholder,
  className,
  name,
  mode = "address",
  required = false,
}: {
  value?: string;
  onChange?: (address: string, coordinates?: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
  mode?: "address" | "city";
  required?: boolean;
}) {
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <input
      name={name}
      value={query}
      onChange={(event) => {
        const next = event.target.value;
        setQuery(next);
        onChange?.(next);
      }}
      placeholder={placeholder || (mode === "city" ? "Enter a city or town…" : "Enter an address…")}
      autoComplete="street-address"
      required={required}
      className={className}
    />
  );
}
