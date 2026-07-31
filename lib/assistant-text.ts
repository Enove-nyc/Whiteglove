/**
 * The assistant's answer, as something the site can set in its own type.
 *
 * The reply came back as one block of text with `whitespace-pre-line` on it.
 * A model writing a list writes it the way models do — a heading, then lines
 * beginning with a dash or a number, with `**bold**` around the names — and
 * all of that was shown literally. Asterisks and hyphens on the page, in one
 * undifferentiated grey paragraph. It read like output from somewhere else,
 * because it was being displayed as output rather than as writing.
 *
 * This turns it into blocks the page can style: headings in the display face,
 * lists as lists, emphasis as emphasis.
 *
 * DELIBERATELY NOT A MARKDOWN LIBRARY. The only thing rendering here is a
 * model's answer to a travel question, and the handful of constructs it
 * actually uses are the ones below. A full parser would bring HTML support
 * with it, which is the one thing this must not do: the answer is built partly
 * from a traveler's own words, and anything that can emit raw HTML from that
 * is an injection waiting to happen. Nothing here ever produces markup — it
 * produces data, and the component decides what tags to use.
 */

export type AnswerBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; spans: TextSpan[] }
  | { kind: "list"; ordered: boolean; items: TextSpan[][] };

export type TextSpan = { text: string; strong?: boolean };

/** `**like this**` becomes a strong span. Nothing else is interpreted. */
export function parseSpans(line: string): TextSpan[] {
  const spans: TextSpan[] = [];
  // Non-greedy, and requires something between the markers, so a stray `**`
  // is left as the two characters it is rather than swallowing the rest.
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) spans.push({ text: line.slice(last, at) });
    spans.push({ text: match[1], strong: true });
    last = at + match[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last) });
  return spans.length ? spans : [{ text: line }];
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,4}\s+(.*)$/;

/**
 * Split an answer into blocks.
 *
 * A blank line ends a paragraph; a run of dashed or numbered lines is a list.
 * Anything unrecognised stays a paragraph, which is the safe direction — an
 * answer that does not fit the shape is still readable prose.
 */
export function parseAnswer(answer: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  const lines = answer.replace(/\r\n/g, "\n").split("\n");

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: "paragraph", spans: parseSpans(paragraph.join(" ").trim()) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items.map(parseSpans) });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      // A heading with the markers stripped. Emphasis inside one is noise.
      blocks.push({ kind: "heading", text: heading[1].replace(/\*\*/g, "").trim() });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      // A list that changes kind mid-way is two lists, not one confused one.
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1].trim());
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return blocks;
}
