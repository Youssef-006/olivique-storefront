import type { MetadataRoute } from "next";
import { productionOrigin } from "@/lib/site-seo";
export default function robots(): MetadataRoute.Robots {
  const origin = productionOrigin();
  return {
    rules:
      process.env.VERCEL_ENV === "preview"
        ? { userAgent: "*", disallow: "/" }
        : { userAgent: "*", allow: "/", disallow: ["/api/", "/checkout"] },
    ...(origin && process.env.VERCEL_ENV !== "preview"
      ? { sitemap: origin + "/sitemap.xml" }
      : {}),
  };
}
