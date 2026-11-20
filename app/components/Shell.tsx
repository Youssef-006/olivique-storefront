"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import settings from "@/client/settings.json";
import { useLang, useT } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { numberText, subtotal } from "@/lib/catalog";
import { Icon } from "./Icons";
import { LocalLink, Wordmark, LangButton } from "./Shared";
import { CartDrawer, Money } from "./CartUI";
import { observeInView, permits } from "@/lib/motion";
export const routes = [
  ["/", "home"],
  ["/#our-story", "oil"],
  ["/#faq", "faq"],
  ["/contact", "contact"],
] as const;
export function ContactLinks() {
  const t = useT(),
    n = settings.whatsappNumber.replace(/\D/g, "");
  if (!settings.email && !n && !settings.instagramUrl)
    return <p>{t.noContact}</p>;
  return (
    <div className="contact-links">
      {settings.email && (
        <a href={"mailto:" + settings.email} dir="ltr">
          {settings.email}
        </a>
      )}
      {n && <a href={"https://wa.me/" + n}>{t.whatsapp}</a>}
      {settings.instagramUrl && (
        <a href={settings.instagramUrl}>{t.instagram}</a>
      )}
    </div>
  );
}
function Reveal({ path, children }: { path: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js-motion");
    const nodes = root.current.querySelectorAll<HTMLElement>("[data-reveal]");
    const stops: (() => void)[] = [];
    for (const node of nodes) {
      if (node.dataset.seen) continue;
      const kind = node.dataset.reveal;
      const initial = node.getBoundingClientRect();
      const alreadyVisible = initial.top < innerHeight && initial.bottom > 0;
      const stop = observeInView(node, (entry) => {
        if (!entry.isIntersecting) return;
        node.dataset.seen = "true";
        const effect =
          kind === "branch"
            ? "branchDivider"
            : kind === "chapter"
              ? "storyChapters"
              : "scrollReveals";
        if (!alreadyVisible && permits(effect))
          node.classList.add("reveal-once");
        if (kind === "chapter" && node.parentElement) {
          const list = node.parentElement;
          const reached = Array.from(list.children).indexOf(node) + 1;
          const fraction = Math.max(
            Number(list.style.getPropertyValue("--progress")),
            reached / list.children.length,
          );
          list.style.setProperty("--progress", String(fraction));
        }
        stop();
      });
      stops.push(stop);
    }
    return () => stops.forEach((stop) => stop());
  }, [path, children]);
  return <div ref={root}>{children}</div>;
}
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    { lang } = useLang(),
    t = useT(),
    cart = useCart();
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  function nav() {
    return routes.map(([href, key]) => (
      <LocalLink
        key={href}
        href={href}
        aria-current={path === href ? "page" : undefined}
        onClick={() => setMenu(false)}
      >
        {t[key]}
      </LocalLink>
    ));
  }
  return (
    <div
      className={cart.count && path !== "/checkout" ? "shell has-bar" : "shell"}
    >
      <a className="skip" href="#main">
        {t.skip}
      </a>
      <header>
        <div className="utility">
          <div className="wrap utility-inner">
            <span>
              <Icon name="pin" size={14} />
              {t.egypt}
              <i />
              {t.currency}
            </span>
            <strong className="offer-preview">{t.firstOffer}</strong>
            <span>
              <Icon name="cash" size={16} />
              {t.cod}
            </span>
          </div>
        </div>
        <div className="nav-wrap wrap">
          <button
            className="mobile-menu icon-button"
            ref={menuButton}
            aria-label={t.menu}
            aria-expanded={menu}
            aria-controls="mobile-navigation"
            onClick={() => setMenu(!menu)}
          >
            <Icon name={menu ? "close" : "menu"} />
          </button>
          <LocalLink
            href="/"
            className="brand-link"
            onClick={() => setMenu(false)}
          >
            <Wordmark />
          </LocalLink>
          <nav className="desktop-nav">{nav()}</nav>
          <div className="nav-actions">
            <LangButton />
            <span className="vline" />
            <button
              className="cart-trigger"
              aria-label={
                t.yourCart + " (" + numberText(cart.count, lang) + ")"
              }
              onClick={() => {
                setMenu(false);
                cart.setOpen(true);
              }}
            >
              <Icon name="bag" />
              <span className="cart-word">{t.bag}</span>
              <span aria-live="polite" aria-atomic="true">
                <span
                  key={cart.pulse}
                  className={"badge " + (cart.pulse ? "pulse" : "")}
                >
                  {numberText(cart.count, lang)}
                </span>
              </span>
            </button>
          </div>
        </div>
        {menu && (
          <nav
            id="mobile-navigation"
            className="mobile-nav"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setMenu(false);
                menuButton.current?.focus();
              }
            }}
          >
            {nav()}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        <Reveal path={path}>{children}</Reveal>
      </main>
      <footer>
        <div className="wrap footer-inner">
          <div>
            {path !== "/" && <LocalLink href="/">
              <Wordmark />
            </LocalLink>}
            <p>{t.footerDesc}</p>
          </div>
          <nav>
            <LocalLink href="/#our-story">{t.oil}</LocalLink>
            <LocalLink href="/#faq">{t.faq}</LocalLink>
            <LocalLink href="/contact">{t.contact}</LocalLink>
          </nav>
          <nav>
            <LocalLink href="/privacy-policy">{t.privacy}</LocalLink>
            <LocalLink href="/terms-of-service">{t.terms}</LocalLink>
          </nav>
        </div>
        {path === "/" && <Reveal path={path}><div className="footer-signature wrap" data-reveal="signature"><LocalLink href="/" dir="ltr" lang="en">{settings.brand.en}</LocalLink></div></Reveal>}
      </footer>
      {!!cart.count && path !== "/checkout" && (
        <div className="sticky-bar">
          <button className="button full" onClick={() => cart.setOpen(true)}>
            <Icon name="bag" />
            {t.viewCart} ·{" "}
            <span
              className={"mobile-count " + (cart.pulse ? "pulse" : "")}
              key={cart.pulse}
            >
              {numberText(cart.count, lang)}
            </span>{" "}
            {cart.count === 1 ? t.itemSingular : t.itemPlural} ·{" "}
            <Money value={subtotal(cart.lines)} />
          </button>
        </div>
      )}
      <CartDrawer />
    </div>
  );
}
