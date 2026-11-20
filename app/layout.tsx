import type { Viewport } from "next";
import type { ReactNode } from "react";
import { defaultLang } from "@/lib/catalog";
import { productionOrigin } from "@/lib/site-seo";
import { LanguageProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { Shell } from "./components/Shell";
import "./globals.css";
import "./motion.css";
import "./storefront.css";
import { motionTokens } from "@/lib/motion";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata = { icons: { icon: "/icon.svg" } };
const boot = `(()=>{let v=new URLSearchParams(location.search).get("lang");if(v!=="ar"&&v!=="en"){try{v=localStorage.getItem("olivique-lang")}catch{}}if(v!=="ar"&&v!=="en")v="${defaultLang}";document.documentElement.lang=v;document.documentElement.dir=v==="ar"?"rtl":"ltr"})()`;
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      data-scroll-behavior="smooth"
      data-motion={motionTokens}
      lang={defaultLang}
      dir={defaultLang === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        {!productionOrigin() && (
          <>
            <link rel="alternate" hrefLang="en" href="?lang=en" />
            <link rel="alternate" hrefLang="ar" href="?lang=ar" />
          </>
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=DM+Sans:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@500;600&family=Tajawal:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <LanguageProvider>
          <CartProvider>
            <Shell>{children}</Shell>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
