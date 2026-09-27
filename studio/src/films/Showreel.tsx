import React, { useMemo } from "react";
import { AbsoluteFill, Audio, interpolateColors, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BEAT, backOut, beatPulse as pulse, bounceOut, clamp, easeIn, easeInOut, easeOut, lerp, measure, rand, seg } from "../film/anim";
import { CX, CY, H, W, useFilmFonts } from "../film/parts";
import type { FilmProps } from "../film/types";

// A 15-second motion reel: eight two-second scenes, each a different craft (path animation, kinetic
// type, shape morphing, tile choreography, particles, 3D, physics, a signature). 30 fps at 120 bpm, so
// one beat is exactly 15 frames and every cut and hit lands on the music. One orange dot is the thread
// through all of it: it draws the first line, punctuates the words, orbits the shapes and ends as the logo.

const C = { ink: "#0E0E12", paper: "#F3EFE6", orange: "#FF5B1F", blue: "#3D5AFE" };
const SANS = "Inter, sans-serif";
const SERIF = "Display, Georgia, serif";

const mix = (a: string, b: string, p: number) => interpolateColors(clamp(p), [0, 1], [a, b]);
type P = [number, number];

// ---------- 01 ORIGIN (f0-60): a dot draws a line, the line comes home, the dot opens the frame ----------
function catmull(pts: P[], n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const c = (a: number, b: number, c2: number, d: number) =>
        0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const SWOOSH = catmull(
  [[960, 540], [1330, 290], [1590, 560], [1270, 830], [760, 860], [500, 600], [690, 320], [1080, 290], [1160, 470], [960, 540]],
  28,
);
const along = (pts: P[], p: number): P => {
  const x = clamp(p) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(x)), t = x - i;
  return [lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)];
};
const trail = (pts: P[], p: number) => {
  const k = Math.floor(clamp(p) * (pts.length - 1));
  return [...pts.slice(0, k + 1), along(pts, p)].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
};

function s1(f: number) {
  if (f >= 60) return null;
  const appear = backOut(seg(f, 0, 10));
  const p = easeInOut(seg(f, 13, 46));
  const lag = easeInOut(seg(f, 17, 49));
  const [x, y] = along(SWOOSH, p);
  const grow = easeIn(seg(f, 48, 60));
  const r = lerp(22, 1250, grow) * appear * (1 + 0.35 * pulse(f) * (1 - grow));
  const fade = 1 - seg(f, 44, 52);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <polyline points={trail(SWOOSH, lag)} fill="none" stroke={C.blue} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={fade} />
        <polyline points={trail(SWOOSH, p)} fill="none" stroke={C.orange} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={fade} />
        {[0, 15, 30, 45].filter((b) => f >= b && f < b + 16).map((b) => (
          <circle key={b} cx={b === 0 || b === 45 ? CX : x} cy={b === 0 || b === 45 ? CY : y} r={22 + (f - b) * 10} fill="none" stroke={C.paper} strokeWidth={2} opacity={0.6 * (1 - (f - b) / 16)} />
        ))}
        <circle cx={x} cy={y} r={r} fill={mix(C.orange, C.paper, grow * 1.6)} />
      </svg>
    </AbsoluteFill>
  );
}

// ---------- 02 TYPE (f60-120): one word per beat, each with its own entrance; the dot is the full stop ----------
const WORDS = [
  { w: "MOVE", at: 60 },
  { w: "SHAPE", at: 75 },
  { w: "TIME", at: 90 },
  { w: "FEEL", at: 105 },
];
const TYPE_SIZE = 300;

