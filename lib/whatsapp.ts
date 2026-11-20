import settings from "@/client/settings.json";
import {
  formatPrice,
  numberText,
  productById,
  subtotal,
  type Lang,
  type Line,
} from "./catalog";
import { dictionaries } from "./pages";
import type { Details } from "./order-validation";
export function whatsappLink(
  lines: Line[],
  lang: Lang,
  details: Partial<Details> = {},
  number = settings.whatsappNumber,
) {
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  const t = dictionaries[lang];
  const rows = lines.map(({ id, qty }) => {
    const p = productById.get(id)!;
    return (
      p.name[lang] +
      " × " +
      numberText(qty, lang) +
      " — " +
      formatPrice(p.priceEgp * qty, lang)
    );
  });
  const governorate = settings.governorates.find(
    (g) => g.id === details.governorate,
  );
  const message = [
    t.waOpening,
    ...rows,
    t.subtotal + ": " + formatPrice(subtotal(lines), lang),
    details.name?.trim() && t.name + ": " + details.name.trim(),
    governorate && t.governorate + ": " + governorate[lang],
  ]
    .filter(Boolean)
    .join("\n");
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
}
