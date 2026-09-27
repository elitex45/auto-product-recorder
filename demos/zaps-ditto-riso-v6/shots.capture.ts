/**
 * Stills for the v3 film: page views and single UI pieces at 2x (3x on the phone), on the local
 * test setup only: FE :3001 -> BE :3005 -> scratch db zaps_ditto_it2, test users.
 * Writes shots/<name>.png and shots/shots.json ({ name: { w, h, box? } } in CSS px).
 * Every piece the voice talks about gets an expect() first, so a broken page fails the run.
 */
import { test, expect, devices, type Page, type Locator } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SITE = "http://localhost:3001";
const API = "http://localhost:3005/zaps/v1";
const PAGE = `${SITE}/campaigns/ditto`;
const PHASE = "/Users/elite/.claude/jobs/3baf7089/tmp/phase.sh";
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "shots");
const index: Record<string, { w: number; h: number; box?: { x: number; y: number; width: number; height: number } }> = {};

type U = { token: string; userId: string; handle: string };
async function testLogin(handle: string): Promise<U> {
  const r = await fetch(`${API}/auth/test/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-e2e-secret": process.env.E2E_SECRET ?? "" },
    body: JSON.stringify({ handle }),
  });
  if (!r.ok) throw new Error(`test login ${r.status}`);
  return { ...(await r.json()), handle };
}
async function freshTrader(): Promise<U> {
  const u = await testLogin(`seeded_test_ditto_${Date.now().toString(36)}`);
  const wallet = "0x" + u.userId.replace(/-/g, "").padEnd(40, "0").slice(0, 40);
  execSync("docker exec -i zeru-all-in-one-postgres-1 psql -q -v ON_ERROR_STOP=1 -U zeru -d zaps_ditto_it2", {
    input: `INSERT INTO wallet_links (user_id, address, siwe_verified_at, is_primary) VALUES ('${u.userId}', '${wallet}', now(), true);`,
  });
  return u;
}
// The local backend's Ditto client is a stand-in that hands out https://ditto.example/invite/<code>.
// Ditto's real invite format is not known yet, so the film shows the real domain with the personal
// part masked: https://www.dittonetwork.io/•••••.
const REAL_LINK = "https://www.dittonetwork.io/•••••";
async function realLinks(page: Page) {
  await page.route(`${API}/**`, async (route) => {
    const r = await route.fetch();
    const body = (await r.text()).replace(/https:\/\/ditto\.example\/invite\/[\w-]+/g, REAL_LINK);
    await route.fulfill({ response: r, body });
  });
}
async function open(page: Page, u: U) {
  await realLinks(page);
  const state = { state: { jwt: u.token, user: { id: u.userId, xHandle: u.handle, displayName: u.handle, avatarUrl: null, identityType: "x", address: null }, wallets: [], zapsBalance: 0, me: null }, version: 0 };
  await page.addInitScript((s) => localStorage.setItem("zaps:session", s), JSON.stringify(state));
  await page.goto(PAGE);
  await page.waitForLoadState("networkidle").catch(() => {});
}
const phase = (p: "registration" | "live") => execSync(`${PHASE} ${p}`);

/** Screenshot of one element, plus where it sits on the page (CSS px, page coordinates). */
async function piece(name: string, el: Locator, pad = 0) {
  await el.scrollIntoViewIfNeeded();
  await el.page().waitForTimeout(300);
  const b = (await el.boundingBox())!;
  const sy = await el.page().evaluate(() => scrollY);
  const clip = { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
  await el.page().screenshot({ path: path.join(OUT, `${name}.png`), clip });
  index[name] = { w: clip.width, h: clip.height, box: { ...clip, y: clip.y + sy } };
}
/** The visible viewport at page scroll `y`. */
async function view(page: Page, name: string, y: number) {
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: "instant" }), y);
  await page.waitForTimeout(500);
  const vp = page.viewportSize()!;
  const sy = await page.evaluate(() => scrollY);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  index[name] = { w: vp.width, h: vp.height, box: { x: 0, y: sy, width: vp.width, height: vp.height } };
}

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test.afterAll(() => {
  const file = path.join(OUT, "shots.json");
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...index }, null, 1));
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test("register and link", async ({ page }) => {
    phase("registration");
    await open(page, await freshTrader());
    const reg = page.getByRole("button", { name: "Register for campaign" });
    await expect(reg).toBeVisible({ timeout: 30_000 });
    await view(page, "reg-view", 0);
    await piece("reg-btn", reg, 6);
    await reg.click();
    const done = page.getByText("You're registered");
    await expect(done).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(600);
    await piece("reg-done", done.locator("xpath=ancestor-or-self::*[self::button or self::div][1]"), 6);
    const card = page.getByTestId("ditto-link-card");
    await expect(card).toBeVisible({ timeout: 20_000 });
    await piece("link-card-before", card, 2);
    await page.getByRole("button", { name: "Get your invite link from Ditto" }).click();
    const link = page.getByRole("textbox", { name: "Your Ditto link" });
    await expect(link).toHaveValue(REAL_LINK, { timeout: 15_000 });
    await expect(page.getByTestId("ditto-wallets").getByText("✓ Counting").first()).toBeVisible();
    await page.waitForTimeout(500);
    await piece("link-card", card, 2);
    await piece("link-box", link, 4);
  });

  test("live page pieces", async ({ page }) => {
    phase("live");
    await open(page, await testLogin("seeded_test_ditto"));
    await expect(page.getByTestId("ditto-stand")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    await view(page, "live-view", 0);
    await view(page, "live-board-view", 1400);
    await expect(page.getByText("$50,000").first()).toBeVisible();
    await piece("prize", page.getByText("Total prize pool").locator("xpath=ancestor::div[.//*[contains(text(),'$50,000')]][1]"), 10);
    await expect(page.getByTestId("ditto-stand").getByText("Rank", { exact: false }).first()).toBeVisible();
    await piece("stand", page.getByTestId("ditto-stand"), 2);
    await expect(page.getByText(/of \$50M traded\./)).toBeVisible();
    await piece("pool", page.getByTestId("ditto-pool"), 2);
    await piece("board", page.getByTestId("ditto-board-traders"), 2);
    const you = page.getByTestId("ditto-board-traders").getByText("You", { exact: true });
    await expect(you).toBeVisible();
    await piece("board-you", you.locator("xpath=ancestor::tr[1]"), 0);
    await expect(page.getByTestId("ditto-ladder").getByText("#151 to #600")).toBeVisible();
    await piece("ladder", page.getByTestId("ditto-ladder"), 2);
    // ladder chips: the rounded boxes in the ladder grid
    const chips = page.getByTestId("ditto-ladder").locator(".grid > span");
    const k = await chips.count();
    for (let i = 0; i < k; i++) await piece(`chip-${i}`, chips.nth(i), 2);
    expect(k).toBeGreaterThanOrEqual(8);
    const trades = page.getByTestId("ditto-trades");
    await expect(trades.getByText("Counted", { exact: true }).first()).toBeVisible();
    await piece("trades", trades, 2);
    const rows = trades.locator("tbody tr");
    const rc = await rows.count();
    for (let i = 0; i < rc; i++) await piece(`trade-${i}`, rows.nth(i), 0);
  });
});

// Ditto's own trade screen (public, read-only: no wallet is connected and nothing is clicked).
test.describe("ditto app", () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  test("trade screen", async ({ page }) => {
    await page.goto("https://app.dittonetwork.io/trade");
    const ticket = page.getByText("Order ticket").locator("xpath=ancestor::*[.//*[text()='Buy / Long']][1]");
    await expect(ticket).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Hyperliquid perpetual", { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(4000); // chart and prices settle
    await view(page, "ditto-trade-view", 0);
    await piece("ditto-ticket", ticket, 0);
    await piece("ditto-buy", page.getByRole("button", { name: "Buy / Long" }), 4);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: devices["Pixel 7"].userAgent });

  test("phone views", async ({ page }) => {
    phase("live");
    await open(page, await testLogin("seeded_test_ditto"));
    await expect(page.getByTestId("ditto-stand")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    await view(page, "phone-0", 0);
    for (const [i, id] of (["ditto-stand", "ditto-pool", "ditto-board-traders", "ditto-trades"] as const).entries()) {
      const y = await page.getByTestId(id).evaluate((el) => el.getBoundingClientRect().top + scrollY - 70);
      await view(page, `phone-${i + 1}`, y);
    }
  });
});
