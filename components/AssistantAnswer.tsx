import { parseAnswer, type TextSpan } from "@/lib/assistant-text";

/**
 * The assistant's answer, set in the site's own type.
 *
 * Every tag here is chosen by this component. `parseAnswer` returns data, not
 * markup, so nothing the model writes — or that a traveler wrote and the model
 * echoed — can become HTML on the page.
 */

function Spans({ spans }: { spans: TextSpan[] }) {
  return (
    <>
      {spans.map((span, index) =>
        span.strong
          ? <strong key={index} className="font-semibold text-[var(--navy)]">{span.text}</strong>
          : <span key={index}>{span.text}</span>,
      )}
    </>
  );
}

export default function AssistantAnswer({ answer }: { answer: string }) {
  const blocks = parseAnswer(answer);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3 key={index} className="font-[family-name:var(--font-display)] text-lg leading-snug text-[var(--navy)]">
              {block.text}
            </h3>
          );
        }
        if (block.kind === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={index} className={`space-y-1.5 pl-5 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-[var(--gold-ink)]`}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="leading-6"><Spans spans={item} /></li>
              ))}
            </Tag>
          );
        }
        return <p key={index} className="leading-6"><Spans spans={block.spans} /></p>;
      })}
    </div>
  );
}
