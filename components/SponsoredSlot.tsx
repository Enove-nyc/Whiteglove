"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import PromotionBanner from "@/components/PromotionBanner";
import type { Promotion, PromotionPlacement } from "@/lib/admin-content";

/**
 * One paid position on a page.
 *
 * Fetched on the client so a prerendered destination page can still show an
 * advertisement the owner saved after the last deploy. A server read of the
 * promotions store on a `revalidate` page is frozen at build — that is how
 * /directory used to serve a snapshot. This is the same pattern SitePromotions
 * already uses for the banners.
 *
 * Renders nothing when the slot is empty, so a page without a booking does not
 * grow a labelled box with no advertiser in it.
 */
export default function SponsoredSlot({
  placement,
  compact = true,
}: {
  placement: PromotionPlacement;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const [promotion, setPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    let active = true;
    const preview = new URLSearchParams(window.location.search).get("preview") || "";
    const query = new URLSearchParams({ path: pathname, placement });
    if (preview) query.set("preview", preview);
    fetch(`/api/promotions?${query.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { promotion?: Promotion | null }) => {
        if (active) setPromotion(data.promotion ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname, placement]);

  if (!promotion) return null;
  return <PromotionBanner promotion={promotion} placement={placement} compact={compact} />;
}
