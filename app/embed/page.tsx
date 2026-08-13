export const dynamic = "force-dynamic";

/**
 * Makes `embed` a real static segment so /embed/flights is not swallowed by
 * the root [city] route (which 404s unknown slugs). The iframe loads
 * /embed/flights, not this address.
 */
export default function EmbedIndexPage() {
  return <p className="p-4 text-sm leading-6 text-stone-600">Partner search forms load on Search booking partners.</p>;
}
