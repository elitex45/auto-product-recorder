/**
 * Recorder: captures every browser frame through the Chrome DevTools screencast
 * and times each step of the journey to its narration clip.
 *
 *   const rec = new Recorder("desktop");
 *   await rec.start(page);
 *   await rec.beat("d1", async () => { ...clicks... });   // holds until clip d1 has been spoken
 *   await rec.stop();
 *
 * Frames go to $DEMO_DIR/frames/<stage>/NNNNNN.jpg plus frames.json
 * ({ frames: [ms…], beats: [{id,start,audio,end}], marks: [...], viewport, total }), which
 * assemble.mjs and the studio read.
 *
 *   await rec.mark("search-box", locator);   // where an element is, and when (for zooms and the cursor)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { CDPSession, Locator, Page } from "@playwright/test";

export const DEMO_DIR = path.resolve(process.env.DEMO_DIR ?? ".");

/** Pause after a clip ends before the next beat starts. */
const TAIL_MS = 900;

export const hold = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadAudioIndex(): Record<string, number> {
  const file = path.join(DEMO_DIR, "audio", "index.json");
  if (!fs.existsSync(file)) throw new Error(`${file} not found. Run the voice step first (npm run voice -- ${DEMO_DIR}).`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export class Recorder {
  private cdp!: CDPSession;
  private t0 = 0;
  private n = 0;
  private frames: number[] = [];
  private beats: { id: string; start: number; audio: number; end: number }[] = [];
  private marks: { id: string; t: number; box: { x: number; y: number; width: number; height: number } }[] = [];
  private viewport = { width: 0, height: 0, dpr: 1 };
  private audio = loadAudioIndex();
  readonly dir: string;

  constructor(readonly stage: string) {
    this.dir = path.join(DEMO_DIR, "frames", stage);
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(this.dir, { recursive: true });
  }

  async start(page: Page) {
    this.cdp = await page.context().newCDPSession(page);
    this.t0 = Date.now();
    this.cdp.on("Page.screencastFrame", (e) => {
      const t = Date.now() - this.t0;
      fs.writeFileSync(path.join(this.dir, `${String(this.n++).padStart(6, "0")}.jpg`), Buffer.from(e.data, "base64"));
      this.frames.push(t);
      // Without the ack Chrome stops sending frames.
      this.cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => undefined);
    });
    const vp = page.viewportSize() ?? { width: 1920, height: 1080 };
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    this.viewport = { ...vp, dpr };
    await this.cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 92,
      maxWidth: Math.round(vp.width * dpr),
      maxHeight: Math.round(vp.height * dpr),
      everyNthFrame: 1,
    });
  }

  /** Run `fn` while the narration for `id` plays; hold until the narration is over. */
  async beat(id: string, fn?: () => Promise<void>, minHold = 0) {
    if (!(id in this.audio)) throw new Error(`beat "${id}" has no clip in audio/index.json (is it in narration.json?)`);
    const start = Date.now() - this.t0;
    const audio = this.audio[id];
    if (fn) await fn();
    const target = Math.max(audio + TAIL_MS, minHold);
    const elapsed = Date.now() - this.t0 - start;
    if (elapsed < target) await hold(target - elapsed);
    this.beats.push({ id, start, audio, end: Date.now() - this.t0 });
  }

  /**
   * Remember where `target` is on screen right now (CSS px, relative to the viewport).
   * The studio zooms to marks and moves its cursor to them. Call it just before a click.
   * Pass several locators to mark the box around all of them (e.g. a table column).
   */
  async mark(id: string, target: Locator | Locator[]) {
    const boxes = await Promise.all((Array.isArray(target) ? target : [target]).map((l) => l.boundingBox()));
    if (!boxes.length || boxes.some((b) => !b)) throw new Error(`mark "${id}": element is not visible`);
    const x = Math.min(...boxes.map((b) => b!.x));
    const y = Math.min(...boxes.map((b) => b!.y));
    const box = {
      x,
      y,
      width: Math.max(...boxes.map((b) => b!.x + b!.width)) - x,
      height: Math.max(...boxes.map((b) => b!.y + b!.height)) - y,
    };
    this.marks.push({ id, t: Date.now() - this.t0, box });
  }

  async stop() {
    await hold(400);
    await this.cdp.send("Page.stopScreencast").catch(() => undefined);
    await hold(200);
    fs.writeFileSync(
      path.join(this.dir, "frames.json"),
      JSON.stringify({
        frames: this.frames,
        beats: this.beats,
        marks: this.marks,
        viewport: this.viewport,
        total: Date.now() - this.t0,
      }),
    );
  }
}

/** Wait for a navigation to finish rendering before the next beat. */
export async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

/** Smooth-scroll the page to `top` px (visible in the video, unlike an instant jump). */
export async function scrollTo(page: Page, top: number) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), top);
}
