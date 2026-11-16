/** R1e acceptance, no application dependencies. Puppeteer comes from business/tools. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const modulePath = process.env.PUPPETEER_MODULE ?? resolve("../wloczykij-business/marketing/tools/node_modules/puppeteer/lib/puppeteer/puppeteer.js");
const baseURL = process.env.HOME_URL ?? "http://localhost:3100";
const output = process.env.HOME_QA_OUTPUT ?? "/tmp/home-r1e-pomiary";
const viewports = [[1440, 800], [1280, 650], [1024, 640], [768, 1024], [375, 667], [320, 568]];
const results = [], failures = [];
const check = (name, fn) => { try { fn(); } catch (error) { failures.push({ name, error: error.message }); } };
await mkdir(output, { recursive: true });
let browser;
try {
  const { default: puppeteer } = await import(pathToFileURL(modulePath).href);
  browser = await puppeteer.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  for (const [width, height] of viewports) {
    // Normal no-JS also checks the noscript stylesheet, without a reduced-motion shortcut.
    for (const mode of ["reduced-js", "reduced-no-js", "motion-no-js"]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width, height });
      await page.setJavaScriptEnabled(!mode.endsWith("no-js"));
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: mode.startsWith("reduced") ? "reduce" : "no-preference" }]);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(baseURL, { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
        const frame = document.querySelector(".home-chat-frame");
        const drawing = [...frame.querySelectorAll("p, time, .home-chat-name, .home-chat-online, .home-chat-product-brand span")];
        const fr = box(frame);
        const final = [...frame.querySelectorAll(".home-chat-message, .home-chat-answer, .home-chat-author")];
        const hero = document.querySelector(".home-hero");
        const opacity = (el) => { let value = 1; while (el && el !== frame) { value *= Number(getComputedStyle(el).opacity); el = el.parentElement; } return value; };
        return {
          frame: fr, animation: box(document.querySelector(".home-chat-animation")),
          phone: box(document.querySelector(".home-chat-phone")), product: box(document.querySelector(".home-chat-right")),
          targets: [hero.querySelector("h1"), ...hero.querySelectorAll('a[href^="/quiz"]')].map(box),
          button: box(document.querySelector(".home-chat-caption button")),
          overflowX: document.documentElement.scrollWidth > innerWidth,
          minFont: Math.min(...drawing.map((el) => parseFloat(getComputedStyle(el).fontSize))),
          textOutsideFrame: drawing.filter((el) => { const r = box(el); return r.bottom > fr.bottom + 1 || r.right > fr.right + 1 || r.x < fr.x; }).map((el) => el.textContent),
          hiddenFinalContent: final.filter((el) => opacity(el) < .9).map((el) => el.textContent),
          activeAnimations: frame.getAnimations({ subtree: true }).length,
          heroColumns: getComputedStyle(document.querySelector(".home-hero-grid")).gridTemplateColumns.split(" ").length,
          frameColumns: getComputedStyle(document.querySelector(".home-chat-scene")).gridTemplateColumns.split(" ").length,
          frameBorder: getComputedStyle(frame).borderTopWidth,
          quizLinks: document.querySelectorAll('a[href^="/quiz"]').length,
          cookieTop: document.querySelector('[aria-label="Zgoda na pliki cookie"]')?.getBoundingClientRect().top ?? innerHeight,
        };
      });
      const name = `${width}x${height}-${mode}`;
      results.push({ name, ...metrics, errors });
      check(name, () => {
        assert.deepEqual(errors, []);
        assert.equal(metrics.overflowX, false, "horizontal overflow");
        assert.ok(metrics.minFont >= 14, "text below 14px");
        assert.deepEqual(metrics.textOutsideFrame, []);
        assert.deepEqual(metrics.hiddenFinalContent, []);
        assert.equal(metrics.activeAnimations, 0);
        assert.equal(metrics.frameBorder, "1px", "missing scene CSS");
        assert.ok(metrics.button.height >= 44 && metrics.button.width >= 44);
        assert.ok(metrics.targets.every((t) => t.y >= 0 && t.bottom <= height), "H1/CTA outside first screen");
        assert.ok(metrics.targets.every((t) => t.bottom <= metrics.cookieTop), "cookie banner covers H1/CTA");
        assert.ok(metrics.quizLinks <= 6);
        if (width >= 1024) {
          assert.equal(metrics.heroColumns, 2);
          assert.equal(metrics.frameColumns, 2);
          assert.ok(metrics.animation.height <= height - 160 + 1, "animation too tall");
          assert.ok(metrics.animation.bottom <= height && metrics.frame.bottom <= height && metrics.button.bottom <= height, "animation outside first screen");
        } else {
          assert.equal(metrics.heroColumns, 1);
          assert.ok(metrics.animation.width <= 720);
          if (width < 768) {
            assert.equal(metrics.frameColumns, 1);
            assert.ok(metrics.product.y > metrics.phone.bottom, "phone and product must stack");
          }
        }
      });
      if (process.env.HOME_SCREENSHOTS === "1") await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
      await context.close();
    }
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 650 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.goto(baseURL, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.querySelectorAll("button").forEach((b) => { if (b.textContent === "Tylko niezbędne") b.click(); }));
  await page.waitForFunction(() => !document.querySelector(".home-chat-caption button").disabled);
  await page.focus(".home-chat-caption button");
  await page.keyboard.press("Space");
  assert.equal(await page.$eval(".home-chat-caption button", (el) => el.getAttribute("aria-label")), "Odtwórz");
  assert.equal(await page.$eval(".home-chat-scene", (el) => getComputedStyle(el).animationPlayState), "paused");
  const seek = async (time) => page.evaluate((time) => {
    for (const animation of document.querySelector(".home-chat-frame").getAnimations({ subtree: true })) animation.currentTime = time * 1000;
  }, time);
  for (const time of [0, .7, 1.3, 1.8, 3.7, 4.3, 4.8, 6.7, 7.3, 7.8, 8.9, 9.6, 13.5, 16.05, 29.5, 45.5, 48.3]) {
    await seek(time);
    const state = await page.evaluate(() => {
      const opacity = (el) => Number(getComputedStyle(el).opacity);
      return {
        questions: [...document.querySelectorAll(".home-chat-message")].map(opacity),
        answers: [...document.querySelectorAll(".home-chat-answer")].slice(0, 3).map(opacity),
        typing: [...document.querySelectorAll(".home-chat-typing")].map(opacity),
      };
    });
    results.push({ timeline: time, ...state });
    check(`timeline ${time}`, () => {
      const phase = time >= 48 ? 13.5 : time % 16;
      for (const [index, questionAt] of [1, 4, 7, 9.2].entries()) {
        if (phase < questionAt - .61) assert.ok(state.typing[index] < .01 && state.questions[index] < .01);
        if (phase >= questionAt - .59 && phase < questionAt - .01) assert.ok(state.typing[index] > .99 && state.questions[index] < .01);
        if (phase >= questionAt + .25) assert.ok(state.questions[index] > .99 && state.typing[index] < .01);
        if (index < 3 && phase >= questionAt + .7) assert.ok(state.answers[index] > .99);
      }
    });
  }
  await page.waitForFunction(() => document.querySelector(".home-chat-caption button").disabled);
  // A fresh cycle verifies controls after the QA-only seek to the final frame.
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.querySelector(".home-chat-caption button").disabled);
  await page.$eval(".home-finale", (el) => el.scrollIntoView());
  await page.waitForFunction(() => document.querySelector(".home-chat-animation").dataset.paused === "true");
  await page.$eval(".home-chat-frame", (el) => el.scrollIntoView());
  await page.waitForFunction(() => document.querySelector(".home-chat-animation").dataset.paused === "false");
  await page.click(".home-chat-caption button");
  await page.$eval(".home-finale", (el) => el.scrollIntoView());
  await page.$eval(".home-chat-frame", (el) => el.scrollIntoView());
  assert.equal(await page.$eval(".home-chat-animation", (el) => el.dataset.paused), "true", "manual pause persists");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  assert.equal(await page.$eval(".home-chat-frame", (el) => el.getAnimations({ subtree: true }).length), 0);
  await page.close();
} catch (error) {
  failures.push({ name: browser ? "browser flow" : "browser launch", error: error.message });
} finally {
  if (browser) await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ measuredAt: new Date().toISOString(), baseURL, results, failures }, null, 2));
}
console.log(`Results: ${output}/results.json; cases: ${results.length}; failures: ${failures.length}`);
if (failures.length) { console.error(failures); process.exitCode = 1; }
