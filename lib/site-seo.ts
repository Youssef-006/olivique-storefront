import client from "../client/settings.json";
import type { Metadata } from "next";
import { pageCopy, updatedOn } from "./pages";
export function productionOrigin() {
  const value = process.env.SITE_URL;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.href === url.origin + "/"
    )
      return url.origin;
  } catch {
    /* leave origin-dependent metadata unset until a valid domain is configured */
  }
}
export function pageMetadata(
  path: string,
  title: string,
  description: string,
): Metadata {
  const origin = productionOrigin();
  const url = origin ? new URL(path, origin) : undefined;
  return {
    title,
    description,
    alternates: url
      ? {
          canonical: url,
          languages: { en: url.href + "?lang=en", ar: url.href + "?lang=ar" },
        }
      : undefined,
    openGraph: {
      type: "website",
      siteName: client.brand.en,
      title,
      description,
      url,
      images:
        origin && client.socialImage
          ? [new URL(client.socialImage, origin)]
          : undefined,
    },
  };
}
export function metadataFor(path: string): Metadata {
  const { title, description } = pageCopy(path);
  return {
    ...pageMetadata(path, title, description),
    ...(path === "/checkout" || path === "/404"
      ? { robots: { index: false, follow: false } }
      : {}),
    ...(["/privacy-policy", "/terms-of-service"].includes(path)
      ? { other: { "dcterms.modified": updatedOn } }
      : {}),
  };
}
