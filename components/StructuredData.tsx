/**
 * Renders JSON-LD into the page.
 *
 * A script tag with `type="application/ld+json"` is inert — browsers do not
 * execute it and it draws nothing. It is there for the crawlers.
 *
 * JSON.stringify, not a template string, so a name containing a quote or an
 * apostrophe cannot break out of the block — several of these places have
 * both.
 */
export default function StructuredData({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          // The content is built by us from our own data, never from anything
          // a visitor typed. `<` is escaped anyway, because a stray "</script>"
          // inside a value would end the block early.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
