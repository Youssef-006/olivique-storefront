import type { MetadataRoute } from "next";
import { productionOrigin } from "@/lib/site-seo";
import { publicPaths } from "@/lib/pages";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = productionOrigin();
  if (!origin || process.env.VERCEL_ENV === "preview") return [];
  return publicPaths.map((path) => ({
    url: origin + path,
    alternates: {
      languages: {
        en: origin + path + "?lang=en",
        ar: origin + path + "?lang=ar",
      },
    },
  }));
}
