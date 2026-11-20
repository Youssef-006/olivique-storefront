import assert from "node:assert/strict";

export async function checkMotion(chromium, base) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    ignoreDefaultArgs: ["--disable-back-forward-cache"],
  });
  const failures = [];
  try {
    for (const width of [360, 390, 430, 768, 1280])
      for (const lang of ["en", "ar"]) {
        const ctx = await browser.newContext({
          viewport: { width, height: width < 768 ? 844 : 900 },
          isMobile: width < 600,
          hasTouch: width < 600,
        });
        try {
          const p = await ctx.newPage(),
            cdp = await ctx.newCDPSession(p);
          p.setDefaultTimeout(12000);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
          p.on("pageerror", (e) => failures.push(e.message));
          let requests = 0;
          p.on("request", (r) => {
            if (r.url().endsWith("/media/story.mp4")) requests++;
          });
          await p.addInitScript(() => {
            window.motionLog = {
              entries: 0,
              dots: 0,
              end: 0,
              start: 0,
              shifts: [],
              overflow: false,
            };
            const log = window.motionLog;
            new MutationObserver((records) => {
              for (const record of records) {
                for (const n of record.addedNodes) {
                  if (n.nodeType === 1 && n.matches(".entry-overlay")) {
                    log.entries++;
                    log.start = performance.now();
                  }
                  if (n.nodeType === 1 && n.matches(".cart-flight")) log.dots++;
                }
                for (const n of record.removedNodes)
                  if (n.nodeType === 1 && n.matches(".entry-overlay"))
                    log.end = performance.now();
              }
            }).observe(document, { subtree: true, childList: true });
            new PerformanceObserver((list) => {
              for (const e of list.getEntries())
                if (!e.hadRecentInput)
                  log.shifts.push({ at: e.startTime, value: e.value });
            }).observe({ type: "layout-shift", buffered: true });
            const measureOverflow = () => {
              if (
                document.documentElement &&
                document.documentElement.scrollWidth > innerWidth + 1
              )
                log.overflow = true;
            };
            document.addEventListener("animationstart", measureOverflow, true);
            document.addEventListener("animationend", measureOverflow, true);
          });
          const url = base + "/?lang=" + lang;
          const video = p.locator(".story video"),
            story = p.locator("#our-story");
          const scrollStory = () =>
            story.evaluate((el) =>
              el.scrollIntoView({ block: "center", behavior: "instant" }),
            );
          const waitScene = (scene) =>
            p.waitForFunction(
              (s) => document.querySelector("#our-story")?.dataset.scene === s,
              scene,
            );
          const overflow = async () =>
            assert.ok(
              await p.evaluate(
                () =>
                  !window.motionLog.overflow &&
                  document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              "overflow " + width + " " + lang,
            );
          await p.goto(url, { waitUntil: "domcontentloaded" });
          await p.waitForSelector(".entry-overlay");
          assert.ok(
            await p
              .locator(".entry-overlay")
              .evaluate(
                (el) =>
                  el.inert &&
                  el.getAttribute("aria-hidden") === "true" &&
                  getComputedStyle(el).pointerEvents === "none",
              ),
          );
          assert.equal(requests, 0, "no video near LCP");
          if (width === 360 || width === 390) {
            if (width === 390) {
              await p
                .locator(".nav-actions .lang-button")
                .evaluate((el) => el.click());
              await p
                .locator(".nav-actions .lang-button")
                .evaluate((el) => el.click());
            } else await p.touchscreen.tap(8, 90);
          } else if (width === 430) await p.keyboard.press("Tab");
          await p.waitForFunction(() => window.motionLog.end > 0);
          const elapsed = await p.evaluate(
            () => window.motionLog.end - window.motionLog.start,
          );
          assert.ok(elapsed <= 1600, "intro duration " + elapsed);
          assert.equal(await p.locator(".entry-overlay").count(), 0);
          await overflow();
          await p.reload({ waitUntil: "domcontentloaded" });
          await p.waitForFunction(
            () =>
              document.querySelector(".hero")?.dataset.heroReveal === "short",
          );
          assert.equal(await p.evaluate(() => window.motionLog.entries), 0);
          assert.equal(requests, 0);
          await p.locator(".product-card .button").first().click();
          await p.waitForSelector('.product-card[data-added="true"]');
          if (width < 761)
            await p.waitForFunction(() => window.motionLog.dots > 0);
          await p.waitForSelector('.product-card[data-added="true"]', {
            state: "detached",
          });
          assert.equal(await p.locator(".cart-flight").count(), 0);
          const originalHeight = await story.evaluate((el) => el.offsetHeight);
          for (const chapter of await p.locator(".chapters li").all()) {
            await chapter.evaluate((el) =>
              el.scrollIntoView({ block: "end", behavior: "instant" }),
            );
            await p.waitForFunction(
              (el) => el.dataset.seen === "true",
              await chapter.elementHandle(),
            );
          }
          await scrollStory();
          await waitScene("video");
          await p.waitForFunction(
            () => document.querySelector("#our-story video").currentTime > 0.12,
          );
          assert.ok(
            await video.evaluate(
              (v) =>
                v.muted &&
                v.loop &&
                v.playsInline &&
                !v.controls &&
                v.videoWidth === 1280,
            ),
          );
          const frameSample = await p.evaluate(async () => {
            await document.fonts.ready;
            const start = performance.now(),
              times = [];
            for (let i = 0; i < 32; i++)
              times.push(
                await new Promise((resolve) => requestAnimationFrame(resolve)),
              );
            const gaps = times
              .slice(1)
              .map((t, i) => t - times[i])
              .sort((a, b) => a - b);
            return {
              median: gaps[15],
              p95: gaps[29],
              shift: window.motionLog.shifts
                .filter((s) => s.at >= start)
                .reduce((sum, s) => sum + s.value, 0),
            };
          });
          assert.equal(
            frameSample.shift,
            0,
            "layout shift during story playback",
          );
          console.log(
            "Playback",
            width,
            lang,
            "median/p95 frame interval (ms)",
            frameSample.median.toFixed(1),
            frameSample.p95.toFixed(1),
            "CLS",
            frameSample.shift,
          );
          const control = p.locator("#our-story .story-toggle");
          assert.ok((await control.boundingBox()).height >= 44);
          await control.click();
          assert.ok(await video.evaluate((v) => v.paused));
          await p
            .locator(".nav-actions .lang-button")
            .evaluate((el) => el.click());
          assert.notEqual(
            await control.getAttribute("aria-label"),
            lang === "en" ? "Play background" : "تشغيل حركة الخلفية",
          );
          assert.ok(await video.evaluate((v) => v.paused));
          await p
            .locator(".nav-actions .lang-button")
            .evaluate((el) => el.click());
          await p.evaluate(() => scrollTo(0, 0));
          await scrollStory();
          assert.ok(await video.evaluate((v) => v.paused));
          await control.click();
          await p.waitForFunction(
            () => !document.querySelector("#our-story video").paused,
          );
          assert.equal(
            await story.evaluate((el) => el.offsetHeight),
            originalHeight,
            "fixed media geometry",
          );
          await p.evaluate(() => scrollTo(0, 0));
          await p.waitForFunction(() => document.querySelector("#our-story video").paused);
          await overflow();
          await p.goto(base + "/our-oil?lang=" + lang);
          assert.equal(await p.locator(".entry-overlay").count(), 0);
          // A bfcache restoration fires pageshow without a fresh load event.
          await p.evaluate(() => history.back());
          await p.waitForFunction(
            () =>
              location.pathname === "/" && document.querySelector("#our-story"),
          );
          await p.waitForSelector("#our-story", { state: "attached" });
          assert.equal(await p.locator(".entry-overlay").count(), 0);
          await p.close();
          for (const mode of [
            "missing-video",
            "missing-poster",
            "blocked",
            "saveData",
            "2g",
            "slow-2g",
            "reduced",
          ]) {
            await checkFallback(browser, base, width, lang, mode);
          }
          console.log(
            "PASS motion",
            width,
            lang,
            "4x CPU, intro, cart, story playback, fallback modes, geometry",
          );
        } finally {
          await ctx.close();
        }
      }
    // Without JS the original SSR content remains visible and media stays idle.
    const plain = await browser.newContext({ javaScriptEnabled: false });
    try {
      const p = await plain.newPage();
      await p.goto(base + "/");
      assert.equal(await p.locator(".entry-overlay").count(), 0);
      assert.equal(await p.locator(".chapters li").count(), 3);
      assert.equal(await p.locator("#our-story video").getAttribute("src"), null);
      assert.equal(
        await p
          .locator(".product-card")
          .first()
          .evaluate((e) => getComputedStyle(e).opacity),
        "1",
      );
    } finally {
      await plain.close();
    }
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }
}

