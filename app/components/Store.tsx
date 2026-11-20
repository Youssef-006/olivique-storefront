"use client";
import { FilmControl, useBackgroundFilm } from "./BackgroundFilm";
import { useState, useEffect, useRef } from "react";
import { useLang, useT } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import {
  products,
  formatSize,
  formatPrice,
  deliveryFee,
  savings,
  type Product,
} from "@/lib/catalog";
import { whatsappLink } from "@/lib/whatsapp";
import { Icon } from "./Icons";
import { LocalLink, ProductArt, Stepper } from "./Shared";
import { Money } from "./CartUI";

import { HomeEntry } from "./HomeEntry";
import { Story } from "./Story";
import { MotionHeading } from "./MotionHeading";
import { flyToCart } from "@/lib/motion";

function useFeedback() {
  const [added, setAdded] = useState(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    added,
    notify() {
      clearTimeout(timer.current);
      setAdded(true);
      timer.current = setTimeout(() => setAdded(false), 1200);
    },
  };
}
function ProductCard({ p }: { p: Product }) {
  const { lang } = useLang(),
    t = useT(),
    cart = useCart(),
    feedback = useFeedback();
  const [qty, setQty] = useState(1),
    saving = savings(p);
  return (
    <article
      className="product-card"
      data-reveal="card"
      data-added={feedback.added}
    >
      <div className="product-frame"><ProductArt product={p} /></div>
      <div className="product-copy">
        <p className="product-kind">{t.brandType}</p>
        <div className="product-title">
          <h3>{formatSize(p, lang)}</h3>
          <strong>
            <Money value={p.priceEgp} />
          </strong>
        </div>
        {p.blurb[lang] && <p>{p.blurb[lang]}</p>}
        <p className="unit">
          <Money value={p.priceEgp / p.litres} /> {t.perLitre}
        </p>
        {saving > 0 && (
          <p className="savings">
            <Icon name="leaf" size={14} />
            {t.saves.replace("{amount}", formatPrice(saving, lang))}
          </p>
        )}
        <div className="product-controls">
          <Stepper qty={qty} label={p.name[lang]} onChange={setQty} />
          <button
            className="button"
            onClick={(event) => {
              flyToCart(event.currentTarget);
              cart.add(p.id, qty);
              feedback.notify();
            }}
          >
            <Icon name={feedback.added ? "check" : "bag"} size={16} />
            <span aria-live="polite">{feedback.added ? t.added : t.add}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
export function Collection({ home = false }: { home?: boolean }) {
  const t = useT();
  return (
    <section id="collection" className="wrap collection">
      <header className="section-header">
        <div>
          <p className="eyebrow">
            {t.collection}
          </p>
          {home ? (
            <MotionHeading>{t.sizesTitle}</MotionHeading>
          ) : (
            <>
              <MotionHeading as="h1">{t.shopHeading}</MotionHeading>
              <p className="intro" data-reveal="text">
                {t.shopIntro}
              </p>
            </>
          )}
        </div>
      </header>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
function OrderingGuide() {
  const t = useT(), {lang} = useLang();
  const questions = [
    [t.faqHow, t.howText],
    [t.faqSize, products.map(p => formatSize(p, lang) + " · " + formatPrice(p.priceEgp, lang)).join(" / ")],
    [t.faqContact, <LocalLink key="contact" href="/contact">{t.contactLink}</LocalLink>],
    [t.faqPay, t.paymentInfo],
    [t.faqFee, deliveryFee === null ? t.feeUnknown : formatPrice(deliveryFee, lang)],
  ];
  return <section id="faq" className="ordering-guide wrap">
    <div className="guide-title"><MotionHeading>{t.faqTitle}</MotionHeading></div>
    <div className="guide-rows" data-reveal="rules">{questions.map(([question, answer], i) =>
      <details key={i} open={i === 0}><summary>{question}<Icon name="chevron" size={19}/></summary><p>{answer}</p></details>
    )}</div>
  </section>;
}
export function Home() {
  const t = useT(),
    { lang } = useLang(),
    cart = useCart(),
    feedback = useFeedback();
  const [product, setProduct] = useState(products[0]);
  const {root,video,scene,control} = useBackgroundFilm("/media/hero.mp4", "/media/hero-poster.webp");
  const wa = whatsappLink([{ id: product.id, qty: 1 }], lang);
  return (
    <>
      <HomeEntry hero={root} />
      <section className="hero" ref={root}>
        <div className="hero-copy">
          <p className="eyebrow">
            {t.brandType}
          </p>
          <h1>
            <span className="hero-line">
              <span>{t.hero1}</span>
            </span>{" "}
            <span className="hero-line">
              <em>{t.hero2}</em>
            </span>
          </h1>
          <p className="hero-intro">{t.heroText}</p>
          <div className="size-picker" role="group" aria-label={t.chooseSize}>
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={product.id === p.id}
                onClick={() => setProduct(p)}
              >
                {formatSize(p, lang)}
              </button>
            ))}
            <span className="hero-price">
              <Money value={product.priceEgp} />
            </span>
          </div>
          <div className="hero-actions">
            <button
              className="button"
              onClick={() => {
                cart.add(product.id);
                feedback.notify();
                cart.setOpen(true);
              }}
            >
              <Icon name="bag" size={18} />
              {feedback.added ? t.added : t.orderNow}
            </button>
            <LocalLink className="text-link" href="/#our-story">
              {t.oil}
              <Icon name="arrow" size={17} />
            </LocalLink>
          </div>
          {wa && (
            <a className="text-link" href={wa}>
              {t.wa}
            </a>
          )}
        </div>
        <div className="hero-film" aria-hidden="true">
          <video ref={video} muted loop playsInline preload="none" poster="/media/hero-poster.webp" data-scene={scene} />
        </div>
        <div className="hero-film-control"><FilmControl {...control} /></div>
      </section>
      <div className="facts">
        <div className="wrap facts-inner">
          <span>
            <Icon name="leaf" />
            {t.brandType}
          </span>
          <span>
            <Icon name="box" />
            {products.map((p) => formatSize(p, lang)).join(" · ")}
          </span>
          <span>
            <Icon name="cash" />
            {t.cod}
          </span>
        </div>
      </div>
      <Collection home />
      <Story />
      <OrderingGuide />
    </>
  );
}
