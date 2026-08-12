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
    keywords: "text copy wording edit heading intro publish draft page inventory content photo picture image upload submission report analytics searches visits demand looking history changed edit undo revision who growth conversion alerts newsletter signup affiliate clicks",
    children: [
      { href: "/admin/pages", label: "All pages", blurb: "Every page you can edit." },
      { href: "/admin/reports", label: "What people want", blurb: "Which empty pages they open." },
      { href: "/admin/growth", label: "Search and bookings", blurb: "Searches, clicks, alerts and conversion." },
      { href: "/admin/alerts", label: "Email alerts", blurb: "Who asked for destination and seasonal updates." },
      { href: "/admin/history", label: "What changed", blurb: "Every edit, and how to undo it." },
      { href: "/admin/content", label: "Visitor suggestions", blurb: "Corrections people sent in." },
      { href: "/admin/photos", label: "Pictures sent in", blurb: "Closed to visitors — finish anything still waiting." },
      { href: "/admin/ratings", label: "Experience ratings", blurb: "How a listing or trip went for somebody." },
      { href: "/admin/inventory", label: "Checklist", blurb: "What is still unfinished." },
    ],
  },
  {
    href: "/admin/directory",
    label: "Directory",
    blurb: "Places, kevarim, contacts and listings.",
    icon: "▣",
    keywords: "destination cemetery kever shomer phone accommodation hotel provider listing town city country countries hechsher kashrus kosher supervision teudah mikvah mikvaos shul minyan zmanim border crossing frontier import batch source attribution review candidate duplicate publish queue needs review awaiting verification deleted removed restore undo bin trash airport flight metro planner assumptions driving day add entry",
    children: [
      { href: "/admin/directory", label: "Everything", blurb: "One list of every entry." },
      { href: "/admin/add", label: "Add an entry", blurb: "A cemetery, a tzadik, or a new page." },
      { href: "/admin/kevarim", label: "Kevarim", blurb: "Who is buried where." },
      { href: "/admin/shomrim", label: "Shomer numbers", blurb: "Getting into a cemetery." },
      { href: "/admin/destinations", label: "Towns", blurb: "Kosher food, lodging, minyanim." },
      { href: "/admin/countries", label: "Countries", blurb: "Not set up yet — no country editor." },
      { href: "/admin/airports", label: "Airports", blurb: "What flight search and the planner use." },
      { href: "/admin/planner", label: "Route planner", blurb: "How a day is judged packed or free." },
      { href: "/admin/imports", label: "Bulk imports", blurb: "Review source-backed listing candidates." },
      { href: "/admin/imports/needs-review", label: "Needs review", blurb: "Candidates awaiting verification." },
      { href: "/admin/imports/trello", label: "Trello review cards", blurb: "Review source-attributed editorial candidates." },
      { href: "/admin/borders", label: "Border crossings", blurb: "What was open, and how long." },
      { href: "/admin/hechsherim", label: "Hechsherim", blurb: "Who certifies each kosher place." },
      { href: "/admin/mikvaos", label: "Mikvaos", blurb: "Mikvah listings across towns." },
      { href: "/admin/directory/businesses", label: "Businesses", blurb: "Operators, planners, guides." },
      { href: "/admin/directory-listings", label: "Stored listings", blurb: "Drivers and agencies in the private store." },
      { href: "/admin/recycle", label: "Recently deleted", blurb: "Put something back." },
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
    keywords: "password lock closed open account admin team finance email maps ai technical advanced referral membership collaboration group voting plus earnings partners travel essentials insurance esim transfer tours words headline footer about profile proof case study limits free account trello board duffel flight ticket search book stays",
    children: [
      { href: "/admin/settings", label: "Overview", blurb: "All settings in one place." },
      { href: "/admin/settings/words", label: "The website’s words", blurb: "Headline, contact line and footer." },
      { href: "/admin/settings/about", label: "About — who you are", blurb: "Name, photograph and why White Glove exists." },
      { href: "/admin/settings/proof", label: "Case studies", blurb: "Genuine trip outcomes with permission." },
      { href: "/admin/settings/limits", label: "What a free account gets", blurb: "Trip and print limits for Travelers." },
      { href: "/admin/team", label: "People with access", blurb: "Who else can get in." },
      { href: "/admin/settings/website", label: "Website access", blurb: "Open or close the site." },
      { href: "/admin/settings/passwords", label: "Passwords", blurb: "Change the codes." },
      { href: "/admin/settings/trello", label: "Cards on your Trello board", blurb: "Pictures, listings and reports on the board." },
      { href: "/admin/accounts", label: "Visitor accounts", blurb: "People who signed up." },
      { href: "/admin/messages", label: "Messages sent in", blurb: "What people wrote from the website." },
      // ONE ENTRY, not two. Travel Essentials was a second screen answering the
      // same question — is this site earning, and where — so whichever one you
      // opened looked complete on its own. It is a section of this page now,
      // and its old address redirects to it.
      {
        href: "/admin/settings/earnings",
        label: "What the site earns",
        blurb: "Searches, partner cards, destination placements, and anything else you link to.",
      },
      { href: "/admin/settings/referral", label: "Referral programme", blurb: "Kept off until rewards are final." },
      { href: "/admin/settings/collaboration", label: "Group planning tools", blurb: "Voting, favorites and rooms." },
      { href: "/admin/settings/membership", label: "White Glove Plus", blurb: "Planned only — not launched." },
      { href: "/admin/finances", label: "Finances", blurb: "Money in and out." },
      { href: "/admin/settings/connections", label: "Connections", blurb: "Email, maps and the assistant." },
      { href: "/admin/duffel", label: "Duffel", blurb: "Search and book flights here. Not on the public site." },
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

/** Screens inside a section, not including the section’s own front page. */
export function sectionScreens(sectionHref: string): Array<{ href: string; label: string; blurb: string }> {
  const section = ADMIN_SECTIONS.find((item) => item.href === sectionHref);
  return (section?.children ?? []).filter((child) => child.href !== sectionHref);
}

/** Everything the "go to" box can jump to. */
export function allAdminDestinations(): Array<{ href: string; label: string; blurb: string; section: string; keywords: string }> {
  const out: Array<{ href: string; label: string; blurb: string; section: string; keywords: string }> = [];
  for (const section of ADMIN_SECTIONS) {
    out.push({ href: section.href, label: section.label, blurb: section.blurb, section: section.label, keywords: section.keywords ?? "" });
    for (const child of sectionScreens(section.href)) {
      out.push({ href: child.href, label: child.label, blurb: child.blurb, section: section.label, keywords: section.keywords ?? "" });
    }
  }
  return out;
}

/**
 * Where you are, as a trail.
 *
 * The admin has five sections and about twenty screens, and several of them
 * look alike once you are two clicks in — "Everything", "Towns" and "Kevarim"
 * are all lists of places. A trail says which list you are looking at without
 * having to recognise it.
 *
 * The last crumb is the page itself and carries no link: a link to where you
 * already are is a dead control.
 */
export type Crumb = { label: string; href?: string };

export function adminBreadcrumbs(pathname: string): Crumb[] {
  const here = toAdminPath(pathname);
  const home: Crumb = here === "/admin" ? { label: "Dashboard" } : { label: "Dashboard", href: "/admin" };
  if (here === "/admin") return [home];

  const section = activeSection(here);
  const child = section.children?.find((c) => here === c.href || here.startsWith(`${c.href}/`));

  const trail: Crumb[] = [home];
  if (section.href !== "/admin") {
    // The section itself is only a link when it is not where we have ended up.
    trail.push(section.href === here ? { label: section.label } : { label: section.label, href: section.href });
  }
  if (child && child.href !== section.href) {
    trail.push(child.href === here ? { label: child.label } : { label: child.label, href: child.href });
  }

  // A screen the nav does not list — /admin/settings/passwords, say, when it
  // is not a child anywhere. Name it from its own path rather than leaving the
  // trail claiming you are on the section's front page.
  const last = trail[trail.length - 1];
  if (last.href !== undefined || trail.length === 1) {
    const tail = here.split("/").filter(Boolean).pop();
    if (tail && tail !== "admin") {
      trail.push({ label: tail.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) });
    }
  }
  return trail;
}

/**
 * The things worth being one click from anywhere.
 *
 * Not everything that can be added — the ones somebody actually reaches for
 * mid-task, when they have just been given a phone number or told about a
 * place. A long menu here would be a second navigation.
 */
export const ADMIN_QUICK_ADD: Array<{ href: string; label: string }> = [
  { href: "/admin/add", label: "Add anything" },
  { href: "/admin/kevarim", label: "Kever or beis hachaim" },
  { href: "/admin/destinations", label: "Town details" },
  { href: "/admin/shomrim", label: "Shomer number" },
  { href: "/admin/directory/businesses", label: "Business listing" },
  { href: "/admin/advertisements", label: "Advertisement" },
  { href: "/admin/pages", label: "Page" },
];

/** The label for a path, for the recently-visited list. */
export function adminLabelFor(pathname: string): string {
  const here = toAdminPath(pathname);
  const crumbs = adminBreadcrumbs(here);
  return crumbs[crumbs.length - 1]?.label ?? here;
}