function s2(f: number) {
  if (f < 60 || f >= 121) return null;
  const idx = WORDS.findIndex((w, i) => f >= w.at && (i === WORDS.length - 1 || f < WORDS[i + 1].at));
  const { w, at } = WORDS[idx];
  const t = f - at;
  const weights = w.split("").map((_, i) => (w === "SHAPE" ? lerp(100, 900, easeOut(seg(t, i * 1.5, i * 1.5 + 9))) : 900));
  const widths = w.split("").map((ch, i) => measure(ch, `${Math.round(weights[i])} ${TYPE_SIZE}px ${SANS}`));
  const total = widths.reduce((a, b) => a + b, 0) + 20 * (w.length - 1);
  const x0 = CX - (total + 80) / 2;
  const top = CY - TYPE_SIZE * 0.56;
  let x = x0;
  const letters = w.split("").map((ch, i) => {
    const lx = x;
    x += widths[i] + 20;
    let tr = "", clip = false;
    if (w === "MOVE") {
      const e = easeOut(seg(t, i * 1.5, i * 1.5 + 9));
      tr = `translateY(${(1 - e) * 110}%) skewY(${(1 - e) * 14}deg)`;
      clip = true;
    } else if (w === "SHAPE") {
      tr = `scaleY(${lerp(1.5, 1, easeOut(seg(t, i * 1.5, i * 1.5 + 9)))})`;
    } else if (w === "FEEL") {
      const p = seg(t, i * 2, i * 2 + 13);
      tr = `translateY(${lerp(-760, 0, bounceOut(p))}px) rotate(${lerp(i % 2 ? 28 : -28, 0, easeOut(p))}deg)`;
    }
    const glyph = (
      <div style={{ font: `${Math.round(weights[i])} ${TYPE_SIZE}px ${SANS}`, lineHeight: `${TYPE_SIZE}px`, color: C.ink, transform: tr, transformOrigin: "50% 100%" }}>{ch}</div>
    );
    return (
      <div key={i} style={{ position: "absolute", left: lx, top, height: TYPE_SIZE * 1.05, overflow: clip ? "hidden" : "visible" }}>
        {glyph}
      </div>
    );
  });
  // TIME is revealed by a clock hand sweeping round the word.
  const deg = w === "TIME" ? 360 * easeInOut(seg(t, 0, 10)) : 360;
  const mask = deg < 360 ? `conic-gradient(from 0deg at ${CX}px ${CY}px, #000 ${deg}deg, transparent ${deg}deg)` : undefined;
  // The full stop drops in after the word and lands on the baseline.
  const dotP = seg(t, 4, 16);
  const dotY = lerp(-120, top + TYPE_SIZE * 0.8, bounceOut(dotP));
  const dotX = x0 + total + 50;
  // Exit: the word lifts off in the last 3 frames before the next beat (FEEL leaves under the wipe).
  const next = WORDS[idx + 1]?.at ?? 999;
  const out = easeIn(seg(f, next - 3, next));
  const wipe = easeInOut(seg(f, 111, 120));
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ transform: `translateY(${-70 * out}px)`, opacity: 1 - out, WebkitMaskImage: mask, maskImage: mask }}>
        {letters}
      </AbsoluteFill>
      {deg < 360 && (
        <div style={{ position: "absolute", left: CX - 3, top: CY - 520, width: 6, height: 520, background: C.orange, transformOrigin: "50% 100%", transform: `rotate(${deg}deg)` }} />
      )}
      <div style={{ position: "absolute", left: dotX - 26, top: dotY - 26, width: 52, height: 52, borderRadius: 26, background: C.orange, opacity: (1 - out) * (dotP > 0 ? 1 : 0), transform: `scale(${1 + 0.25 * pulse(t)})` }} />
      {wipe > 0 && (
        <div style={{ position: "absolute", top: 0, bottom: 0, left: lerp(W + 80, -80, wipe), width: W + 80, background: C.blue, borderLeft: `80px solid ${C.orange}` }} />
      )}
    </AbsoluteFill>
  );
}

