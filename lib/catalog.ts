import settings from "../client/settings.json";

export type Lang = "en" | "ar";
export type Line = { id: string; qty: number };
export type Product = (typeof settings.products)[number];
export const products = settings.products;
export const productById = new Map(products.map((p) => [p.id, p]));
export const deliveryFee = settings.deliveryFeeEgp as number | null;
export const maxQty = settings.maxQtyPerLine;
export const defaultLang: Lang =
  settings.defaultLanguage === "ar" ? "ar" : "en";
export function subtotal(lines: Line[]) {
  return lines.reduce(
    (sum, { id, qty }) => sum + (productById.get(id)?.priceEgp ?? 0) * qty,
    0,
  );
}
export function savings(p: Product) {
  const single = products.find((item) => item.litres === 1);
  return single ? Math.max(0, single.priceEgp * p.litres - p.priceEgp) : 0;
}
export function orderAmounts(lines: Line[]) {
  const itemsSubtotal = subtotal(lines);
  return {
    subtotal: itemsSubtotal,
    deliveryFee,
    total: itemsSubtotal + (deliveryFee ?? 0),
  };
}
export function cleanCart(raw: unknown): Line[] {
  if (!Array.isArray(raw)) return [];
  const result = new Map<string, number>();
  for (const line of raw) {
    if (line && productById.has(line.id) && Number.isSafeInteger(line.qty)) {
      result.set(line.id, Math.min(maxQty, Math.max(1, line.qty)));
    }
  }
  return Array.from(result, ([id, qty]) => ({ id, qty }));
}
export function numberText(value: number, lang: Lang) {
  return new Intl.NumberFormat(
    lang === "en"
      ? "en-EG"
      : settings.arabicIndicDigits
        ? "ar-EG-u-nu-arab"
        : "ar-EG-u-nu-latn",
    { maximumFractionDigits: 2 },
  ).format(value);
}
export function formatPrice(value: number, lang: Lang) {
  return numberText(value, lang) + (lang === "ar" ? " ج.م" : " EGP");
}
export function formatSize(p: Product, lang: Lang) {
  return numberText(p.litres, lang) + (lang === "ar" ? " لتر" : "L");
}
export function normalizePhone(phone: string) {
  return phone
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[\s-]/g, "")
    .replace(/^(?:\+20|0020)/, "0");
}
