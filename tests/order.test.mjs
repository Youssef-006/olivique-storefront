import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register("./local-loader.mjs", import.meta.url);
const { POST } = await import("../app/api/order/route.ts");
const { cleanCart, normalizePhone, savings, products, formatPrice } =
  await import("../lib/catalog.ts");
const { whatsappLink } = await import("../lib/whatsapp.ts");
const { pageMetadata, productionOrigin } = await import("../lib/site-seo.ts");
const { default: sitemap } = await import("../app/sitemap.ts");
const { default: robots } = await import("../app/robots.ts");
const envKeys = [
  "GOOGLE_SCRIPT_URL",
  "GOOGLE_SCRIPT_TOKEN",
  "VERCEL_ENV",
  "SITE_URL",
];
const original = Object.fromEntries(envKeys.map((k) => [k, process.env[k]]));
afterEach(() => {
  mock.restoreAll();
  for (const k of envKeys) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
});
const base = "http://localhost:3000";
const valid = {
  name: " TEST Buyer ",
  phone: "+٢٠ ١٠-١٢٣٤٥٦٧٨",
  governorate: "cairo",
  address: " TEST street, building 10 ",
  notes: "",
  lang: "en",
  items: [
    { id: "olivique-1l", qty: 2 },
    { id: "olivique-5l", qty: 1 },
  ],
  website: "",
};
function post(data = valid, headers = {}) {
  return POST(
    new Request(base + "/api/order", {
      method: "POST",
      headers: { "content-type": "application/json", origin: base, ...headers },
      body: typeof data === "string" ? data : JSON.stringify(data),
    }),
  );
}
function configure() {
  process.env.GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/LOCAL_TEST/exec";
  process.env.GOOGLE_SCRIPT_TOKEN = "local-test-only";
}
test("rejects incorrect MIME, origin, oversized bodies and malformed objects", async () => {
  for (const [body, headers, status, code] of [
    [valid, { "content-type": "text/plain" }, 415, "bad_request"],
    [valid, { origin: "" }, 403, "forbidden"],
    [valid, { origin: "https://other.invalid" }, 403, "forbidden"],
    [valid, { "content-length": "20001" }, 413, "too_large"],
    ["ع".repeat(10001), {}, 413, "too_large"],
    ["{", {}, 400, "invalid"],
    [[], {}, 400, "invalid"],
    ["null", {}, 400, "invalid"],
  ]) {
    const result = await post(body, headers);
    assert.equal(result.status, status);
    assert.deepEqual(await result.json(), { ok: false, code });
  }
});
test("honeypot is silent, without forwarding customer details", async () => {
  const spy = mock.method(globalThis, "fetch", () => {
    throw Error("unexpected");
  });
  const res = await post({ website: "filled" });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(spy.mock.callCount(), 0);
});
test("validates every form field and cart invariant", async () => {
  const malformed = {
    name: " ",
    phone: "01234",
    governorate: "unknown",
    address: "short",
    notes: 12,
    lang: "fr",
    items: [],
  };
  assert.deepEqual((await (await post(malformed)).json()).fields, [
    "name",
    "phone",
    "governorate",
    "address",
    "notes",
    "lang",
    "items",
  ]);
  for (const items of [
    null,
    [],
    [null],
    [{ id: "missing", qty: 1 }],
    [{ id: "olivique-1l", qty: "1" }],
    [{ id: "olivique-1l", qty: 0 }],
    [{ id: "olivique-1l", qty: 1.5 }],
    [{ id: "olivique-1l", qty: 21 }],
    [valid.items[0], valid.items[0]],
    Array(11).fill(valid.items[0]),
  ]) {
    const r = await post({ ...valid, items });
    assert.equal(r.status, 400);
    assert.deepEqual((await r.json()).fields, ["items"]);
  }
  for (const [key, max] of [
    ["name", 120],
    ["address", 300],
    ["notes", 500],
  ]) {
    assert.deepEqual(
      (await (await post({ ...valid, [key]: "a".repeat(max + 1) })).json())
        .fields,
      [key],
    );
  }
});
test("unconfigured or invalid destination is refused", async () => {
  delete process.env.GOOGLE_SCRIPT_TOKEN;
  for (const url of [
    "",
    "https://example.com/exec",
    "https://script.google.com/macros/s/test/dev",
  ]) {
    process.env.GOOGLE_SCRIPT_URL = url;
    const r = await post();
    assert.equal(r.status, 503);
    assert.equal((await r.json()).code, "not_configured");
  }
});
test("server calculates amounts and returns a reference only on acknowledgement", async () => {
  configure();
  let sent;
  mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, process.env.GOOGLE_SCRIPT_URL);
    assert.equal(options.headers["Content-Type"], "text/plain;charset=utf-8");
    assert.ok(options.signal instanceof AbortSignal);
    sent = JSON.parse(options.body);
    return Response.json({ ok: true });
  });
  const r = await post({
    ...valid,
    items: valid.items.map((i) => ({ ...i, price: 0 })),
    subtotal: 0,
    total: 0,
    deliveryFee: 0,
  });
  assert.equal(r.status, 201);
  const result = await r.json();
  assert.match(result.ref, /^OLV-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  assert.deepEqual(sent, {
    token: "local-test-only",
    ref: result.ref,
    lang: "en",
    name: "TEST Buyer",
    phone: "01012345678",
    governorate: "cairo",
    address: "TEST street, building 10",
    notes: "",
    items: "1L × 2; 5L × 1",
    subtotal: 3000,
    deliveryFee: null,
  });
});
test("rejection, timeout, non-JSON and upstream error never acknowledge the order", async () => {
  configure();
  for (const fn of [
    () => Response.json({ ok: false }),
    () => Response.json({ ok: true }, { status: 502 }),
    () => new Response("Unexpected"),
    () => {
      throw new DOMException("timed out", "TimeoutError");
    },
  ]) {
    const spy = mock.method(globalThis, "fetch", async () => fn());
    const r = await post();
    assert.equal(r.status, 503);
    assert.deepEqual(await r.json(), { ok: false, code: "save_failed" });
    spy.mock.restore();
  }
});
test("catalog, stored-cart constraints and Egyptian mobile normalization", () => {
  assert.deepEqual(
    cleanCart([
      { id: "olivique-1l", qty: 0, price: 5 },
      { id: "olivique-2l", qty: 100 },
      { id: "invalid", qty: 1 },
    ]),
    [
      { id: "olivique-1l", qty: 1 },
      { id: "olivique-2l", qty: 20 },
    ],
  );
  assert.deepEqual(cleanCart(null), []);
  assert.deepEqual(products.map(savings), [0, 200, 500]);
  assert.equal(normalizePhone("٠٠٢٠ ١٥-١٢٣٤٥٦٧٨"), "01512345678");
  assert.equal(formatPrice(500, "ar"), "500 ج.م");
});
test("WhatsApp order summaries in both languages and missing channel", () => {
  assert.equal(whatsappLink(valid.items, "en", valid, ""), null);
  for (const [lang, name, area, subtotal] of [
    ["en", "Full name", "Cairo", "Subtotal: 3,000 EGP"],
    ["ar", "الاسم بالكامل", "القاهرة", "قيمة المنتجات: 3,000 ج.م"],
  ]) {
    const url = new URL(
      whatsappLink(valid.items, lang, valid, "+20 100-000-0000"),
    );
    assert.equal(url.origin, "https://wa.me");
    assert.equal(url.pathname, "/201000000000");
    const text = url.searchParams.get("text");
    for (const part of [
      name,
      "TEST Buyer",
      area,
      "× 2",
      "× 1",
      "1,000",
      "2,000",
      subtotal,
    ])
      assert.ok(text.includes(part), part);
    assert.ok(!text.includes(valid.phone));
    assert.ok(!text.includes(valid.address.trim()));
  }
});
test("origin, hreflang, sitemap and preview rules", () => {
  for (const value of [
    "",
    "http://example.test",
    "https://user:password@example.test",
    "https://example.test/path",
  ]) {
    process.env.SITE_URL = value;
    assert.equal(productionOrigin(), undefined);
    assert.deepEqual(sitemap(), []);
    assert.equal(robots().sitemap, undefined);
  }
  process.env.SITE_URL = "https://olivique.example";
  delete process.env.VERCEL_ENV;
  const seo = pageMetadata("/shop", "Shop", "Browse");
  assert.deepEqual(seo.alternates.languages, {
    en: "https://olivique.example/shop?lang=en",
    ar: "https://olivique.example/shop?lang=ar",
  });
  assert.equal(sitemap().length, 4);
  assert.ok(!sitemap().some((row) => row.url.includes("checkout")));
  assert.equal(robots().sitemap, "https://olivique.example/sitemap.xml");
  process.env.VERCEL_ENV = "preview";
  assert.deepEqual(sitemap(), []);
  assert.equal(robots().sitemap, undefined);
});