// ---------- 03 FORM (f120-180): one shape morphs on every beat, with echo trails and orbiting dots ----------
const N = 144;
const THETA = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2 - Math.PI / 2);
const cross = (a: P, b: P) => a[0] * b[1] - a[1] * b[0];
const polyR = (verts: P[]) => (th: number) => {
  const d: P = [Math.cos(th), Math.sin(th)];
  for (let i = 0; i < verts.length; i++) {
    const p = verts[i], q = verts[(i + 1) % verts.length], e: P = [q[0] - p[0], q[1] - p[1]];
    const den = cross(d, e);
    if (Math.abs(den) < 1e-9) continue;
    const t = cross(p, d) / den;
    const s = cross(p, e) / den;
    if (t >= -1e-6 && t <= 1 + 1e-6 && s > 0) return s;
  }
  return 1;
};
const ring = (n: number, r: (k: number) => number, off = -Math.PI / 2): P[] =>
  Array.from({ length: n }, (_, k) => [Math.cos(off + (k / n) * Math.PI * 2) * r(k), Math.sin(off + (k / n) * Math.PI * 2) * r(k)]);
const SHAPES: number[][] = [
  THETA.map(() => 1),
  THETA.map((th) => 0.98 / Math.pow(Math.pow(Math.abs(Math.cos(th)), 5) + Math.pow(Math.abs(Math.sin(th)), 5), 1 / 5)),
  THETA.map(polyR(ring(3, () => 1.25))),
  THETA.map(polyR(ring(10, (k) => (k % 2 ? 0.5 : 1.2)))),
];
const MORPH = [
  { f: 120, s: 0 },
  { f: 135, s: 1 },
  { f: 150, s: 2 },
  { f: 165, s: 3 },
  { f: 171, s: 0 },
];
function radii(f: number): number[] {
  let i = 0;
  while (i + 1 < MORPH.length && f >= MORPH[i + 1].f) i++;
  if (i === 0) return SHAPES[0];
  const a = SHAPES[MORPH[i - 1].s], b = SHAPES[MORPH[i].s], p = backOut(seg(f, MORPH[i].f, MORPH[i].f + 8));
  return a.map((r, k) => lerp(r, b[k], p));
}
function shapePath(f: number, scale: number) {
  const rs = radii(f);
  const snaps = [135, 150, 165].reduce((a, b) => a + 60 * easeOut(seg(f, b, b + 9)), 0);
  const rot = ((f - 120) * 1.2 + snaps) * (Math.PI / 180);
  const pl = pulse(f, 120);
  const sx = 1 + 0.14 * pl, sy = 1 - 0.1 * pl;
  return (
    THETA.map((th, k) => {
      const a = th + rot;
      return `${k ? "L" : "M"}${(CX + Math.cos(a) * rs[k] * 250 * scale * sx).toFixed(1)},${(CY + Math.sin(a) * rs[k] * 250 * scale * sy).toFixed(1)}`;
    }).join("") + "Z"
  );
}
function s3(f: number) {
  if (f < 120 || f >= 180) return null;
  const enter = backOut(seg(f, 120, 129));
  const zoom = easeIn(seg(f, 171, 180));
  const scale = enter * (1 + 11 * zoom);
  const echo = 1 - seg(f, 166, 172);
  const orbit = (i: number) => {
    const a = (f - 120) * 0.11 + (i * Math.PI * 2) / 3;
    const depth = Math.sin(a);
    return { x: CX + Math.cos(a) * 470, y: CY + depth * 110 - Math.cos(a) * 60, s: 0.55 + 0.45 * (depth + 1) / 2, front: depth > 0, i };
  };
  const dots = [0, 1, 2].map(orbit);
  const dot = (d: ReturnType<typeof orbit>) => (
    <circle key={d.i} cx={d.x} cy={d.y} r={24 * d.s * enter * (1 - zoom)} fill={d.i === 1 ? C.paper : C.orange} />
  );
  return (
    <AbsoluteFill style={{ background: C.blue }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        {dots.filter((d) => !d.front).map(dot)}
        {[6, 5, 4, 3, 2, 1].map((k) => (
          <path key={k} d={shapePath(f - k * 2, enter)} fill="none" stroke={C.orange} strokeWidth={3} opacity={echo * 0.7 * (1 - k / 7) * seg(f, 122 + k * 2, 124 + k * 2)} />
        ))}
        <path d={shapePath(f, scale)} fill={mix(C.paper, C.ink, zoom * 1.4)} />
        {dots.filter((d) => d.front).map(dot)}
      </svg>
    </AbsoluteFill>
  );
}

// ---------- 04 RHYTHM (f180-240): 84 tiles flip in a diagonal wave, each carrying its slice of one word ----------
const COLS = 12, ROWS = 7, TW = W / COLS, TH = H / ROWS;
function s4(f: number) {
  if (f < 180 || f >= 242) return null;
  const tiles = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const flip = easeInOut(seg(f, 181 + (c + r) * 1.1, 191 + (c + r) * 1.1));
      const dist = Math.hypot((c + 0.5) / COLS - 0.5, ((r + 0.5) / ROWS - 0.5) * 0.56) / 0.57;
      const gone = easeIn(seg(f, 221 + dist * 9, 229 + dist * 9));
      const breathe = f > 200 ? 1 - 0.07 * pulse(f, 195) : 1;
      tiles.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: "absolute", left: c * TW, top: r * TH, width: TW, height: TH,
            transform: `perspective(1100px) rotateY(${flip * 180}deg) scale(${(1 - gone) * breathe}) rotateZ(${gone * 90}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: C.ink, boxShadow: "inset 0 0 0 1px rgba(243,239,230,0.08)", backfaceVisibility: "hidden" }} />
          <div style={{ position: "absolute", inset: 1, overflow: "hidden", background: (r + c) % 7 === 3 ? C.blue : C.orange, transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
            <div style={{ position: "absolute", left: -(c * TW + 1), top: -(r * TH + 1), width: W, height: H, display: "flex", alignItems: "center", justifyContent: "center", font: `900 330px ${SANS}`, letterSpacing: -8, color: C.ink }}>
              RHYTHM
            </div>
          </div>
        </div>,
      );
    }
  }
  return <AbsoluteFill>{tiles}</AbsoluteFill>;
}

// ---------- 05 PARTICLES (f232-300): a vortex of 1,000 dots gathers into a name ----------
function sampleText(text: string, font: string, step: number): P[] {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, CX, CY);
  const d = ctx.getImageData(0, 0, W, H).data;
  const pts: P[] = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
  return pts;
}
const NAME_FONT = `900 300px ${SANS}`;
type Particle = { tx: number; ty: number; r0: number; a0: number; w: number; delay: number; col: string; curl: number };
function makeParticles(targets: P[]): Particle[] {
  const rnd = rand(11);
  return targets.map(([tx, ty]) => {
    const r0 = 60 + Math.pow(rnd(), 0.7) * 820;
    const k = rnd();
    return { tx, ty, r0, a0: rnd() * Math.PI * 2, w: 0.012 + 9 / r0, delay: 258 + rnd() * 14, col: k < 0.14 ? C.orange : k < 0.26 ? C.blue : C.paper, curl: (rnd() - 0.5) * 260 };
  });
}
function s5(f: number, parts: Particle[]) {
  if (f < 232 || f >= 302) return null;
  const open = easeOut(seg(f, 232, 252)) * (1 + 0.06 * pulse(f, 240));
  const solid = seg(f, 292, 299);
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", opacity: 1 - solid * 0.9 }}>
        {parts.map((p, i) => {
          const a = p.a0 + p.w * (f - 232) * 3.2;
          const vx = CX + Math.cos(a) * p.r0 * open, vy = CY + Math.sin(a) * p.r0 * open * 0.62;
          const t = easeInOut(seg(f, p.delay, p.delay + 22));
          const bend = Math.sin(t * Math.PI) * p.curl;
          const x = lerp(vx, p.tx, t) + bend * 0.4, y = lerp(vy, p.ty, t) - bend;
          return <circle key={i} cx={x} cy={y} r={lerp(2.2, 3.6, t)} fill={t > 0.98 ? mix(p.col, C.paper, seg(f, 284, 292)) : p.col} />;
        })}
      </svg>
      {solid > 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", font: NAME_FONT, color: C.paper, opacity: solid }}>
          CLAUDE
        </div>
      )}
    </AbsoluteFill>
  );
}

// ---------- 06 DEPTH (f300-360): the name glitches into slices, then a ring of words spins up with the riser ----------
const RING = ["TYPE", "SHAPE", "RHYTHM", "PHYSICS", "COLOR", "TIMING", "CRAFT", "STORY"];
function s6(f: number) {
  if (f < 300 || f >= 360) return null;
  const amp = 150 * seg(f, 300, 303) * (1 - easeOut(seg(f, 305, 316)));
  const nameOut = seg(f, 312, 318);
  const slices = 12;
  const ringIn = easeOut(seg(f, 314, 328));
  const t = seg(f, 316, 356);
  const turn = 50 * t + 700 * t * t * t;
  const spin = (50 + 2100 * t * t) / 40; // degrees per frame
  const flat = easeIn(seg(f, 349, 358));
  const flash = seg(f, 355, 359);
  const layer = (color: string, dx: number) =>
    Array.from({ length: slices }, (_, i) => (
      <div
        key={`${color}-${i}`}
        style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", font: NAME_FONT, color,
          clipPath: `inset(${(i / slices) * 100}% 0 ${(1 - (i + 1) / slices) * 100}% 0)`,
          transform: `translateX(${Math.sin(i * 1.9 + f * 1.3) * amp + dx}px)`,
          mixBlendMode: color === C.paper ? "normal" : "screen",
        }}
      >
        CLAUDE
      </div>
    ));
  return (
    <AbsoluteFill>
      {nameOut < 1 && (
        <AbsoluteFill style={{ opacity: 1 - nameOut, transform: `scale(${1 - 0.5 * easeIn(nameOut)})` }}>
          {amp > 1 && layer(C.orange, -amp * 0.12)}
          {amp > 1 && layer(C.blue, amp * 0.12)}
          {layer(C.paper, 0)}
        </AbsoluteFill>
      )}
      {ringIn > 0 && (
        <AbsoluteFill style={{ perspective: 1500, filter: `blur(${Math.min(9, Math.max(0, spin - 22) * 0.25)}px)` }}>
          <div style={{ position: "absolute", left: CX, top: CY, transformStyle: "preserve-3d", transform: `scale(${ringIn}) rotateX(-14deg) rotateZ(-6deg) scaleY(${1 - 0.97 * flat}) rotateY(${turn}deg)` }}>
            {RING.map((word, i) => {
              const a = (i * 360) / RING.length;
              const facing = Math.cos(((a + turn) * Math.PI) / 180);
              return (
                <div
                  key={word}
                  style={{
                    position: "absolute", width: 900, left: -450, top: -70, textAlign: "center", font: `800 120px ${SANS}`, lineHeight: "140px",
                    color: i % 2 ? C.orange : C.paper, opacity: 0.25 + 0.75 * clamp((facing + 0.2) / 1.2),
                    transform: `rotateY(${a}deg) translateZ(760px)`,
                  }}
                >
                  {word}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
      {flash > 0 && <AbsoluteFill style={{ background: C.paper, opacity: flash }} />}
    </AbsoluteFill>
  );
}

// ---------- 07 RANGE (f360-420): the drop. Four panels slam in on the eighths, each a different craft ----------
const G = 24, PW = (W - 3 * G) / 2, PH = (H - 3 * G) / 2;
const PANELS = [
  { dir: [-1, 0], bg: C.orange, fg: C.ink, label: "SQUASH & STRETCH" },
  { dir: [0, -1], bg: C.blue, fg: C.paper, label: "3D" },
  { dir: [0, 1], bg: C.paper, fg: C.ink, label: "WAVEFORM" },
  { dir: [1, 0], bg: "#1C1C24", fg: C.paper, label: "EASING" },
];
function ball(f: number) {
  const u = (((f - 360) % BEAT) + BEAT) % BEAT / BEAT;
  const floor = 390;
  const h = 4 * u * (1 - u);
  const g = Math.min(u, 1 - u);
  const squash = g < 0.1 ? 1 - g / 0.1 : 0;
  const stretch = (1 - squash) * 0.18 * Math.abs(1 - 2 * u);
  const sx = 1 + 0.4 * squash - stretch * 0.5, sy = 1 - 0.32 * squash + stretch;
  const x = lerp(240, 690, easeInOut(seg(f, 360, 404)));
  const R = 56;
  return (
    <>
      <div style={{ position: "absolute", left: 60, right: 60, top: floor, height: 4, background: C.ink, opacity: 0.85 }} />
      <div style={{ position: "absolute", left: x - R * (1.2 - 0.5 * h), top: floor - 10, width: R * 2 * (1.2 - 0.5 * h), height: 16, borderRadius: "50%", background: "rgba(14,14,18,0.25)" }} />
      <div style={{ position: "absolute", left: x - R, top: floor - 2 * R - h * 250, width: 2 * R, height: 2 * R, borderRadius: R, background: C.ink, transformOrigin: "50% 100%", transform: `scale(${sx}, ${sy})` }} />
    </>
  );
}
function cube(f: number) {
  const s = 210, faces = [
    { t: `translateZ(${s / 2}px)`, bg: C.paper },
    { t: `rotateY(180deg) translateZ(${s / 2}px)`, bg: C.paper },
    { t: `rotateY(90deg) translateZ(${s / 2}px)`, bg: C.orange },
    { t: `rotateY(-90deg) translateZ(${s / 2}px)`, bg: C.ink },
    { t: `rotateX(90deg) translateZ(${s / 2}px)`, bg: C.paper },
    { t: `rotateX(-90deg) translateZ(${s / 2}px)`, bg: C.orange },
  ];
  const kick = 25 * [360, 375, 390, 405].reduce((a, b) => a + easeOut(seg(f, b, b + 10)), 0);
  return (
    <div style={{ position: "absolute", left: PW / 2, top: PH / 2 - 10, perspective: 900 }}>
      <div style={{ transformStyle: "preserve-3d", transform: `rotateX(${-24 + (f - 360) * 1.1}deg) rotateY(${(f - 360) * 2.4 + kick}deg)` }}>
        {faces.map((fc, i) => (
          <div key={i} style={{ position: "absolute", left: -s / 2, top: -s / 2, width: s, height: s, background: fc.bg, boxShadow: `inset 0 0 0 5px ${C.ink}`, transform: fc.t }} />
        ))}
      </div>
    </div>
  );
}
function waves(f: number) {
  const A = 34 * (1 + 0.7 * pulse(f, 360));
  const cols = [C.ink, C.orange, C.blue, C.orange, C.ink];
  return (
    <svg width={PW} height={PH} style={{ position: "absolute" }}>
      {cols.map((c, i) => {
        const pts = [];
        for (let x = 40; x <= PW - 40; x += 10) pts.push(`${x},${(PH / 2 - 10 + (i - 2) * 58 + A * Math.sin(x * 0.016 + f * 0.28 + i * 0.7) * Math.sin((x / PW) * Math.PI)).toFixed(1)}`);
        return <polyline key={i} points={pts.join(" ")} fill="none" stroke={c} strokeWidth={i === 2 ? 8 : 5} strokeLinecap="round" />;
      })}
    </svg>
  );
}
function counter(f: number) {
  const p = easeOut(seg(f, 362, 402));
  const R = 150, L = 2 * Math.PI * R;
  return (
    <>
      <svg width={PW} height={PH} style={{ position: "absolute" }}>
        <circle cx={PW / 2} cy={PH / 2 - 10} r={R} fill="none" stroke="rgba(243,239,230,0.12)" strokeWidth={16} />
        <circle cx={PW / 2} cy={PH / 2 - 10} r={R} fill="none" stroke={C.orange} strokeWidth={16} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} transform={`rotate(-90 ${PW / 2} ${PH / 2 - 10})`} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: PH / 2 - 80, textAlign: "center", font: `900 120px ${SANS}`, lineHeight: "140px", color: C.paper, fontVariantNumeric: "tabular-nums" }}>
        {Math.round(100 * p)}
        <span style={{ fontSize: 56, color: C.orange }}>%</span>
      </div>
    </>
  );
}
function s7(f: number) {
  if (f < 360 || f >= 422) return null;
  const shake = [360, 375, 390, 405].reduce((a, b) => a + (f >= b && f < b + 8 ? Math.exp(-(f - b) / 2) : 0), 0);
  const sx = Math.sin(f * 7.3) * 7 * shake, sy = Math.cos(f * 5.1) * 7 * shake;
  const push = 1 + 0.04 * easeInOut(seg(f, 360, 406));
  const content = [ball, cube, waves, counter];
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${push})` }}>
      {PANELS.map((pn, i) => {
        const at = 360 + i * 4;
        const p = seg(f, at, at + 11);
        const e = backOut(p);
        const x = G + (i % 2) * (PW + G), y = G + Math.floor(i / 2) * (PH + G);
        const dx = (1 - e) * 1250 * pn.dir[0], dy = (1 - e) * 800 * pn.dir[1];
        const gone = easeIn(seg(f, 404 + i * 2, 413 + i * 2));
        if (f < at) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: x, top: y, width: PW, height: PH, background: pn.bg, borderRadius: 18, overflow: "hidden",
              transformOrigin: `${CX - x}px ${CY - y}px`,
              transform: `translate(${dx}px, ${dy}px) scale(${1 - gone}) rotate(${gone * 20}deg)`,
              filter: p < 0.6 ? `blur(${(0.6 - p) * 22}px)` : undefined,
            }}
          >
            {content[i](f)}
            <div style={{ position: "absolute", left: 28, bottom: 22, font: `700 16px ${SANS}`, letterSpacing: 4, color: pn.fg, opacity: 0.8 }}>{`0${i + 1} — ${pn.label}`}</div>
          </div>
        );
      })}
      {f < 368 && <AbsoluteFill style={{ background: C.paper, opacity: 1 - easeOut(seg(f, 360, 368)) }} />}
    </AbsoluteFill>
  );
}