async function checkFallback(browser, base, width, lang, mode) {
  // A fresh context isolates the simulated failure from cached video ranges,
  // decoded poster images, history restoration and network preferences.
  const ctx = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 900 },
    isMobile: width < 600,
    hasTouch: width < 600,
    reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
  });
  try {
    const page = await ctx.newPage(),
      cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    let requests = 0;
    await ctx.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(base).origin) return route.abort();
      if (url.pathname.endsWith("story.mp4")) requests++;
      if (
        (mode === "missing-video" && url.pathname.endsWith(".mp4")) ||
        (mode === "missing-poster" && url.pathname.endsWith(".webp"))
      )
        return route.fulfill({ status: 404, body: "" });
      return route.continue();
    });
    await page.addInitScript((m) => {
      if (["saveData", "2g", "slow-2g"].includes(m))
        Object.defineProperty(navigator, "connection", {
          configurable: true,
          value: Object.assign(new EventTarget(), {
            saveData: m === "saveData",
            effectiveType: m === "saveData" ? "4g" : m,
          }),
        });
      if (m === "blocked")
        HTMLMediaElement.prototype.play = () =>
          Promise.reject(
            new DOMException("Simulated low power mode", "NotAllowedError"),
          );
      window.motionElements = [];
      new MutationObserver((records) => {
        for (const r of records)
          for (const n of r.addedNodes)
            if (n.nodeType === 1 && n.matches(".entry-overlay,.cart-flight"))
              window.motionElements.push(n.className);
      }).observe(document, { subtree: true, childList: true });
    }, mode);
    await page.goto(base + "/?lang=" + lang, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      (l) =>
        document.documentElement.classList.contains("js-motion") &&
        document.documentElement.lang === l,
      lang,
    );
    await page
      .locator("#our-story")
      .evaluate((el) =>
        el.scrollIntoView({ block: "center", behavior: "instant" }),
      );
    const expected = mode === "missing-poster" ? "gradient" : "poster";
    try {
      await page.waitForFunction(
        (s) => document.querySelector("#our-story").dataset.scene === s,
        expected,
        { timeout: 15000 },
      );
    } catch (error) {
      const detail = await page.evaluate(() => ({
        state: document.querySelector("#our-story").dataset.scene,
        scroll: scrollY,
        top: document.querySelector("#our-story").getBoundingClientRect().top,
        video: document.querySelector("#our-story video").currentSrc,
        poster: document.querySelector("#our-story video").poster,
      }));
      throw new Error([width, lang, mode, JSON.stringify(detail)].join(" "), {
        cause: error,
      });
    }
    assert.ok(await page.locator("#our-story video").evaluate((v) => v.paused), mode);
    if (
      ["saveData", "2g", "slow-2g", "reduced", "missing-poster"].includes(mode)
    )
      assert.equal(requests, 0, mode + " loaded video");
    if (mode === "missing-poster") {
      await page.locator("#our-story .story-toggle").click();
      assert.equal(
        await page.locator("#our-story").getAttribute("data-paused"),
        "true",
      );
    }
    if (mode === "reduced") {
      await page.locator(".product-card .button").first().click();
      await page.waitForFunction(
        () =>
          document.querySelector(".cart-trigger .badge").textContent === "1",
      );
      assert.deepEqual(await page.evaluate(() => window.motionElements), []);
      assert.equal(
        await page.locator(".hero").getAttribute("data-hero-reveal"),
        null,
      );
    }
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  } finally {
    await ctx.close();
  }
}
