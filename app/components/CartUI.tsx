"use client";
import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";
import {
  formatPrice,
  orderAmounts,
  numberText,
  productById,
  type Line,
} from "@/lib/catalog";
import { useLang, useT } from "@/lib/i18n";
import { whatsappLink } from "@/lib/whatsapp";
import { Icon } from "./Icons";
import { LocalLink, ProductArt, Stepper, LangButton } from "./Shared";
export function Money({ value }: { value: number }) {
  const { lang } = useLang();
  return <bdi>{formatPrice(value, lang)}</bdi>;
}
export function Totals({ lines }: { lines: Line[] }) {
  const t = useT(),
    { subtotal: sum, deliveryFee, total } = orderAmounts(lines);
  return (
    <dl className="totals">
      <div>
        <dt>{t.subtotal}</dt>
        <dd>
          <Money value={sum} />
        </dd>
      </div>
      <div>
        <dt>{t.delivery}</dt>
        <dd>
          {deliveryFee === null ? t.feeUnknown : <Money value={deliveryFee} />}
        </dd>
      </div>
      <div className="total">
        <dt>{deliveryFee === null ? t.beforeDelivery : t.total}</dt>
        <dd>
          <Money value={total} />
        </dd>
      </div>
    </dl>
  );
}
export function CartLines({
  lines,
  edit = true,
  disabled = false,
}: {
  lines: Line[];
  edit?: boolean;
  disabled?: boolean;
}) {
  const { quantity } = useCart(),
    { lang } = useLang(),
    t = useT();
  return (
    <ul className="cart-lines">
      {lines.map(({ id, qty }) => {
        const p = productById.get(id)!;
        return (
          <li key={id}>
            <ProductArt product={p} small />
            <div className="line-content">
              <strong>{p.name[lang]}</strong>
              <div className="muted">
                <Money value={p.priceEgp} /> × {numberText(qty, lang)}
              </div>
              {edit && (
                <div className="line-edit">
                  <Stepper
                    qty={qty}
                    label={p.name[lang]}
                    onChange={(n) => quantity(id, n)}
                    disabled={disabled}
                  />
                  <button
                    disabled={disabled}
                    className="text-link"
                    onClick={() => quantity(id, 0)}
                    type="button"
                  >
                    {t.remove}
                  </button>
                </div>
              )}
            </div>
            <strong className="line-sum">
              <Money value={p.priceEgp * qty} />
            </strong>
          </li>
        );
      })}
    </ul>
  );
}
export function EmptyCart({ close }: { close?: () => void }) {
  const t = useT();
  return (
    <section className="empty">
      <Icon name="bag" size={40} />
      <h2>{t.empty}</h2>
      <p>{t.emptyText}</p>
      <LocalLink className="button" href="/#collection" onClick={close}>
        {t.browse}
      </LocalLink>
    </section>
  );
}
export function CartDrawer() {
  const { open, setOpen, lines, count } = useCart(),
    { lang } = useLang(),
    t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const url = whatsappLink(lines, lang);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <dialog
      className="drawer"
      ref={ref}
      aria-labelledby="bag-title"
      onCancel={() => setOpen(false)}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          setOpen(false);
      }}
    >
      <div className="drawer-head">
        <h2 id="bag-title">
          {t.yourCart} <small>({numberText(count, lang)})</small>
        </h2>
        <LangButton />
        <button
          aria-label={t.close}
          className="icon-button"
          onClick={() => setOpen(false)}
        >
          <Icon name="close" />
        </button>
      </div>
      {lines.length ? (
        <>
          <div className="drawer-body">
            <CartLines lines={lines} />
          </div>
          <div className="drawer-foot">
            <Totals lines={lines} />
            <LocalLink
              className="button full"
              href="/checkout"
              onClick={() => setOpen(false)}
            >
              {t.checkout}
            </LocalLink>
            {url && (
              <a href={url} className="button outline full">
                {t.wa}
              </a>
            )}
          </div>
        </>
      ) : (
        <EmptyCart close={() => setOpen(false)} />
      )}
    </dialog>
  );
}
