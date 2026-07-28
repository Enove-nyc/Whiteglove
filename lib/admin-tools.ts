// Every screen in the admin area, in one list.
//
// The dashboard used to be a wrap of a dozen identical buttons labelled with
// nouns — "Content manager", "Page editor", "Directory" — which is only
// findable if you already know which noun holds the thing you want. Grouping
// them and saying in a line what each one is for is most of the fix; the search
// on top of this list is the rest.

export type AdminTool = {
  href: string;
  name: string;
  /** What you would come here to do, in the words you would use. */
  blurb: string;
  /** Extra words someone might search for. Never shown. */
  keywords: string;
};

export type AdminToolGroup = {
  title: string;
  detail: string;
  tools: AdminTool[];
};

export const ADMIN_TOOL_GROUPS: AdminToolGroup[] = [
  {
    title: "Kevarim & places",
    detail: "The batei hachaim, who is buried in them, and how to get in.",
    tools: [
      {
        href: "/admin/kevarim",
        name: "Kevarim",
        blurb: "Add a person to a beis hachaim, or create a beis hachaim around a person.",
        keywords: "tzadik tzaddik burial kever ohel matzeiva add person grave",
      },
      {
        href: "/admin/shomrim",
        name: "Shomer numbers",
        blurb: "Add, correct or retire the phone number for getting into a cemetery.",
        keywords: "phone contact caretaker key access gate number call",
      },
      {
        href: "/admin/destinations",
        name: "Destination editor",
        blurb: "Kosher food, lodging, minyanim and mikvaos for each town.",
        keywords: "city town practical places restaurant hotel minyan mikvah",
      },
      {
        href: "/admin/add",
        name: "Add a cemetery or page",
        blurb: "Start a new beis hachaim, or a standalone info page.",
        keywords: "new create entry info page",
      },
    ],
  },
  {
    title: "What people see",
    detail: "The pages, the wording on them, and the ads.",
    tools: [
      {
        href: "/admin/pages",
        name: "Page editor",
        blurb: "Change the heading and intro text on the site's main pages.",
        keywords: "text copy wording heading intro edit",
      },
      {
        href: "/admin/advertisements",
        name: "Advertisements",
        blurb: "Banners, popups and the ad at the bottom of the itineraries.",
        keywords: "ads promotion banner popup sponsor placement itinerary footer",
      },
      {
        href: "/admin/directory-listings",
        name: "Directory",
        blurb: "Tour operators, planners and guides listed on the site.",
        keywords: "providers operators agencies listings businesses",
      },
      {
        href: "/admin/content",
        name: "Submissions",
        blurb: "Review what visitors sent in before it goes live.",
        keywords: "review approve moderate suggestions submitted edits",
      },
    ],
  },
  {
    title: "The business",
    detail: "Who is signed up, what came in, and what is still to do.",
    tools: [
      {
        href: "/admin/accounts",
        name: "Accounts",
        blurb: "The people who have signed up and what they have saved.",
        keywords: "users customers signups members email",
      },
      {
        href: "/admin/finances",
        name: "Finances",
        blurb: "Money in and out, and what each trip cost.",
        keywords: "money expenses income revenue costs invoices",
      },
      {
        href: "/admin/inventory",
        name: "Page checklist",
        blurb: "Every page by status, so you can see what is still unfinished.",
        keywords: "todo checklist status incomplete progress work",
      },
    ],
  },
];

export const ADMIN_TOOLS: AdminTool[] = ADMIN_TOOL_GROUPS.flatMap((g) => g.tools);
