/**
 * Re-takes only shots/pool.png with the pool 90% unlocked ($45M of $50M traded), for the film's
 * "the pool unlocks as volume grows" beat. The real page renders it; only the board reply is
 * changed in the browser (no database writes). Local test setup only: FE :3001 -> BE :3005.
 */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SITE = "http://localhost:3001";
const API = "http://localhost:3005/zaps/v1";
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "shots");
const VOLUME = 45_000_000;

function patch(o: any): boolean {
  if (!o || typeof o !== "object") return false;
  if ("unlockedPct" in o && "totalVolumeUsd" in o) {
    o.totalVolumeUsd = VOLUME;
    o.unlockedUsd = (o.poolUsd || 50_000) * (VOLUME / 50_000_000);
    o.unlockedPct = 90;
    return true;
  }
  return Object.values(o).some(patch);
}

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

test("pool at 90%", async ({ page }) => {
  let patched = false;
  await page.route(`${API}/**`, async (route) => {
    const r = await route.fetch();
    if (!route.request().url().includes("/ditto/board")) return route.fulfill({ response: r });
    const body = await r.json();
    patched = patch(body) || patched;
    await route.fulfill({ response: r, json: body });
  });
  const r = await fetch(`${API}/auth/test/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-e2e-secret": process.env.E2E_SECRET ?? "" },
    body: JSON.stringify({ handle: "seeded_test_ditto" }),
  });
  expect(r.ok).toBe(true);
  const u = { ...(await r.json()), handle: "seeded_test_ditto" };
  const state = { state: { jwt: u.token, user: { id: u.userId, xHandle: u.handle, displayName: u.handle, avatarUrl: null, identityType: "x", address: null }, wallets: [], zapsBalance: 0, me: null }, version: 0 };
  await page.addInitScript((s) => localStorage.setItem("zaps:session", s), JSON.stringify(state));
  await page.goto(`${SITE}/campaigns/ditto`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await expect(page.getByTestId("ditto-stand")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1200);
  const pool = page.getByTestId("ditto-pool");
  await expect(pool).toBeVisible({ timeout: 30_000 });
  await expect(pool.getByText("90%")).toBeVisible();
  await expect(pool.getByText("$45,000", { exact: false })).toBeVisible();
  await expect(pool.getByText(/\$45M of \$50M traded/)).toBeVisible();
  expect(patched).toBe(true);
  await pool.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500); // intro splash and fade-ins settle
  const b = (await pool.boundingBox())!;
  const clip = { x: b.x - 2, y: b.y - 2, width: b.width + 4, height: b.height + 4 };
  await page.screenshot({ path: path.join(OUT, "pool.png"), clip });
  const file = path.join(OUT, "shots.json");
  const idx = JSON.parse(fs.readFileSync(file, "utf8"));
  idx.pool = { ...idx.pool, w: clip.width, h: clip.height };
  fs.writeFileSync(file, JSON.stringify(idx, null, 1));
});
