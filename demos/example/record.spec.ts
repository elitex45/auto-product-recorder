/**
 * Example journey: a tour of https://playwright.dev on desktop and phone.
 * Copy this folder to demos/<your-product>/ and rewrite the beats.
 * Every rec.beat("<id>") must match a key in narration.json.
 */
import { test, expect, devices } from "@playwright/test";
import { Recorder, hold, scrollTo, settle } from "../../lib/recorder";

// Sites pick their phone layout from the user agent, so send a phone one.
const PHONE_UA = devices["Pixel 7"].userAgent;

const SITE = process.env.BASE_URL ?? "https://playwright.dev";

test.describe("desktop", () => {
  test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  test("home page to install guide", async ({ page }) => {
    await page.goto(SITE);
    await settle(page);
    const rec = new Recorder("desktop");
    await rec.start(page);

    await rec.beat("d1", async () => {
      await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
      await hold(1500);
    });
    await rec.beat("d2", async () => {
      await scrollTo(page, 900);
      await hold(2500);
      await scrollTo(page, 1800);
      await hold(1500);
    });
    await rec.beat("d3", async () => {
      await scrollTo(page, 0);
      await hold(1200);
      const start = page.getByRole("link", { name: "Get started" });
      await start.hover();
      await hold(800);
      await start.click();
      await settle(page);
    });
    await rec.beat("d4", async () => {
      // Assert what the voice claims, so a broken site fails the run instead of making a wrong video.
      await expect(page.getByRole("heading", { name: "Installation", level: 1 })).toBeVisible();
      await hold(1500);
      await scrollTo(page, 500);
      await hold(1500);
    });
    await rec.stop();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: PHONE_UA });

  test("same site on a phone", async ({ page }) => {
    await page.goto(SITE);
    await settle(page);
    const rec = new Recorder("mobile");
    await rec.start(page);

    await rec.beat("m1", async () => {
      await hold(1500);
      await scrollTo(page, 700);
      await hold(1500);
      await scrollTo(page, 0);
      await hold(600);
    });
    await rec.beat("m2", async () => {
      const menu = page.getByRole("button", { name: /toggle navigation bar/i });
      await menu.tap();
      await expect(page.getByRole("link", { name: "Docs" }).last()).toBeVisible();
      await hold(1500);
    });
    await rec.stop();
  });
});
