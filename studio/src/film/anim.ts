import { Easing, interpolateColors } from "remotion";

/** Animation helpers shared by the film components. All times are absolute frames. */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** 0..1 progress of frame f between frames a and b. */
export const seg = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1); // fast start, long soft landing
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);
/** Overshoots a little, then settles (for pops). */
export const backOut = (p: number) => {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};

/** A value that eases through keyframes [{f, v}] (numbers or colours). Holds the first and last value outside. */
export function keyed(keys: { f: number; v: number }[], f: number, ease = easeInOut): number {
  if (f <= keys[0].f) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i].f) return lerp(keys[i - 1].v, keys[i].v, ease(seg(f, keys[i - 1].f, keys[i].f)));
  }
  return keys[keys.length - 1].v;
}

export function keyedColor(keys: { f: number; c: string }[], f: number, ease = easeInOut): string {
  if (f <= keys[0].f) return keys[0].c;
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i].f) return interpolateColors(ease(seg(f, keys[i - 1].f, keys[i].f)), [0, 1], [keys[i - 1].c, keys[i].c]);
  }
  return keys[keys.length - 1].c;
}

/** Keyframes of several named numbers at once: keyedMany([{f, x:.., y:..}], f) -> {x, y}. */
export function keyedMany<K extends string>(keys: ({ f: number } & Record<K, number>)[], f: number, ease = easeInOut): Record<K, number> {
  const out = {} as Record<K, number>;
  const names = Object.keys(keys[0]).filter((k) => k !== "f") as K[];
  for (const n of names) out[n] = keyed(keys.map((k) => ({ f: k.f, v: k[n] })), f, ease);
  return out;
}

/** Blur that follows speed: fast moves smear, still ones are sharp (a cheap stand-in for motion blur). */
export const speedBlur = (dx: number, dy = 0, k = 0.18, max = 24) => Math.min(max, Math.hypot(dx, dy) * k);

/** Deterministic pseudo-random numbers, so every render is identical. */
export function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let canvas: HTMLCanvasElement | null = null;
/** Width in px of `text` in a CSS font like "600 64px Display". Fonts must be loaded (useThemeFonts). */
export function measure(text: string, font: string): number {
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  return ctx.measureText(text).width;
}
