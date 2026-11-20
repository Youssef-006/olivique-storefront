import settings from "../client/settings.json";
import {
  maxQty,
  normalizePhone,
  productById,
  type Lang,
  type Line,
} from "./catalog";
export const formFields = [
  "name",
  "phone",
  "governorate",
  "address",
  "notes",
] as const;
export type Field = (typeof formFields)[number];
export type Details = Record<Field, string>;
export type InvalidField = Field | "lang" | "items";
export const emptyDetails: Details = {
  name: "",
  phone: "",
  governorate: "",
  address: "",
  notes: "",
};
export function validate(data: Record<string, unknown>) {
  const fields: InvalidField[] = [];
  const clean = (key: Field) =>
    typeof data[key] === "string" ? data[key].trim() : "";
  const details = {
    name: clean("name"),
    phone: normalizePhone(clean("phone")),
    governorate: clean("governorate"),
    address: clean("address"),
    notes: clean("notes"),
  };
  if (!details.name || details.name.length > 120) fields.push("name");
  if (!/^01[0125]\d{8}$/.test(details.phone)) fields.push("phone");
  if (!settings.governorates.some((g) => g.id === details.governorate))
    fields.push("governorate");
  if (details.address.length < 10 || details.address.length > 300)
    fields.push("address");
  if (
    (data.notes !== undefined && typeof data.notes !== "string") ||
    details.notes.length > 500
  )
    fields.push("notes");
  if (data.lang !== "en" && data.lang !== "ar") fields.push("lang");
  const items: Line[] = [];
  const seen = new Set<string>();
  if (
    !Array.isArray(data.items) ||
    data.items.length < 1 ||
    data.items.length > 10
  )
    fields.push("items");
  else
    for (const item of data.items) {
      if (
        !item ||
        !productById.has(item.id) ||
        seen.has(item.id) ||
        !Number.isSafeInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > maxQty
      ) {
        fields.push("items");
        break;
      }
      seen.add(item.id);
      items.push({ id: item.id, qty: item.qty });
    }
  return { fields, details, items, lang: data.lang as Lang };
}
