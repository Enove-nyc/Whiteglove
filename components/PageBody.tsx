// Renders an editable page body (from the Page model) with light formatting:
// blank lines separate paragraphs, "## " lines become subheadings, and "- "
// lines become bullet points. No raw HTML is rendered, so admin-entered text is
// always safe. Used for the intro/lead text on general pages.

import { Fragment } from "react";

type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  const chunks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n").map((line) => line.trim());
    if (lines.every((line) => line.startsWith("- "))) {
      blocks.push({ kind: "list", items: lines.map((line) => line.slice(2).trim()) });
    } else if (lines.length === 1 && lines[0].startsWith("## ")) {
      blocks.push({ kind: "heading", text: lines[0].slice(3).trim() });
    } else {
      blocks.push({ kind: "paragraph", text: lines.join(" ") });
    }
  }
  return blocks;
}

export default function PageBody({ body, className }: { body: string; className?: string }) {
  const blocks = parseBlocks(body);
  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {block.kind === "heading" && (
            <h2 className="mt-8 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{block.text}</h2>
          )}
          {block.kind === "list" && (
            <ul className="glove-list mt-3 space-y-2">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          )}
          {block.kind === "paragraph" && <p className="mt-4 first:mt-0">{block.text}</p>}
        </Fragment>
      ))}
    </div>
  );
}
