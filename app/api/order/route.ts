import { orderAmounts, productById } from "@/lib/catalog";
import { validate } from "@/lib/order-validation";
const MAX_BODY = 20_000;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
    ? forwardedProtocol : url.protocol.slice(0, -1);
  return origin === `${protocol}://${host}`;
}

async function readBody(request: Request) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0, text = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > MAX_BODY) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}

function failure(status: number, code: string, fields?: string[]) {
  return Response.json({ ok: false, code, ...(fields ? { fields } : {}) }, { status });
}
export async function POST(request: Request) {
  try {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return failure(415, "bad_request");
    if (!isSameOrigin(request)) return failure(403, "forbidden");
    if (Number(request.headers.get("content-length")) > MAX_BODY) return failure(413, "too_large");
    const text = await readBody(request);
    if (text === null) return failure(413, "too_large");
    let data;
    try { data = JSON.parse(text); } catch { return failure(400, "invalid"); }
    if (!data || typeof data !== "object" || Array.isArray(data)) return failure(400, "invalid");
    if (data.website) return Response.json({ ok: true });
    const { fields, details, items: lines, lang } = validate(data);
    if (fields.length) return failure(400, "invalid", fields);
    const { name, phone, governorate, address, notes } = details;
    const items = lines.map(({id, qty}) => `${productById.get(id)!.litres}L × ${qty}`).join("; ");
    const { subtotal, deliveryFee } = orderAmounts(lines);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const ref = "OLV-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join("");
    const url = process.env.GOOGLE_SCRIPT_URL;
    const token = process.env.GOOGLE_SCRIPT_TOKEN;
    if (!url || !token || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) return failure(503, "not_configured");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, ref, lang, name, phone, governorate, address, notes, items, subtotal, deliveryFee }),
      signal: AbortSignal.timeout(15000),
    });
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== "object" || !("ok" in result) || result.ok !== true) throw new Error("Sheet rejected order");
    return Response.json({ ok: true, ref }, { status: 201 });
  } catch { return failure(503, "save_failed"); }
}
