import React, { createContext, useContext, useEffect, useState } from "react";
import { continueRender, delayRender, Img, staticFile } from "remotion";
import type { Theme } from "../types";
import { easeOut, measure, rand, seg } from "./anim";
import type { Shot } from "./types";

export const W = 1920;
export const H = 1080;
export const CX = W / 2;
export const CY = H / 2;

export const ShotsCtx = createContext<Record<string, Shot>>({});
export const useShot = (name: string) => {
  const s = useContext(ShotsCtx)[name];
  if (!s) throw new Error(`no shot "${name}"`);
  return s;
};

/** A captured still at its CSS size (the file is 2x or 3x, so it stays sharp when scaled up). */
export const Pic: React.FC<{ name: string; style?: React.CSSProperties }> = ({ name, style }) => {
  const s = useShot(name);
  return <Img src={staticFile(s.src)} style={{ width: s.w, height: s.h, display: "block", ...style }} />;
};

/**
 * Loads the theme fonts and only then lets the frame render, so text measured with canvas uses the
 * real font. Returns true once loaded (the render is held until the re-render with `true` commits).
 */
export function useFilmFonts(theme: Theme) {
  const [handle] = useState(() => delayRender("Loading fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const faces = [new FontFace("Inter", `url(${staticFile("fonts/Inter.ttf")})`, { weight: "100 900" })];
    if (theme.displayFont) faces.push(new FontFace("Display", `url(${staticFile(theme.displayFont)})`, { weight: "100 900" }));
    if (theme.bodyFont) faces.push(new FontFace("Body", `url(${staticFile(theme.bodyFont)})`, { weight: "100 900" }));
    Promise.all(faces.map((f) => f.load().then((l) => document.fonts.add(l))))
      .catch((e) => console.error(e))
      .finally(() => setReady(true));
  }, [theme.displayFont, theme.bodyFont]);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  return ready;
}

/** Page-like image on a 3D plane. The anchor point (page px) sits at screen centre; children use page px. */
export const Plane: React.FC<{
  name: string;
  ax: number;
  ay: number;
  s: number;
  rx?: number;
  ry?: number;
  rz?: number;
  dx?: number;
  blur?: number;
  opacity?: number;
  children?: React.ReactNode;
}> = ({ name, ax, ay, s, rx = 0, ry = 0, rz = 0, dx = 0, blur = 0, opacity = 1, children }) => {
  const shot = useShot(name);
  return (
    <div
      style={{
        position: "absolute",
        left: CX - ax + dx,
        top: CY - ay,
        width: shot.w,
        height: shot.h,
        transformOrigin: `${ax}px ${ay}px`,
        transform: `perspective(2400px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        opacity,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      <Pic name={name} />
      {children}
    </div>
  );
};

/** Pointing-hand cursor (line art: dark outline under a white stroke). Hotspot = fingertip at (x, y). */
export const Hand: React.FC<{ x: number; y: number; size?: number; press?: number; opacity?: number }> = ({ x, y, size = 64, press = 1, opacity = 1 }) => {
  const paths = [
    "M22 14a8 8 0 0 1-8 8",
    "M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2",
    "M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1",
    "M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10",
    "M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
  ];
  // Fingertip is at (7, 2) in the 24-unit icon.
  const k = size / 24;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: x - 7 * k,
        top: y - 2 * k,
        opacity,
        overflow: "visible",
        transformOrigin: `${7 * k}px ${2 * k}px`,
        transform: `scale(${press})`,
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))",
      }}
    >
      <path d="M6 14 L6 4 a2 2 0 0 1 4 0 v5.5 a2 2 0 0 1 4 0 v1 a2 2 0 0 1 4 0 v1 a2 2 0 0 1 4 0 v3 a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L6 15z" fill="#fff" />
      {paths.map((d, i) => (
        <path key={`o${i}`} d={d} fill="none" stroke="#0a0812" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
};

/** Expanding click ring. */
export const Ring: React.FC<{ f: number; at: number; x: number; y: number; color: string; size?: number }> = ({ f, at, x, y, color, size = 90 }) => {
  const p = seg(f, at, at + 16);
  if (f < at || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `4px solid ${color}`,
        opacity: 0.85 * (1 - p),
        transform: `scale(${0.3 + easeOut(p) * 1.2})`,
      }}
    />
  );
};

/** Burst of confetti from (x, y) starting at frame `at`. */
export const Confetti: React.FC<{ f: number; at: number; x: number; y: number; colors: string[]; n?: number }> = ({ f, at, x, y, colors, n = 80 }) => {
  const t = f - at;
  if (t < 0 || t > 70) return null;
  const r = rand(7);
  const bits = Array.from({ length: n }, (_, i) => {
    const a = r() * Math.PI * 2;
    const v = 14 + r() * 26;
    return { i, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, spin: (r() - 0.5) * 30, w: 10 + r() * 12, h: 6 + r() * 8, c: colors[i % colors.length] };
  });
  // Velocity decays (drag) and gravity pulls down.
  const drag = (1 - Math.pow(0.9, t)) / 0.1;
  return (
    <>
      {bits.map((b) => (
        <div
          key={b.i}
          style={{
            position: "absolute",
            left: x + b.vx * drag,
            top: y + b.vy * drag + 0.35 * t * t,
            width: b.w,
            height: b.h,
            borderRadius: 3,
            background: b.c,
            opacity: 1 - seg(t, 40, 70),
            transform: `rotate(${b.spin * t}deg)`,
          }}
        />
      ))}
    </>
  );
};

/** The Ditto mark, from the theme logo. */
export const Mark: React.FC<{ src: string; size: number; style?: React.CSSProperties }> = ({ src, size, style }) => (
  <Img src={staticFile(src)} style={{ width: size, height: size * (25.1 / 27.1), display: "block", ...style }} />
);

export type LineWord = { text: string; at: number; color?: string };

/**
 * Words appended on one line, each de-blurring in when spoken. The line re-centres smoothly as it
 * grows. Returns the element and the current right edge (for a text cursor that follows it).
 */
export function wordLine(f: number, words: LineWord[], font: string, cx: number, baseline: number, ink: string) {
  const space = measure(" ", font);
  const widths = words.map((w) => measure(w.text, font));
  const grow = (i: number) => easeOut(seg(f, words[i].at, words[i].at + 9));
  let total = 0;
  widths.forEach((w, i) => (total += (w + (i ? space : 0)) * grow(i)));
  const left = cx - total / 2;
  let x = left;
  let end = left;
  const els = words.map((w, i) => {
    const p = grow(i);
    const el =
      f >= w.at ? (
        <span
          key={i}
          style={{
            position: "absolute",
            left: x + (i ? space : 0) * p,
            top: baseline,
            font,
            color: w.color ?? ink,
            whiteSpace: "pre",
            lineHeight: 1,
            transform: `translateY(${-0.8 * parseFloat(font.split("px")[0].split(" ").pop()!) + (1 - p) * 24}px)`,
            opacity: p,
            filter: p < 1 ? `blur(${(1 - p) * 14}px)` : undefined,
          }}
        >
          {w.text}
        </span>
      ) : null;
    if (f >= w.at) end = x + (i ? space : 0) * p + widths[i];
    x += (widths[i] + (i ? space : 0)) * p;
    return el;
  });
  // `end`: right edge of the newest word at full size (a text cursor sits here).
  return { els, right: left + total, left, end };
}
