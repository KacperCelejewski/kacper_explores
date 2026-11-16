/** Browser acceptance checks; Playwright is installed outside the application. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const baseURL = process.env.HOME_URL ?? "http://localhost:3100";
const output = process.env.HOME_QA_OUTPUT ?? "/tmp/home-r1d-pomiary";
await mkdir(output, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const viewports = [[1512, 686], [1280, 650], [1024, 640], [1440, 800], [768, 1024], [375, 667], [320, 568]];
const results = [], failures = [];
const check = (name, fn) => { try { fn(); } catch (error) { failures.push({ name, error: error.message }); } };
try {
  for (const [width, height] of viewports) {
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({ viewport: { width, height }, javaScriptEnabled, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(baseURL, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
        const hero = document.querySelector(".home-hero");
        const frame = document.querySelector(".home-chat-frame");
        const fr = frame.getBoundingClientRect();
        const targets = [hero.querySelector("h1"), ...hero.querySelectorAll('a[href^="/quiz"]'), hero.querySelector(".home-micro")].map(box);
        const textNodes = [...frame.querySelectorAll("p")];
        return { frame: box(frame), targets, button: box(document.querySelector(".home-chat-caption button")),
          overflowX: document.documentElement.scrollWidth > innerWidth,
          minFont: Math.min(...textNodes.map((el) => parseFloat(getComputedStyle(el).fontSize))),
          textOutsideFrame: textNodes.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > fr.bottom + 1 || r.right > fr.right + 1; }).map((el) => el.textContent),
          hiddenFinalContent: textNodes.filter((el) => Number(getComputedStyle(el).opacity) === 0).map((el) => el.textContent),
          columns: getComputedStyle(document.querySelector(".home-hero-grid")).gridTemplateColumns,
          quizLinks: document.querySelectorAll('a[href^="/quiz"]').length,
          cookieTop: document.querySelector('[aria-label="Zgoda na pliki cookie"]')?.getBoundingClientRect().top ?? innerHeight,
        };
      });
      const name = `${width}x${height}-${javaScriptEnabled ? "js" : "no-js"}`;
      results.push({ name, ...metrics, errors });
      check(name, () => {
        assert.deepEqual(errors, []);
        assert.equal(metrics.overflowX, false);
        assert.equal(metrics.minFont >= 14, true);
        assert.deepEqual(metrics.textOutsideFrame, []);
        assert.deepEqual(metrics.hiddenFinalContent, []);
        assert.ok(Math.abs(metrics.frame.width / metrics.frame.height - 1.6) < .01);
        assert.ok(metrics.button.height >= 44 && metrics.button.width >= 44);
        assert.ok(metrics.targets.every((t) => t.y >= 0 && t.bottom <= height));
        assert.ok(metrics.targets.slice(1, 3).every((t) => t.height >= 44));
        assert.ok(metrics.targets.every((t) => t.bottom <= metrics.cookieTop), "Cookie banner covers hero copy/CTA");
        // The source brief §3.3 places the phone animation below the CTA/fold.
        if (width >= 768) assert.ok(metrics.frame.bottom <= height);
        assert.ok(metrics.quizLinks <= 6); // seventh link reserved for open Menu
      });
      await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 650 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "networkidle" });
  const necessary = page.getByRole("button", { name: "Tylko niezbędne", exact: true });
  if (await necessary.isVisible()) await necessary.click();
  await page.getByRole("button", { name: "Wstrzymaj", exact: true }).focus();
  await page.keyboard.press("Space");
  assert.ok(await page.getByRole("button", { name: "Odtwórz", exact: true }).getAttribute("aria-pressed") === "true");
  const pauseState = await page.locator(".home-chat-scene").evaluate((el) => getComputedStyle(el).animationPlayState);
  assert.equal(pauseState, "paused");
  await page.getByRole("button", { name: "Odtwórz", exact: true }).click();
  await page.locator(".home-finale").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".home-chat-animation").dataset.paused === "true");
  await page.locator(".home-chat-frame").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".home-chat-animation").dataset.paused === "false");
  await page.getByRole("button", { name: "Wstrzymaj", exact: true }).click();
  // Seek CSS animations in QA only. Production JS never controls their time.
  for (const seconds of [0, 1.8, 4.8, 7.8, 13.5, 15.9, 29.5, 45.5, 48.1]) {
    await page.evaluate((seconds) => {
      for (const animation of document.querySelector(".home-chat-frame").getAnimations({ subtree: true })) {
        animation.currentTime = seconds * 1000;
      }
    }, seconds);
    await page.screenshot({ path: `${output}/timeline-${seconds}.png` });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".home-chat-frame").evaluate((el) => el.getAnimations({ subtree: true }).length), 0);
  await context.close();
} catch (error) {
  failures.push({ name: "browser flow", error: error.message });
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ measuredAt: new Date().toISOString(), baseURL, results, failures }, null, 2));
}
console.log(`Results: ${output}; failures: ${failures.length}`);
if (failures.length) { console.error(failures); process.exitCode = 1; }
