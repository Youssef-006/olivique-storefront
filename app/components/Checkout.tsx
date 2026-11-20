"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import settings from "@/client/settings.json";
import { useLang, useT } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { type Line } from "@/lib/catalog";
import {
  emptyDetails,
  formFields,
  validate,
  type Field,
  type InvalidField,
} from "@/lib/order-validation";
import { whatsappLink } from "@/lib/whatsapp";
import { CartLines, Totals, EmptyCart } from "./CartUI";
import { LocalLink } from "./Shared";
import { Icon } from "./Icons";

const fieldErrors = {
  name: "errName",
  phone: "errPhone",
  governorate: "errGovernorate",
  address: "errAddress",
  notes: "errNotes",
} as const;
const codes = {
  bad_request: "badRequest",
  forbidden: "badRequest",
  too_large: "tooLarge",
  invalid: "invalid",
  not_configured: "notConfigured",
  save_failed: "saveFailed",
} as const;
type ErrorCode = keyof typeof codes;

export function Checkout() {
  const cart = useCart(),
    t = useT(),
    { lang } = useLang();
  const [details, setDetails] = useState(emptyDetails),
    [website, setWebsite] = useState("");
  const [fields, setFields] = useState<InvalidField[]>([]),
    [code, setCode] = useState<ErrorCode | null>(null);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{ ref: string; lines: Line[] } | null>(
    null,
  );
  const form = useRef<HTMLFormElement>(null),
    success = useRef<HTMLHeadingElement>(null),
    busy = useRef(false);
  useEffect(() => {
    if (receipt) success.current?.focus();
  }, [receipt]);
  function highlight(errors: InvalidField[]) {
    setFields(errors);
    const first = formFields.find((key) => errors.includes(key));
    if (first)
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLElement>("#order-" + first)?.focus(),
      );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    const lines = cart.lines.map((line) => ({ ...line }));
    const payload = { ...details, website, lang, items: lines };
    const check = validate(payload);
    if (check.fields.length) {
      highlight(check.fields);
      setCode("invalid");
      return;
    }
    busy.current = true;
    setSending(true);
    setFields([]);
    setCode(null);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const result = await res.json();
      if (
        res.status === 201 &&
        result.ok === true &&
        typeof result.ref === "string"
      ) {
        setReceipt({ ref: result.ref, lines });
        cart.clear();
        setDetails(emptyDetails);
      } else {
        setCode(
          Object.hasOwn(codes, result.code) ? result.code : "save_failed",
        );
        if (Array.isArray(result.fields)) highlight(result.fields);
      }
    } catch {
      setCode("save_failed");
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  const wa = whatsappLink(cart.lines, lang, details);
  function props(key: Field) {
    const invalid = fields.includes(key);
    return {
      id: "order-" + key,
      name: key,
      value: details[key],
      disabled: sending,
      required: key !== "notes",
      "aria-invalid": invalid,
      "aria-describedby": invalid ? "error-" + key : undefined,
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
      ) => {
        const value = e.target.value;
        setDetails((d) => ({ ...d, [key]: value }));
        setFields((old) => old.filter((f) => f !== key));
      },
    };
  }
  function error(key: Field) {
    return fields.includes(key) ? (
      <span className="field-error" id={"error-" + key}>
        {t[fieldErrors[key]]}
      </span>
    ) : null;
  }
  if (receipt)
    return (
      <section className="reading receipt">
        <Icon name="check" size={40} />
        <h1 tabIndex={-1} ref={success}>
          {t.received}
        </h1>
        <p role="status">{t.recorded}</p>
        <p>
          {t.reference} <strong dir="ltr">{receipt.ref}</strong>
        </p>
        <h2>{t.summary}</h2>
        <CartLines lines={receipt.lines} edit={false} />
        <Totals lines={receipt.lines} />
        <LocalLink href="/#collection" className="button">
          {t.continueShopping}
        </LocalLink>
      </section>
    );
  return (
    <section className="wrap checkout-page">
      <p className="eyebrow">
        <i />
        {t.bag}
      </p>
      <h1>{t.checkout}</h1>
      {!cart.lines.length ? (
        <EmptyCart />
      ) : (
        <div className="checkout-grid">
          <section className="review-panel">
            <h2>{t.review}</h2>
            <CartLines lines={cart.lines} disabled={sending} />
            <Totals lines={cart.lines} />
            <p className="payment">
              <Icon name="cash" />
              {t.cod}
            </p>
          </section>
          <form ref={form} noValidate onSubmit={submit}>
            <h2>{t.details}</h2>
            <div className="field">
              <label htmlFor="order-name">{t.name}</label>
              <input
                {...props("name")}
                autoComplete="name"
                enterKeyHint="next"
                inputMode="text"
                maxLength={120}
              />
              {error("name")}
            </div>
            <div className="field">
              <label htmlFor="order-phone">{t.phone}</label>
              <input
                {...props("phone")}
                type="tel"
                dir="ltr"
                autoComplete="tel"
                inputMode="tel"
                enterKeyHint="next"
              />
              {error("phone")}
            </div>
            <div className="field">
              <label htmlFor="order-governorate">{t.governorate}</label>
              <div className="select-wrap">
                <select {...props("governorate")} autoComplete="address-level1">
                  <option value="">{t.chooseGovernorate}</option>
                  {settings.governorates.map((g) => (
                    <option value={g.id} key={g.id}>
                      {g[lang]}
                    </option>
                  ))}
                </select>
                <Icon name="chevron" size={18} />
              </div>
              {error("governorate")}
            </div>
            <div className="field">
              <label htmlFor="order-address">{t.address}</label>
              <textarea
                {...props("address")}
                autoComplete="street-address"
                rows={3}
                inputMode="text"
                enterKeyHint="next"
                placeholder={t.addressHint}
                maxLength={300}
              />
              {error("address")}
            </div>
            <div className="field">
              <label htmlFor="order-notes">{t.notes}</label>
              <textarea
                {...props("notes")}
                rows={2}
                autoComplete="off"
                inputMode="text"
                enterKeyHint="done"
                maxLength={500}
              />
              {error("notes")}
            </div>
            <div hidden>
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <p className="payment">
              <Icon name="cash" />
              {t.paymentInfo}
            </p>
            <div aria-live="polite" className="form-status">
              {code && (
                <p className="error-box">
                  {t[codes[code]]}
                  {code === "save_failed" && wa && " " + t.checkWa}
                  {fields.includes("items") && " " + t.errItems}
                </p>
              )}
            </div>
            <button className="button full" disabled={sending}>
              {sending ? t.submitting : t.place}
            </button>
            {wa && (
              <a
                className={
                  "button full " + (code === "not_configured" ? "" : "outline")
                }
                href={wa}
              >
                {t.wa}
              </a>
            )}
          </form>
        </div>
      )}
    </section>
  );
}
