"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import settings from "@/client/settings.json";
import { useT, useLang } from "@/lib/i18n";
import { maxQty, numberText, type Product } from "@/lib/catalog";
import { Icon, Sprig } from "./Icons";
export function LocalLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { lang } = useLang();
  const currentPath = usePathname();
  const [path, anchor] = href.split("#");
  const url = path + "?lang=" + lang + (anchor ? "#" + anchor : "");
  if (anchor) return <a href={path === currentPath ? "#" + anchor : url} {...props} />;
  return <Link href={url} {...props} />;
}
export function Wordmark() {
  return (
    <span className="wordmark" dir="ltr" lang="en">
      {settings.logoIcon ? (
        <Image
          src={settings.logoIcon}
          alt=""
          width={39}
          height={39}
          unoptimized
        />
      ) : (
        <Sprig size={39} />
      )}
      <span>{settings.brand.en}</span>
    </span>
  );
}
export function LangButton() {
  const { lang, change } = useLang();
  return (
    <button
      className="lang-button"
      type="button"
      lang={lang === "en" ? "ar" : "en"}
      aria-label={lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
      aria-pressed={lang === "ar"}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => change(lang === "en" ? "ar" : "en")}
    >
      <Icon name="globe" size={17} />
      {lang === "en" ? "العربية" : "EN"}
    </button>
  );
}
export function ProductArt({
  product,
  small = false,
}: {
  product: Product;
  small?: boolean;
}) {
  const { lang } = useLang();
  return (
    <Image
      unoptimized
      src={product.image || "/" + product.litres + "l.svg"}
      width={720}
      height={540}
      alt={product.name[lang]}
      className={small ? "thumb" : "product-art"}
    />
  );
}
export function Stepper({
  qty,
  onChange,
  label,
  disabled = false,
}: {
  qty: number;
  onChange: (n: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const t = useT(),
    { lang } = useLang();
  return (
    <div
      className="stepper"
      role="group"
      aria-label={t.quantity + " · " + label}
    >
      <button
        type="button"
        disabled={disabled || qty <= 1}
        aria-label={t.decrease + " · " + label}
        onClick={() => onChange(qty - 1)}
      >
        −
      </button>
      <span dir="ltr">{numberText(qty, lang)}</span>
      <button
        type="button"
        disabled={disabled || qty >= maxQty}
        aria-label={t.increase + " · " + label}
        onClick={() => onChange(qty + 1)}
      >
        +
      </button>
    </div>
  );
}
