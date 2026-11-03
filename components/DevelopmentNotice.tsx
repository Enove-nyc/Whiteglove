import { ITINERARIES_DEVELOPMENT_MESSAGE } from "@/lib/launch-status";
import { currentBrand } from "@/lib/site-brand";

export default async function DevelopmentNotice() {
  const brand = await currentBrand();
  const message = brand === "kosher"
    ? "White Glove Kosher Travel is in development. We look forward to welcoming you soon. We are not open for business yet."
    : ITINERARIES_DEVELOPMENT_MESSAGE;
  return (
    <aside aria-label="Development status" className="border-b border-white/20 bg-[var(--navy)] px-5 py-3 text-center text-sm leading-6 text-white">
      <p className="mx-auto max-w-5xl">{message}</p>
    </aside>
  );
}