// ---------- 08 SIGNATURE (f414-450): the dot returns, hits on the downbeat, and signs the reel ----------
function s8(f: number) {
  if (f < 412) return null;
  const font = `600 210px ${SERIF}`;
  const tw = measure("Claude", font);
  const D = 50, gap = 36;
  const x0 = CX - (D + gap + tw) / 2;
  const move = easeInOut(seg(f, 423, 434));
  const dx = lerp(CX, x0 + D / 2, move), dy = lerp(CY, CY + 20, move);
  const dotS = backOut(seg(f, 412, 420)) * (1 + 0.6 * (f >= 420 ? Math.exp(-(f - 420) / 3) : 0));
  const reveal = easeOut(seg(f, 426, 441));
  const sub = easeOut(seg(f, 433, 443));
  const line = easeInOut(seg(f, 437, 447));
  const wave = seg(f, 420, 442);
  return (
    <AbsoluteFill>
      {f >= 420 && wave < 1 && (
        <div style={{ position: "absolute", left: CX - 900 * easeOut(wave), top: CY - 900 * easeOut(wave), width: 1800 * easeOut(wave), height: 1800 * easeOut(wave), borderRadius: "50%", boxShadow: `inset 0 0 0 ${lerp(8, 1, wave)}px ${C.paper}`, opacity: 1 - wave }} />
      )}
      <div style={{ position: "absolute", left: dx - D / 2, top: dy - D / 2, width: D, height: D, borderRadius: D / 2, background: C.orange, transform: `scale(${dotS})` }} />
      <div
        style={{
          position: "absolute", left: x0 + D + gap, top: CY - 130, font, lineHeight: "260px", color: C.paper, whiteSpace: "nowrap",
          clipPath: `inset(-20% ${(1 - reveal) * 100}% -20% 0)`, transform: `translateX(${(1 - reveal) * -50}px)`,
        }}
      >
        Claude
      </div>
      <div style={{ position: "absolute", left: x0 + D + gap + 6, top: CY + 138, height: 3, width: (tw - 12) * line, background: C.orange }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + 175, textAlign: "center", font: `600 24px ${SANS}`, letterSpacing: 12, color: C.paper, opacity: sub * 0.75, transform: `translateY(${(1 - sub) * 16}px)` }}>
        MOTION REEL · 2026 · EVERY FRAME ON PURPOSE
      </div>
    </AbsoluteFill>
  );
}

