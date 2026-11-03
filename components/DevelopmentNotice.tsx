import { ITINERARIES_DEVELOPMENT_MESSAGE } from "@/lib/launch-status";
import { currentBrand } from "@/lib/site-brand";

export default async function DevelopmentNotice() {
  const brand = await currentBrand();
  const message = brand === "kosher"
    ? "Demo · White Glove Kosher Travel is in development."
    : ITINERARIES_DEVELOPMENT_MESSAGE;
  return (
    <aside aria-label="Development status" className="border-b border-[#dce9e5] bg-[#f0f7f4] px-4 py-2 text-center text-xs leading-5 text-[#355b52]">
      <p className="mx-auto max-w-5xl">{message}</p>
    </aside>
  );
}

