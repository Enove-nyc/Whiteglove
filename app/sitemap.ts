import type { MetadataRoute } from "next";
import { isGuidePath } from "@/lib/guide-paths";
import { isPublicPage } from "@/lib/public-access";
import { siteOrigin } from "@/lib/seo";
import { publicPaths } from "@/lib/site-map";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  if (!origin) return [];

  const { getVacationDestinations } = await import("@/lib/vacation-destinations-view");
  return publicPaths(await getVacationDestinations())
    .filter(({ path }) => !isGuidePath(path) && isPublicPage(path))
    .map(({ path, priority, changeFrequency }) => ({
      url: new URL(path, origin).toString(),
      changeFrequency,
      priority,
    }));
}
