import en from "@/content/en";
import ar from "@/content/ar";
import { defaultLang, type Lang } from "./catalog";

export const dictionaries = { en, ar };
export const publicPaths = [
  "/",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
];
export const updatedOn = "2026-11-20";
export function pageCopy(path: string, lang: Lang = defaultLang) {
  const t = dictionaries[lang];
  const entries: Record<string, [string, string]> = {
    "/": [t.homeTitle, t.heroText],
    "/shop": [t.shopHeading, t.shopIntro],
    "/our-oil": [t.oilTitle, t.oilText],
    "/faq": [t.faqTitle, t.faqIntro],
    "/contact": [t.contactTitle, t.contactText],
    "/checkout": [t.checkout, t.checkoutIntro],
    "/privacy-policy": [t.privacy, t.privacyIntro],
    "/terms-of-service": [t.terms, t.termsIntro],
  };
  const [name, description] = entries[path] || [t.notFound, t.lostText];
  return { title: path === "/" ? name : name + " | Olivique", description };
}