// ---------- HUD: a designer's viewer overlay, inverted against whatever sits under it ----------
const SECTIONS = [
  { at: 0, name: "ORIGIN" },
  { at: 60, name: "TYPE" },
  { at: 120, name: "FORM" },
  { at: 180, name: "RHYTHM" },
  { at: 240, name: "PARTICLES" },
  { at: 300, name: "DEPTH" },
  { at: 360, name: "RANGE" },
  { at: 420, name: "SIGNATURE" },
];
const pad2 = (n: number) => String(n).padStart(2, "0");
function hud(f: number) {
  const k = SECTIONS.filter((s) => f >= s.at).length - 1;
  const s = SECTIONS[k];
  const inP = easeOut(seg(f, s.at, s.at + 7));
  const show = seg(f, 6, 14);
  const beat = Math.floor(f / BEAT) % 4;
  const small = `600 17px ${SANS}`;
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <div key={`${x}${y}`} style={{ position: "absolute", left: x, top: y, width: 28, height: 28, borderLeft: sx > 0 ? "2px solid #fff" : undefined, borderRight: sx < 0 ? "2px solid #fff" : undefined, borderTop: sy > 0 ? "2px solid #fff" : undefined, borderBottom: sy < 0 ? "2px solid #fff" : undefined }} />
  );
  return (
    <AbsoluteFill style={{ mixBlendMode: "difference", color: "#fff", opacity: show, fontVariantNumeric: "tabular-nums" }}>
      {corner(36, 36, 1, 1)}
      {corner(W - 64, 36, -1, 1)}
      {corner(36, H - 64, 1, -1)}
      {corner(W - 64, H - 64, -1, -1)}
      <div style={{ position: "absolute", left: 80, top: 44, font: small, letterSpacing: 5 }}>CLAUDE — MOTION REEL</div>
      <div style={{ position: "absolute", right: 80, top: 44, font: small, letterSpacing: 3 }}>{`00:00:${pad2(Math.floor(f / 30))}:${pad2(f % 30)}`}</div>
      <div style={{ position: "absolute", left: 80, bottom: 42, font: small, letterSpacing: 5, overflow: "hidden", height: 22 }}>
        <div style={{ transform: `translateY(${(1 - inP) * 22}px)` }}>{`${pad2(k + 1)} / 08 — ${s.name}`}</div>
      </div>
      <div style={{ position: "absolute", right: 80, bottom: 46, display: "flex", gap: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 12, height: 12, border: "2px solid #fff", background: i === beat ? "#fff" : "transparent" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

const SFX: [string, number, number][] = [
  ["pop", 1, 0.5],
  ["whoosh", 110, 0.45],
  ["whoosh", 169, 0.45],
  ["whoosh", 219, 0.35],
  ["sparkle", 284, 0.45],
  ["whoosh", 347, 0.5],
  ["pop", 412, 0.45],
];

export const Showreel: React.FC<FilmProps> = (props) => {
  const f = useCurrentFrame();
  const ready = useFilmFonts(props.theme);
  const parts = useMemo(() => (ready ? makeParticles(sampleText("CLAUDE", NAME_FONT, 7)) : []), [ready]);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      {ready && (
        <>
          {s1(f)}
          {s2(f)}
          {s3(f)}
          {s4(f)}
          {s5(f, parts)}
          {s6(f)}
          {s7(f)}
          {s8(f)}
          {hud(f)}
        </>
      )}
      <Audio src={staticFile(props.music.bed)} volume={0.9} />
      {SFX.map(([name, at, v], i) => (
        <Sequence key={i} from={at} durationInFrames={60}>
          <Audio src={staticFile(props.music.sfx[name])} volume={v} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
