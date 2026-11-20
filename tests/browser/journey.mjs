import assert from "node:assert/strict";
export async function checkJourney(chromium, real, fixture) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    args: ["--disable-background-networking"],
  });
  const failures = [];
  const word = {
    en: {
      size: "2L",
      order: "Order now",
      checkout: "Checkout",
      error: "Online ordering",
      received: "Order received",
      ref: "Order reference",
    },
    ar: {
      size: "2 لتر",
      order: "اطلب الآن",
      checkout: "إتمام الطلب",
      error: "الطلب من الموقع",
      received: "تم استلام طلبك",
      ref: "رقم الطلب",
    },
  };
  async function checkLayout(p, label) {
    const measures = await p.evaluate(() => ({
      width: document.documentElement.clientWidth,
      doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      broken: [...document.images]
        .filter((i) => i.complete && !i.naturalWidth)
        .map((i) => i.src),
    }));
    assert.ok(
      measures.doc <= measures.width + 1 && measures.body <= measures.width + 1,
      label + " overflow " + JSON.stringify(measures),
    );
    assert.deepEqual(measures.broken, [], label + " missing images");
  }
  async function ready(p, lang) {
    await p.waitForFunction(
      (l) =>
        document.documentElement.lang === l &&
        document
          .querySelector(".nav-actions .lang-button")
          ?.getAttribute("aria-pressed") === (l === "ar" ? "true" : "false"),
      lang,
    );
  }
  async function submit(p) {
    const [r] = await Promise.all([
      p.waitForResponse(
        (r) =>
          r.url().endsWith("/api/order") && r.request().method() === "POST",
      ),
      p.locator("form button").click(),
    ]);
    return r;
  }
  async function journey(width, lang) {
    const ctx = await browser.newContext({
      viewport: { width, height: width > 767 ? 900 : 844 },
      reducedMotion: width === 430 ? "reduce" : "no-preference",
      isMobile: width < 600,
      hasTouch: width < 600,
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(7500);
    p.on("pageerror", (e) => failures.push(e.message));
    p.on("response", (r) => {
      if (
        r.url().startsWith(fixture) &&
        r.status() >= 400 &&
        !r.url().endsWith("/api/order") &&
        !r.url().includes("missing-olivique")
      )
        failures.push(r.status() + " " + r.url());
    });
    try {
      await p.goto(fixture + "/?lang=" + lang);
      await ready(p, lang);
      const w = word[lang],
        other = lang === "en" ? "ar" : "en";
      await checkLayout(p, "home");
      await p.locator(".size-picker button").nth(1).click();
      const layoutWidth = await p.locator(".hero").evaluate(el => el.getBoundingClientRect().width);
      await p.getByRole("button", { name: w.order, exact: true }).click();
      const d = p.locator("dialog[open]");
      await d.waitFor();
      assert.equal(await p.locator(".hero").evaluate(el => el.getBoundingClientRect().width), layoutWidth);
      assert.equal(await p.evaluate(() => document.body.style.overflow), "hidden");
      if (width === 430) assert.equal(await d.evaluate(el => getComputedStyle(el).animationName), "none");
      assert.equal(await d.locator(".cart-lines li").count(), 1);
      await d.locator(".stepper button").last().click();
      assert.equal(await d.locator(".stepper span").innerText(), "2");
      await d.locator(".lang-button").click();
      await ready(p, other);
      assert.ok(await d.isVisible());
      await d.locator(".lang-button").click();
      await ready(p, lang);
      for (let i = 0; i < 12; i++) {
        await p.keyboard.press("Tab");
        assert.ok(
          await p.evaluate(
            () =>
              !!document.activeElement?.closest("dialog") ||
              document.activeElement === document.body,
          ),
        );
      }
      await p.keyboard.press("Escape");
      await d.waitFor({ state: "hidden" });
      assert.ok(
        await p
          .locator(".hero-actions button")
          .evaluate((el) => el === document.activeElement),
      );
      await p.reload();
      await ready(p, lang);
      await p.waitForFunction(
        () =>
          document.querySelector(".cart-trigger .badge").textContent === "2",
      );
      await p.goto(fixture + "/shop?lang=" + lang);
      await ready(p, lang);
      await checkLayout(p, "shop");
      await p.locator(".product-card").first().locator(".button").click();
      await p.locator(".cart-trigger").click();
      await d.waitFor();
      assert.equal(await d.locator(".cart-lines li").count(), 2);
      await d.locator(".cart-lines li").last().locator(".text-link").click();
      assert.equal(await d.locator(".cart-lines li").count(), 1);
      await d.getByRole("link", { name: w.checkout, exact: true }).click();
      await p.waitForURL("**/checkout?lang=" + lang);
      assert.equal(await p.locator(".sticky-bar").count(), 0);
      const reviewStepper = p.locator("main .stepper");
      await reviewStepper.locator("button").first().click();
      assert.ok((await p.locator("main .totals .total dd").innerText()).includes("845"));
      await reviewStepper.locator("button").last().click();
      await p.locator("form button").click();
      await p.waitForFunction(() => document.activeElement.id === "order-name");
      assert.equal(await p.locator('[aria-invalid="true"]').count(), 4);
      await p.locator("#order-name").fill("TEST Buyer");
      await p.locator("#order-phone").fill("٠٠٢٠ ١٠-١٢٣٤٥٦٧٨");
      await p.locator("#order-governorate").selectOption("cairo");
      await p.locator("#order-notes").fill("TEST only");
      await p.locator("#order-address").focus();
      await p.evaluate(() => window.scrollTo(0, 100));
      const before = await p.evaluate(() => scrollY);
      await p.locator(".nav-actions .lang-button").evaluate((el) => el.click());
      await ready(p, other);
      assert.equal(await p.locator("#order-name").inputValue(), "TEST Buyer");
      assert.equal(await p.locator("#order-notes").inputValue(), "TEST only");
      assert.equal(
        await p
          .locator("#order-address")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      assert.ok(
        Math.abs((await p.evaluate(() => scrollY)) - before) < 3,
        "language switch scroll",
      );
      assert.ok(p.url().endsWith("/checkout?lang=" + other));
      await p.locator(".nav-actions .lang-button").evaluate((el) => el.click());
      await ready(p, lang);
      await p.locator("#order-address").fill("TEST address, building 10");
      await checkLayout(p, "checkout");
      const wa = new URL(
        await p.locator('form a[href^="https://wa.me/"]').getAttribute("href"),
      );
      assert.equal(wa.pathname, "/201000000000");
      for (const text of [
        "TEST Buyer",
        "1,600",
        "× 2",
        lang === "en" ? "Cairo" : "القاهرة",
      ])
        assert.ok(wa.searchParams.get("text").includes(text));
      assert.ok(
        (await p.locator("main .totals .total dd").innerText()).includes(
          "1,645",
        ),
      );
      await p.locator("#order-name").fill("TEST failure");
      assert.equal((await submit(p)).status(), 503);
      await p.locator(".error-box").waitFor();
      await p.locator("#order-name").fill("TEST timeout");
      assert.equal((await submit(p)).status(), 503);
      await p.locator("#order-name").fill("TEST Buyer");
      const r = await submit(p);
      const body = await r.json();
      assert.equal(r.status(), 201, JSON.stringify(body));
      await p.getByRole("heading", { name: w.received, exact: true }).waitFor();
      assert.match(body.ref, /^OLV-[A-Z2-9]{6}$/);
      assert.ok((await p.locator(".receipt").innerText()).includes(body.ref));
      assert.equal(
        await p.evaluate(() => localStorage.getItem("olivique-cart")),
        "[]",
      );
      await checkLayout(p, "receipt");
      if (width === 430) {
        assert.equal(
          await p
            .locator(".receipt .button")
            .evaluate((el) => getComputedStyle(el).animationName),
          "none",
        );
      }
      for (const path of [
        "/our-oil",
        "/faq",
        "/contact",
        "/privacy-policy",
        "/terms-of-service",
        "/checkout",
        "/missing-olivique",
      ]) {
        const res = await p.goto(real + path + "?lang=" + lang, {
          waitUntil: "domcontentloaded",
        });
        await ready(p, lang);
        assert.equal(
          res.status(),
          path === "/missing-olivique" ? 404 : 200,
          path,
        );
        await checkLayout(p, path);
        assert.equal(await p.locator("a[href^='https://wa.me/']").count(), 0);
        assert.equal(
          await p.locator("html").getAttribute("dir"),
          lang === "ar" ? "rtl" : "ltr",
        );
        if (path === "/faq") {
          await p.locator("details summary").nth(1).click();
          assert.ok(await p.locator("details").nth(1).locator("p").isVisible());
        }
        if (path === "/checkout")
          assert.ok(await p.locator("main .empty").isVisible());
        if (path === "/missing-olivique")
          assert.equal(await p.locator("main .actions a").count(), 2);
      }
      console.log(
        "PASS",
        width,
        lang,
        "journey, rejection, timeout, receipt, pages, 404, overflow",
      );
    } finally {
      await ctx.close();
    }
  }
  async function additional() {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    try {
      const p = await ctx.newPage(),
        second = await ctx.newPage();
      p.setDefaultTimeout(7500);
      await p.goto(real + "/?lang=en");
      await second.goto(real + "/shop?lang=en");
      await p.locator(".nav-actions .lang-button").click();
      await ready(second, "ar");
      assert.ok(second.url().endsWith("/?lang=ar#collection"));
      await p.locator(".nav-actions .lang-button").click();
      await p.locator(".mobile-menu").click();
      await p.locator(".mobile-nav a[href*=faq]").click();
      await p.waitForURL("**/?lang=en#faq");
      assert.equal(await p.locator(".mobile-nav").count(), 0);
      await p.locator(".product-card").first().locator(".button").click();
      await p.locator(".sticky-bar button").click();
      await p.locator("dialog[open] .drawer-foot a").click();
      await p.locator("#order-name").fill("TEST unconfigured");
      await p.locator("#order-phone").fill("01012345678");
      await p.locator("#order-governorate").selectOption("cairo");
      await p.locator("#order-address").fill("TEST address, building 10");
      const r = await submit(p);
      assert.equal((await r.json()).code, "not_configured");
      assert.ok(
        (await p.locator(".error-box").innerText()).includes("Online ordering"),
      );
      assert.equal(await p.locator('a[href^="https://wa.me/"]').count(), 0);
      assert.equal(await p.locator("main .cart-lines li").count(), 1);
      await p.evaluate(() =>
        localStorage.setItem("olivique-cart", "broken json"),
      );
      await p.reload();
      await p.locator("main .empty").waitFor();
      await p.evaluate(() =>
        localStorage.setItem(
          "olivique-cart",
          JSON.stringify([
            { id: "olivique-1l", qty: 300, price: 0 },
            { id: "missing", qty: 2 },
          ]),
        ),
      );
      await p.reload();
      await p.waitForFunction(
        () =>
          document.querySelector(".cart-trigger .badge").textContent === "20",
      );
      assert.equal(await p.locator("main .cart-lines li").count(), 1);
      const res = await p.request.get(real + "/checkout");
      const html = await res.text();
      assert.ok(html.includes("noindex"));
      assert.equal(res.headers()["x-frame-options"], "DENY");
      for (const asset of [
        "icon.svg",
        "hero.svg",
        "1l.svg",
        "2l.svg",
        "5l.svg",
        "social.png",
      ])
        assert.equal((await p.request.get(real + "/" + asset)).status(), 200);
      assert.equal((await p.request.get(real + "/robots.txt")).status(), 200);
      await p.goto(real + "/?lang=ar");
      await ready(p, "ar");
      await p.waitForFunction(() => document.title.includes("أوليفيك"));
      assert.equal(await p.locator("head link[hreflang]").count(), 2);
      console.log(
        "PASS cross-tab sync, mobile menu, safe cart recovery, missing integration, headers, assets and Arabic title",
      );
    } finally {
      await ctx.close();
    }
  }
  try {
    await additional();
    for (const width of [360, 390, 430, 768, 1280])
      for (const lang of ["en", "ar"]) await journey(width, lang);
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }
}
