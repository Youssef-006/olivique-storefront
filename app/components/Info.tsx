"use client";
import Image from "next/image";
import settings from "@/client/settings.json";
import { useLang, useT } from "@/lib/i18n";
import { formatPrice, formatSize, products, deliveryFee } from "@/lib/catalog";
import { updatedOn } from "@/lib/pages";
import { whatsappLink } from "@/lib/whatsapp";
import { ContactLinks } from "./Shell";
import { LocalLink } from "./Shared";
import { Icon, Sprig } from "./Icons";

import { MotionHeading } from "./MotionHeading";
export function OurOil() {
  const t = useT(),
    { lang } = useLang();
  return (
    <section className="wrap info-hero">
      <div>
        <p className="eyebrow">
          <i />
          {t.oil}
        </p>
        <MotionHeading as="h1">{t.oilTitle}</MotionHeading>
        <p className="intro" data-reveal="text">
          {t.oilText}
        </p>
        <p>
          {t.oilDetail} · {products.map((p) => formatSize(p, lang)).join(" / ")}
        </p>
        <LocalLink href="/#collection" className="button">
          {t.browse}
        </LocalLink>
      </div>
      <Image
        src="/hero.svg"
        width={920}
        height={720}
        unoptimized
        alt={t.galleryAlt}
      />
    </section>
  );
}
export function FAQ() {
  const t = useT(),
    { lang } = useLang();
  const qa = [
    [
      t.faqSize,
      products
        .map((p) => formatSize(p, lang) + " — " + formatPrice(p.priceEgp, lang))
        .join(" · "),
    ],
    [t.faqHow, t.howText],
    [t.faqPay, t.paymentInfo],
    [
      t.faqFee,
      deliveryFee === null ? t.feeUnknown : formatPrice(deliveryFee, lang),
    ],
    [
      t.faqContact,
      <LocalLink key="contact" href="/contact" className="text-link">
        {t.contactLink}
      </LocalLink>,
    ],
  ];
  return (
    <section className="reading faq-page">
      <Sprig />
      <MotionHeading as="h1">{t.faqTitle}</MotionHeading>
      {qa.map(([q, a], i) => (
        <details key={i}>
          <summary>
            {q}
            <Icon name="chevron" />
          </summary>
          <div>{a}</div>
        </details>
      ))}
    </section>
  );
}
export function Contact() {
  const t = useT();
  return (
    <section className="reading simple-page">
      <p className="eyebrow">
        <i />
        {t.contact}
      </p>
      <MotionHeading as="h1">{t.contactTitle}</MotionHeading>
      <ContactLinks />
      <LocalLink className="text-link" href="/#faq">
        {t.faq}
        <Icon name="arrow" size={16} />
      </LocalLink>
    </section>
  );
}
export function LegalPage({ privacy }: { privacy: boolean }) {
  const t = useT(),
    { lang } = useLang();
  const sections = privacy ? t.privacySections : t.termsSections;
  return (
    <article className="reading legal">
      <p className="eyebrow">
        <i />
        {t.legal}
      </p>
      <MotionHeading as="h1">{privacy ? t.privacy : t.terms}</MotionHeading>
      <p className="muted">
        {t.updated}{" "}
        <time dateTime={updatedOn}>
          {new Intl.DateTimeFormat(
            lang === "ar" && !settings.arabicIndicDigits
              ? "ar-EG-u-nu-latn"
              : lang,
            { dateStyle: "long", timeZone: "UTC" },
          ).format(new Date(updatedOn))}
        </time>
      </p>
      {sections.map(({ heading, body }, i) => (
        <section key={i}>
          <MotionHeading>{heading}</MotionHeading>
          <p data-reveal="text">
            {body.replace("{operator}", settings.operator[lang])}
          </p>
        </section>
      ))}
      <section>
        <MotionHeading>{t.contact}</MotionHeading>
        <ContactLinks />
      </section>
    </article>
  );
}
export function Missing() {
  const t = useT(),
    { lang } = useLang();
  const wa = whatsappLink([{ id: products[0].id, qty: 1 }], lang);
  return (
    <section className="reading simple-page">
      <p className="eyebrow">
        <i />
        404
      </p>
      <MotionHeading as="h1">{t.notFound}</MotionHeading>
      <p className="intro" data-reveal="text">
        {t.lostText}
      </p>
      <div className="actions">
        <LocalLink className="button" href="/">
          {t.home}
        </LocalLink>
        <LocalLink className="button outline" href="/#collection">
          {t.shop}
        </LocalLink>
        {wa && (
          <a className="text-link" href={wa}>
            {t.wa}
          </a>
        )}
      </div>
    </section>
  );
}
