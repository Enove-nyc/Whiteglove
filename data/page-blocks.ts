// A page as a list of blocks.
//
// The public pages are React components with their prose written into them,
// which is fine to read and impossible to edit without a deploy. A block is the
// same content expressed as data, so the owner can move it, hide it, or change
// the words.
//
// The block kinds are deliberately few, and each one maps to something the site
// already renders. That keeps an edited page looking like the rest of the site
// rather than like a generic page builder.

export type ButtonStyle = "solid" | "outline";

export type PageBlock =
  | { id: string; kind: "hero"; hidden?: boolean; eyebrow: string; heading: string; intro: string }
  | { id: string; kind: "text"; hidden?: boolean; heading?: string; body: string }
  | {
      id: string;
      kind: "cards";
      hidden?: boolean;
      heading?: string;
      intro?: string;
      items: Array<{ title: string; body: string }>;
    }
  | { id: string; kind: "list"; hidden?: boolean; heading?: string; items: string[] }
  | { id: string; kind: "image"; hidden?: boolean; url: string; alt: string; caption?: string }
  | {
      id: string;
      kind: "buttons";
      hidden?: boolean;
      items: Array<{ label: string; href: string; style?: ButtonStyle }>;
    }
  | { id: string; kind: "quote"; hidden?: boolean; text: string; attribution?: string }
  | { id: string; kind: "note"; hidden?: boolean; body: string; tone?: "plain" | "warn" };

export type BlockKind = PageBlock["kind"];

export const BLOCK_LABELS: Record<BlockKind, { label: string; detail: string }> = {
  hero: { label: "Top of the page", detail: "The small line, the big heading, and the paragraph under it." },
  text: { label: "Words", detail: "A heading and some paragraphs." },
  cards: { label: "Cards", detail: "A row of boxes, each with a title and a line." },
  list: { label: "A list", detail: "Bullet points or a checklist." },
  image: { label: "Picture", detail: "One picture, with a caption if you want." },
  buttons: { label: "Buttons", detail: "One or more buttons that go somewhere." },
  quote: { label: "Pulled-out line", detail: "A sentence set apart from the rest." },
  note: { label: "Aside", detail: "A bordered note for a caveat or a reminder." },
};

/** A short, safe id. Blocks are reordered by the editor, so this only has to be unique in a page. */
export function blockId(prefix = "b"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyBlock(kind: BlockKind): PageBlock {
  const id = blockId(kind);
  switch (kind) {
    case "hero":
      return { id, kind, eyebrow: "", heading: "", intro: "" };
    case "text":
      return { id, kind, heading: "", body: "" };
    case "cards":
      return { id, kind, heading: "", intro: "", items: [{ title: "", body: "" }] };
    case "list":
      return { id, kind, heading: "", items: [""] };
    case "image":
      return { id, kind, url: "", alt: "", caption: "" };
    case "buttons":
      return { id, kind, items: [{ label: "", href: "", style: "solid" }] };
    case "quote":
      return { id, kind, text: "", attribution: "" };
    case "note":
      return { id, kind, body: "", tone: "plain" };
  }
}

/**
 * Is this really a list of blocks?
 *
 * The blocks come out of a JSON column, so they are `unknown` until proven
 * otherwise. Anything unrecognised is dropped rather than rendered, and a page
 * whose blocks are all dropped falls back to its built-in version.
 */
export function parseBlocks(value: unknown): PageBlock[] | null {
  if (!Array.isArray(value)) return null;
  const out: PageBlock[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Record<string, unknown>;
    const kind = b.kind;
    const id = typeof b.id === "string" && b.id ? b.id : blockId();
    const hidden = b.hidden === true;
    const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : "");

    if (kind === "hero") out.push({ id, kind, hidden, eyebrow: str("eyebrow"), heading: str("heading"), intro: str("intro") });
    else if (kind === "text") out.push({ id, kind, hidden, heading: str("heading"), body: str("body") });
    else if (kind === "cards") {
      const items = Array.isArray(b.items)
        ? b.items
            .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === "object")
            .map((i) => ({ title: typeof i.title === "string" ? i.title : "", body: typeof i.body === "string" ? i.body : "" }))
        : [];
      out.push({ id, kind, hidden, heading: str("heading"), intro: str("intro"), items });
    } else if (kind === "list") {
      const items = Array.isArray(b.items) ? b.items.filter((i): i is string => typeof i === "string") : [];
      out.push({ id, kind, hidden, heading: str("heading"), items });
    } else if (kind === "image") out.push({ id, kind, hidden, url: str("url"), alt: str("alt"), caption: str("caption") });
    else if (kind === "buttons") {
      const items = Array.isArray(b.items)
        ? b.items
            .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === "object")
            .map((i) => ({
              label: typeof i.label === "string" ? i.label : "",
              href: typeof i.href === "string" ? i.href : "",
              style: i.style === "outline" ? ("outline" as const) : ("solid" as const),
            }))
        : [];
      out.push({ id, kind, hidden, items });
    } else if (kind === "quote") out.push({ id, kind, hidden, text: str("text"), attribution: str("attribution") });
    else if (kind === "note") out.push({ id, kind, hidden, body: str("body"), tone: b.tone === "warn" ? "warn" : "plain" });
  }
  return out.length ? out : null;
}

/** The blocks a visitor should see — hidden ones are kept in the record but not rendered. */
export function visibleBlocks(blocks: PageBlock[]): PageBlock[] {
  return blocks.filter((b) => !b.hidden);
}

/** A plain-text summary of a block, for the collapsed row in the editor. */
export function blockSummary(block: PageBlock): string {
  switch (block.kind) {
    case "hero":
      return block.heading || block.eyebrow || "Untitled";
    case "text":
      return block.heading || block.body.slice(0, 60) || "Empty";
    case "cards":
      return block.heading || `${block.items.length} card${block.items.length === 1 ? "" : "s"}`;
    case "list":
      return block.heading || `${block.items.length} point${block.items.length === 1 ? "" : "s"}`;
    case "image":
      return block.caption || block.alt || "Picture";
    case "buttons":
      return block.items.map((i) => i.label).filter(Boolean).join(", ") || "Buttons";
    case "quote":
      return block.text.slice(0, 60) || "Empty";
    case "note":
      return block.body.slice(0, 60) || "Empty";
  }
}
