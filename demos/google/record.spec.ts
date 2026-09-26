/**
 * Google search demo on desktop and phone: home page, typing, live suggestions.
 *
 * It stops before submitting a search on purpose: Google answers scripted
 * searches with a "unusual traffic" robot check. The spec fails if that page
 * ever appears, so it can never produce a video of a CAPTCHA.
 *
 * Every rec.beat("<id>") must match a key in narration.json.
 */
import { test, expect, devices, type Page } from "@playwright/test";
import { Recorder, hold, settle } from "../../lib/recorder";

// Sites pick their phone layout from the user agent, so send a phone one.
const PHONE_UA = devices["Pixel 7"].userAgent;

const QUESTION = "how do rainbows form";

test.use({ locale: "en-US" });

async function open(page: Page) {
  await page.goto("https://www.google.com/?hl=en");
  await settle(page);
  // Close the cookie consent dialog if this region shows one.
  const accept = page.getByRole("button", { name: /accept all/i });
  if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) await accept.click();
  await expect(page.getByText(/unusual traffic/i)).toHaveCount(0);
}

const searchBox = (page: Page) => page.locator("textarea[name=q], input[name=q]").first();
const suggestions = (page: Page) => page.getByRole("listbox").getByRole("option");

async function typeQuestion(page: Page) {
  await searchBox(page).click();
  await searchBox(page).pressSequentially(QUESTION, { delay: 110 });
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  test("search on a laptop", async ({ page }) => {
    await open(page);
    const rec = new Recorder("desktop");
    await rec.start(page);

    await rec.beat("d1", async () => {
      await expect(searchBox(page)).toBeVisible();
      await hold(1500);
    });
    await rec.beat("d2", async () => {
      await hold(1200);
      await searchBox(page).hover();
      await hold(500);
      await typeQuestion(page);
    });
    await rec.beat("d3", async () => {
      await expect(suggestions(page).first()).toBeVisible({ timeout: 10_000 });
      await hold(1000);
    });
    await rec.beat("d4", async () => {
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("ArrowDown");
        await hold(900);
      }
    });
    await expect(page.getByText(/unusual traffic/i)).toHaveCount(0);
    await rec.stop();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: PHONE_UA });

  test("search on a phone", async ({ page }) => {
    await open(page);
    const rec = new Recorder("mobile");
    await rec.start(page);

    await rec.beat("m1", async () => {
      await expect(searchBox(page)).toBeVisible();
      await hold(1500);
    });
    await rec.beat("m2", async () => {
      await searchBox(page).tap();
      await hold(600);
      await searchBox(page).pressSequentially(QUESTION, { delay: 90 });
      await expect(suggestions(page).first()).toBeVisible({ timeout: 10_000 });
      await hold(1200);
    });
    await expect(page.getByText(/unusual traffic/i)).toHaveCount(0);
    await rec.stop();
  });
});
