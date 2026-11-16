/** Local acceptance check; install Playwright outside the repo (see docs/home-r1b-pomiary.md). */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const baseURL = process.env.HOME_URL ?? "http://localhost:3100";
const output = resolve(process.env.HOME_QA_OUTPUT ?? "/tmp/home-r1b-pomiary");
await mkdir(output, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH } : {});
const results = [];
const failures = [];
const viewports = [
  [320, 667], [375, 667], [767, 800], [768, 800], [1023, 800],
  [1024, 800], [1279, 800], [1280, 650], [1440, 900], [1920, 1080],
];
try {
  for (const [width, height] of viewports) {
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({ viewport: { width, height }, javaScriptEnabled,
        reducedMotion: "reduce", serviceWorkers: "block" });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.addInitScript(() => {
        window.__homeCLS = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__homeCLS += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(baseURL, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const box = (element) => {
          const r = element.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
        };
        const hero = document.querySelector(".home-hero");
        const banner = document.querySelector('[aria-label="Zgoda na pliki cookie"]');
        const bannerTop = banner ? banner.getBoundingClientRect().top : innerHeight;
        const targets = [hero.querySelector("h1"), ...hero.querySelectorAll('a[href^="/quiz"]'),
          hero.querySelector(".home-micro")].map((element) => ({
          text: element.textContent.trim(), ...box(element),
          aboveFold: element.getBoundingClientRect().bottom <= innerHeight,
          aboveCookieBanner: element.getBoundingClientRect().bottom <= bannerTop,
        }));
        const quizLinks = [...document.querySelectorAll('a[href^="/quiz"]')]
          .map((element) => element.getAttribute("href"));
        return { targets, quizLinks, bannerTop, cls: window.__homeCLS ?? null,
          container: box(document.querySelector(".home-hero-grid")),
          nav: box(document.querySelector('[aria-label="Nawigacja główna"]')),
          heroColumns: getComputedStyle(document.querySelector(".home-hero-grid")).gridTemplateColumns,
          overflow: [...document.querySelectorAll('[data-page="home"] *')].filter((element) => {
            const r = element.getBoundingClientRect();
            return element instanceof HTMLElement && r.width && (r.right > innerWidth + 1 || r.left < -1);
          }).map((element) => element.tagName + "." + element.className).slice(0, 20),
        };
      });
      const result = { width, height, javaScriptEnabled, ...metrics, pageErrors };
      results.push(result);
      await page.screenshot({ path: `${output}/${width}x${height}-${javaScriptEnabled ? "js" : "no-js"}.png`, fullPage: true });
      const check = (fn) => { try { fn(); } catch (error) { failures.push({ width, height, javaScriptEnabled, error: error.message }); } };
      check(() => assert.ok(metrics.quizLinks.length <= 7, "More than 7 quiz links"));
      check(() => assert.equal(metrics.overflow.length, 0, "Horizontal overflow"));
      check(() => assert.deepEqual(pageErrors, [], "Browser runtime errors"));
      if ([375, 1280].includes(width)) {
        check(() => assert.ok(metrics.targets.every((t) => t.aboveFold && t.aboveCookieBanner), "Hero target hidden by fold or cookie banner"));
        check(() => assert.ok(metrics.targets.slice(1, 3).every((t) => t.height >= 44), "Hero CTA below 44px"));
      }
      if (width >= 1280) check(() => assert.equal(metrics.container.width, 1120));
      if (javaScriptEnabled) check(() => assert.ok(metrics.cls < 0.05, "CLS >= 0.05"));
      if (javaScriptEnabled) {
        const reject = page.getByRole("button", { name: "Tylko niezbędne", exact: true });
        if (await reject.isVisible()) await reject.click();
        await page.getByRole("button", { name: "Otwórz menu", exact: true }).click();
        const openMenuLinks = await page.locator('a[href^="/quiz"]').count();
        result.openMenuQuizLinkCount = openMenuLinks;
        check(() => assert.ok(openMenuLinks <= 7, "More than 7 quiz links with the global menu open"));
      }
      await context.close();
    }
    const pair = results.slice(-2);
    for (const field of ["container", "nav", "heroColumns"]) {
      try { assert.deepEqual(pair[0][field], pair[1][field]); }
      catch { failures.push({ width, height, error: `${field} differs with JavaScript enabled/disabled` }); }
    }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ measuredAt: new Date().toISOString(), baseURL, results, failures }, null, 2));
}
console.log(`Results and screenshots: ${output}; failures: ${failures.length}`);
if (failures.length) { console.error(failures); process.exitCode = 1; }
