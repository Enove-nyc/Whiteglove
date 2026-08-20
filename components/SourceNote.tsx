/**
 * A source, shown small.
 *
 * Where a listing came from is a footnote, not an endorsement. It used to be
 * rendered as a bordered, uppercase, hover-filled button sitting beside Call,
 * Map and Book — which made whatever site it pointed at look like something the
 * site vouches for. It is not. This renders the same fact as quiet fine print:
 * "Source: name", small and grey, with nothing that reads as a call to action.
 *
 * `label` names the source when we have a name for it; otherwise the domain is
 * shown, which is honest and unobtrusive. The URL is never dressed up as a CTA.
 */
export default function SourceNote({
  url,
  label,
  className = "",
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  let display = label?.trim();
  if (!display) {
    try {
      display = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      display = "source";
    }
  }
  return (
    <p className={`text-[11px] leading-5 text-stone-400 ${className}`.trim()}>
      Source:{" "}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-stone-300 underline-offset-2 hover:text-stone-600"
      >
        {display}
      </a>
    </p>
  );
}
