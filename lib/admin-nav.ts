// The five places in the admin, and everything that lives under each of them.
//
// Five is the whole navigation. Anything that used to be its own tile is now a
// screen inside one of these, so the question is never "which of twelve buttons
// holds this" but "is this a page, a listing, an advert, or a setting".

export type AdminSection = {
  /** The nav item's own path. */
  href: string;
  label: string;
  /** A one-line answer to "what is this for". */
  blurb: string;
  /** Simple inline mark — no icon font, no dependency. */
  icon: string;
  /** Screens that belong to this section, shown when you are inside it. */
  children?: Array<{ href: string; label: string; blurb: string }>;
  /** Extra words the "go to" search should match. */
  keywords?: string;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin",
    label: "Home",
    blurb: "What needs you today.",
    icon: "◆",
    keywords: "dashboard overview start",
  },
  {
    href: "/admin/pages",
    label: "Pages",
    blurb: "The words and pictures on the website.",
    icon: "▤",
    keywords: "text copy wording edit heading intro publish draft page inventory content",
    children: [
      { href: "/admin/pages", label: "All pages", blurb: "Every page you can edit." },
      { href: "/admin/content", label: "Visitor suggestions", blurb: "Corrections people sent in." },
      { href: "/admin/inventory", label: "Checklist", blurb: "What is still unfinished." },
    ],
  },
  {
    href: "/admin/directory",
    label: "Directory",
    blurb: "Places, kevarim, contacts and listings.",
    icon: "▣",
    keywords: "destination cemetery kever shomer phone accommodation hotel provider listing town city hechsher kashrus kosher supervision teudah",
    children: [
      { href: "/admin/directory", label: "Everything", blurb: "One list of every entry." },
      { href: "/admin/kevarim", label: "Kevarim", blurb: "Who is buried where." },
      { href: "/admin/shomrim", label: "Shomer numbers", blurb: "Getting into a cemetery." },
      { href: "/admin/destinations", label: "Towns", blurb: "Kosher food, lodging, minyanim." },
      { href: "/admin/hechsherim", label: "Hechsherim", blurb: "Who certifies each kosher place." },
      { href: "/admin/directory/businesses", label: "Businesses", blurb: "Operators, planners, guides." },
    ],
  },
  {
    href: "/admin/advertisements",
    label: "Advertisements",
    blurb: "Banners, popups and promotions.",
    icon: "◈",
    keywords: "ads promotion banner popup sponsor campaign",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    blurb: "Access, passwords, money and connections.",
    icon: "⚙",
    keywords: "password lock closed open account admin team finance email maps ai technical advanced",
    children: [
      { href: "/admin/settings", label: "Overview", blurb: "All settings in one place." },
      { href: "/admin/team", label: "People with access", blurb: "Who else can get in." },
      { href: "/admin/settings/website", label: "Website access", blurb: "Open or close the site." },
      { href: "/admin/settings/passwords", label: "Passwords", blurb: "Change the codes." },
      { href: "/admin/accounts", label: "Visitor accounts", blurb: "People who signed up." },
      { href: "/admin/finances", label: "Finances", blurb: "Money in and out." },
      { href: "/admin/settings/connections", label: "Connections", blurb: "Email, maps and the assistant." },
    ],
  },
];

/** Which of the five you are currently inside. */
/**
 * The path as this file writes it, whichever hostname you are on.
 *
 * On the admin hostname the bare path IS the screen — admin.…/settings is
 * Settings — so `usePathname()` gives "/settings" while every href in this
 * file reads "/admin/settings". Without this the two never match, and the
 * navigation highlight sits on Home no matter where you are.
 *
 * The same transform the middleware does, in the other direction.
 */
export function toAdminPath(pathname: string): string {
  if (pathname.startsWith("/admin")) return pathname;
  return pathname === "/" ? "/admin" : `/admin${pathname}`;
}

/**
 * A link, written for the hostname you are on.
 *
 * On the admin hostname the whole point is that `/admin` is not needed, so
 * carrying it in every link undoes that — you sign in at admin.…/ and every
 * click puts you back on admin.…/admin/settings.
 *
 * Which hostname you are on is read off the current path rather than from a
 * variable: if the path you are already on does not start with /admin, you are
 * being served bare paths, so the links should be bare too. That needs nothing
 * configured in the browser and cannot disagree with the middleware.
 */
export function adminHref(href: string, pathname: string): string {
  if (pathname.startsWith("/admin")) return href;
  return href.replace(/^\/admin/, "") || "/";
}

export function activeSection(pathname: string): AdminSection {
  // Longest match first, so /admin/settings/passwords lands on Settings rather
  // than Home, and /admin alone still lands on Home.
  const byLength = [...ADMIN_SECTIONS].sort((a, b) => b.href.length - a.href.length);
  return (
    byLength.find((s) => s.href !== "/admin" && (pathname === s.href || pathname.startsWith(`${s.href}/`))) ??
    byLength.find((s) => s.children?.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))) ??
    ADMIN_SECTIONS[0]
  );
}

/** Everything the "go to" box can jump to. */
export function allAdminDestinations(): Array<{ href: string; label: string; blurb: string; section: string; keywords: string }> {
  const out: Array<{ href: string; label: string; blurb: string; section: string; keywords: string }> = [];
  for (const section of ADMIN_SECTIONS) {
    out.push({ href: section.href, label: section.label, blurb: section.blurb, section: section.label, keywords: section.keywords ?? "" });
    for (const child of section.children ?? []) {
      if (child.href === section.href) continue;
      out.push({ href: child.href, label: child.label, blurb: child.blurb, section: section.label, keywords: section.keywords ?? "" });
    }
  }
  return out;
}
