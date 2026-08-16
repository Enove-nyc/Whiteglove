/**
 * One shared set of thin, consistent icons.
 *
 * Every icon here means the same thing everywhere it appears — the header,
 * the mobile bar, a listing's action row — so a visitor learns a symbol once.
 * Stroke-based, no fill, 1.6 weight throughout: the "consistent thin icons"
 * the design calls for. New icons should match that weight rather than being
 * dropped in from wherever they were copied.
 *
 * ICON-ONLY USE NEEDS A LABEL. This component only draws the mark; the
 * caller is responsible for an aria-label (or visible text) and, on desktop,
 * a title/tooltip. Nothing here should ship icon-only with no name — that is
 * exactly the "never make users guess" rule.
 */

export type IconName =
  | "search"
  | "route"
  | "suitcase"
  | "account"
  | "chevron-down"
  | "menu"
  | "close"
  | "directions"
  | "phone"
  | "website"
  | "share"
  | "heart"
  | "heart-filled"
  | "pencil"
  | "flag"
  | "map-pin"
  | "list"
  | "map"
  | "star"
  | "star-filled"
  | "check";

const PATHS: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20 15.3 15.3" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8 7.5c2 1 3 2.6 3 4.5s2 5 4 5c1.4 0 2.4-.5 3-1.3" />
    </>
  ),
  suitcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8.2" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </>
  ),
  "chevron-down": <path d="M6 9.5 12 15.5 18 9.5" />,
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  directions: (
    <>
      <path d="M12 3v18" />
      <path d="M6 8l6-5 6 5" />
      <path d="M6 21l6-5 6 5" />
    </>
  ),
  phone: <path d="M6.5 4h3l1.5 4.5-2 1.7a12 12 0 0 0 5.3 5.3l1.7-2 4.5 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" />,
  website: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5s-1.2 6.2-3.4 8.5c-2.2-2.3-3.4-5.3-3.4-8.5S9.8 5.8 12 3.5Z" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="6" cy="12" r="2.3" />
      <circle cx="18" cy="18" r="2.3" />
      <path d="M8.1 10.8 15.9 7.2" />
      <path d="M8.1 13.2 15.9 16.8" />
    </>
  ),
  heart: <path d="M12 20.2S3.8 15.4 3.8 9.4A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.2 2.8c0 6-8.2 10.8-8.2 10.8Z" />,
  "heart-filled": <path d="M12 20.2S3.8 15.4 3.8 9.4A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.2 2.8c0 6-8.2 10.8-8.2 10.8Z" fill="currentColor" stroke="none" />,
  pencil: (
    <>
      <path d="M4 20l.9-4L16 4.9a1.8 1.8 0 0 1 2.5 0l.6.6a1.8 1.8 0 0 1 0 2.5L8 19.1Z" />
      <path d="M14 7 17 10" />
    </>
  ),
  flag: (
    <>
      <path d="M6 3.5v17" />
      <path d="M6 4.5c2-1 4-1 6 0s4 1 6 0v9c-2 1-4 1-6 0s-4-1-6 0Z" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M12 21s-6.8-6.1-6.8-11.2a6.8 6.8 0 1 1 13.6 0C18.8 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.6" r="2.3" />
    </>
  ),
  list: (
    <>
      <path d="M8.5 6.5h11" />
      <path d="M8.5 12h11" />
      <path d="M8.5 17.5h11" />
      <path d="M4.3 6.5h.01" />
      <path d="M4.3 12h.01" />
      <path d="M4.3 17.5h.01" />
    </>
  ),
  map: (
    <>
      <path d="M9 4.5 4 6.3v13.2l5-1.8" />
      <path d="M9 4.5l6 2.2v13.2l-6-2.2" />
      <path d="M15 6.7l5-1.8v13.2l-5 1.8" />
    </>
  ),
  star: <path d="M12 4.2 14 9.6l5.6.5-4.3 3.7 1.4 5.5-4.7-3-4.7 3 1.4-5.5-4.3-3.7 5.6-.5Z" />,
  "star-filled": <path d="M12 4.2 14 9.6l5.6.5-4.3 3.7 1.4 5.5-4.7-3-4.7 3 1.4-5.5-4.3-3.7 5.6-.5Z" fill="currentColor" stroke="none" />,
  check: <path d="M5 12.5 9.5 17 19 7" />,
};

export function Icon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
