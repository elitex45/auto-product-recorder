import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import { backOut, easeIn, easeInOut, easeOut, keyedMany, lerp, measure, rand, seg, speedBlur } from "../film/anim";
import { CX, CY, Confetti, H, Hand, Mark, Pic, Plane, Ring, ShotsCtx, useFilmFonts, W, wordLine, type LineWord } from "../film/parts";
import type { FilmProps } from "../film/types";
import type { Theme } from "../types";

// Ditto promo v3: one unbroken chain. Every shot hands an object to the next (bar -> pill -> button ->
// circle -> card -> rows -> chips -> bar -> board -> phones -> words -> logo). Frames are absolute
// (30 fps); spoken words are looked up from the aligner so moves land on the voice.

type Ctx = { f: number; T: Theme; at: (id: string, word: string, nth?: number) => number; props: FilmProps };

const DISPLAY = "Display, Inter, sans-serif";
const BODY = "Body, Inter, sans-serif";
const money = (v: number) => "$" + Math.round(v).toLocaleString("en-US");

/** Rounded rect that morphs between boxes. `fill` layers crossfade (e.g. gradient -> glass). */
const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  bg: string;
  glow?: string;
  border?: string;
  opacity?: number;
  blur?: number;
  transform?: string;
  children?: React.ReactNode;
}> = ({ x, y, w, h, r, bg, glow, border, opacity = 1, blur = 0, transform, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: r,
      background: bg,
      boxShadow: glow,
      border,
      opacity,
      overflow: "hidden",
      transform,
      filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
    }}
  >
    {children}
  </div>
);

// ---------- S1: $50,000 bar -> four weeks -> one link pill (f0-125) ----------
const BAR = { x: 260, y: 600, w: 1400, h: 22 };
const PILL = { w: 960, h: 124 };

function s1({ f, T, at }: Ctx) {
  if (f > 126) return null;
  const grow = easeOut(seg(f, at("v1", "Fifty") - 2, at("v1", "dollars") + 14));
  const weeksAt = at("v1", "Four");
  const linkAt = at("v1", "One");
  const gap = 30 * easeOut(seg(f, weeksAt - 2, weeksAt + 8)) * (1 - easeInOut(seg(f, linkAt - 10, linkAt - 2)));
  const font = `600 170px ${DISPLAY}`;
  const tw = measure("$50,000", font);
  const head = BAR.x + BAR.w * grow;
  const numLeft = Math.max(BAR.x, head - tw);
  const numOut = seg(f, linkAt, linkAt + 12);
  const gradient = `linear-gradient(90deg, ${T.accent2}, ${T.accent})`;
  const els: React.ReactNode[] = [];

  if (f < linkAt - 2) {
    const segW = (BAR.w - 3 * gap) / 4;
    const split = gap > 0.5;
    if (!split) {
      els.push(<Box key="bar" x={BAR.x} y={BAR.y} w={BAR.w * grow} h={BAR.h} r={11} bg={gradient} glow={`0 0 40px ${T.accent}66`} />);
    } else {
      for (let i = 0; i < 4; i++) {
        const lit = 1 - seg(f, weeksAt + 2 + i * 5, weeksAt + 16 + i * 5);
        const on = f >= weeksAt + 2 + i * 5 ? lit : 0;
        els.push(
          <Box
            key={`seg${i}`}
            x={BAR.x + i * (segW + gap)}
            y={BAR.y - on * 4}
            w={segW}
            h={BAR.h + on * 8}
            r={11}
            bg={gradient}
            glow={`0 0 ${40 + on * 50}px ${T.accent}${on > 0.1 ? "cc" : "66"}`}
          />,
        );
        const lab = easeOut(seg(f, weeksAt + i * 4, weeksAt + 10 + i * 4)) * (1 - seg(f, linkAt - 12, linkAt - 4));
        els.push(
          <div key={`wk${i}`} style={{ position: "absolute", left: BAR.x + i * (segW + gap), top: BAR.y + 50 + (1 - lab) * 16, font: `500 30px ${BODY}`, color: T.muted, opacity: lab, letterSpacing: 2 }}>
            WEEK {i + 1}
          </div>,
        );
      }
    }
  } else {
    // "One link": the bar gathers into a glass pill.
    const p = easeInOut(seg(f, linkAt - 2, linkAt + 14));
    const w = lerp(BAR.w, PILL.w, p);
    const h = lerp(BAR.h, PILL.h, p);
    const x = lerp(BAR.x, CX - PILL.w / 2, p);
    const y = lerp(BAR.y, CY - PILL.h / 2, p);
    const content = easeOut(seg(f, linkAt + 8, linkAt + 20));
    els.push(
      <Box key="pill" x={x} y={y} w={w} h={h} r={h / 2} bg="rgba(255,255,255,0.06)" border="1.5px solid rgba(255,255,255,0.16)" glow={`0 0 80px ${T.accent}33, inset 0 1px 0 rgba(255,255,255,0.12)`}>
        <div style={{ position: "absolute", inset: 0, background: gradient, opacity: 1 - p }} />
        <div style={{ position: "absolute", left: 44, top: 0, height: PILL.h, display: "flex", alignItems: "center", gap: 26, opacity: content, filter: `blur(${(1 - content) * 10}px)` }}>
          <Mark src={T.logo!} size={62} />
          <span style={{ font: `500 46px ${BODY}`, color: T.ink, whiteSpace: "nowrap" }}>
            ditto.example/invite/<span style={{ color: T.muted }}>•••••</span>
          </span>
        </div>
      </Box>,
    );
  }

  const numIn = seg(f, at("v1", "Fifty") - 4, at("v1", "Fifty") + 4);
  els.push(
    <div
      key="num"
      style={{
        position: "absolute",
        left: numLeft,
        top: BAR.y - 210 - numOut * 60,
        font,
        color: T.ink,
        whiteSpace: "nowrap",
        opacity: numIn * (1 - numOut),
        filter: numOut > 0 ? `blur(${numOut * 18}px)` : undefined,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {money(50000 * grow)}
    </div>,
  );
  const lab = seg(f, 30, 40) * (1 - seg(f, weeksAt - 6, weeksAt));
  els.push(
    <div key="lab" style={{ position: "absolute", left: BAR.x, top: BAR.y + 50, font: `500 30px ${BODY}`, color: T.muted, letterSpacing: 2, opacity: lab }}>
      TOTAL PRIZE POOL
    </div>,
  );
  return <>{els}</>;
}

// ---------- S2: pill -> Register button -> page on a 3D plane -> click (f106-182) ----------
const BTN = { x: 1047, y: 313.2, w: 326, h: 64 };
const BTN_C = { x: BTN.x + BTN.w / 2, y: BTN.y + BTN.h / 2 };
const LIFT = 2.4;
const CLICK1 = 162;

function s2({ f, T }: Ctx) {
  if (f < 106 || f > 200) return null;
  const els: React.ReactNode[] = [];
  // Pill morphs into the button (screen space).
  if (f < 132) {
    const p = easeInOut(seg(f, 108, 124));
    const w = lerp(PILL.w, BTN.w * LIFT, p);
    const h = lerp(PILL.h, BTN.h * LIFT, p);
    const img = seg(f, 118, 128);
    els.push(
      <Box
        key="pill2"
        x={CX - w / 2}
        y={CY - h / 2}
        w={w}
        h={h}
        r={h / 2}
        bg={`color-mix(in srgb, #a45cff ${p * 100}%, rgba(255,255,255,0.06))`}
        border={`1.5px solid rgba(255,255,255,${0.16 * (1 - p)})`}
        glow={`0 0 ${60 + p * 40}px ${T.accent2}${p > 0.5 ? "88" : "33"}`}
      >
        <div style={{ position: "absolute", left: 44, top: (h - PILL.h) / 2, height: PILL.h, display: "flex", alignItems: "center", gap: 26, opacity: 1 - seg(f, 106, 114) }}>
          <Mark src={T.logo!} size={62} />
          <span style={{ font: `500 46px ${BODY}`, color: T.ink, whiteSpace: "nowrap" }}>ditto.example/invite/•••••</span>
        </div>
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${w / BTN.w}, ${h / BTN.h})`, opacity: img }}>
          <Pic name="reg-btn" />
        </div>
      </Box>,
    );
  }
  // The page plane, anchored on the button, pulls back and tilts, then pushes back in.
  if (f >= 118) {
    const cam = keyedMany(
      [
        { f: 126, s: LIFT, ax: BTN_C.x, ay: BTN_C.y, rx: 0, ry: 0, rz: 0 },
        { f: 156, s: 1.12, ax: 820, ay: 430, rx: 16, ry: -14, rz: 2 },
        { f: 166, s: 1.14, ax: 830, ay: 425, rx: 13, ry: -11, rz: 1.5 },
        { f: 180, s: LIFT, ax: BTN_C.x, ay: BTN_C.y, rx: 0, ry: 0, rz: 0 },
      ],
      f,
    );
    const handIn = keyedMany(
      [
        { f: 136, x: 1560, y: 760 },
        { f: 158, x: BTN_C.x + 20, y: BTN_C.y + 8 },
      ],
      f,
      easeOut,
    );
    const press = f >= CLICK1 - 2 && f < CLICK1 + 3 ? 0.84 : 1;
    const doneP = seg(f, CLICK1, CLICK1 + 10);
    els.push(
      <Plane key="reg" name="reg-view" {...cam} opacity={seg(f, 118, 128) * (1 - seg(f, 184, 196))} blur={14 * seg(f, 172, 184)}>
        {f >= CLICK1 && (
          <div
            style={{
              position: "absolute",
              left: BTN.x,
              top: BTN.y - 2,
              width: BTN.w,
              height: BTN.h + 4,
              overflow: "hidden",
              borderRadius: 32,
              transform: `scale(${0.92 + 0.08 * backOut(doneP)})`,
            }}
          >
            <Pic name="reg-done" style={{ marginTop: -0.3 }} />
          </div>
        )}
        {f < CLICK1 && f >= CLICK1 - 3 && (
          <div style={{ position: "absolute", left: BTN.x, top: BTN.y, width: BTN.w, height: BTN.h, borderRadius: 32, background: "rgba(0,0,0,0.25)" }} />
        )}
        <Ring f={f} at={CLICK1} x={handIn.x - 20} y={handIn.y - 8} color={T.accent} size={120} />
        <Hand x={handIn.x - 20 * 0} y={handIn.y} size={64 / cam.s} press={press} opacity={seg(f, 136, 142) * (1 - seg(f, 168, 174))} />
      </Plane>,
    );
    const flash = f >= CLICK1 ? 1 - seg(f, CLICK1, CLICK1 + 10) : 0;
    if (flash > 0) els.push(<AbsoluteFill key="flash" style={{ background: `radial-gradient(circle at 50% 50%, ${T.accent2}55, transparent 60%)`, opacity: flash }} />);
  }
  return <>{els}</>;
}

// ---------- S3: lifted "You're registered" -> circle with a check + confetti (f178-240) ----------
const CIRCLE = 230;

function s3({ f, T }: Ctx) {
  if (f < 178 || f > 244) return null;
  const p = easeInOut(seg(f, 182, 198));
  const w = lerp(BTN.w * LIFT, CIRCLE, p);
  const h = lerp(BTN.h * LIFT, CIRCLE, p);
  const img = 1 - seg(f, 182, 190);
  const check = easeOut(seg(f, 190, 204));
  const pop = f >= 198 ? 1 + 0.08 * Math.sin(seg(f, 198, 210) * Math.PI) : 1;
  // Hand-off to S4: circle grows into the link card (drawn by s4 from f224).
  if (f >= 226) return null;
  const txt = easeOut(seg(f, 196, 206)) * (1 - seg(f, 216, 224));
  return (
    <>
      <Box
        x={CX - w / 2}
        y={CY - h / 2}
        w={w}
        h={h}
        r={h / 2}
        bg={`color-mix(in srgb, ${T.accent} ${p * 100}%, #2a1552)`}
        glow={`0 0 ${50 + p * 60}px ${p > 0.5 ? T.accent : T.accent2}77`}
        transform={`scale(${pop})`}
      >
        <div style={{ position: "absolute", left: 0, top: -1, transformOrigin: "0 0", transform: `scale(${w / BTN.w}, ${h / BTN.h})`, opacity: img }}>
          <div style={{ width: BTN.w, height: BTN.h + 2, overflow: "hidden" }}>
            <Pic name="reg-done" />
          </div>
        </div>
        {f >= 190 && (
          <svg width={w} height={h} viewBox="0 0 100 100" style={{ position: "absolute", left: 0, top: 0 }}>
            <path d="M28 52 L44 67 L73 36" fill="none" stroke={T.bg} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={80} strokeDashoffset={80 * (1 - check)} />
          </svg>
        )}
      </Box>
      <Confetti f={f} at={186} x={CX} y={CY} colors={[T.accent, T.accent2, T.ink, "#ffd166"]} />
      <div style={{ position: "absolute", left: 0, width: W, top: CY + 160 + (1 - txt) * 20, textAlign: "center", font: `600 64px ${DISPLAY}`, color: T.ink, opacity: txt, filter: `blur(${(1 - txt) * 12}px)` }}>
        You're in.
      </div>
    </>
  );
}

// ---------- S4: circle -> link card, copy, zoom to "Counting", flip (f222-302) ----------
const CARD = { w: 1124, h: 317.5, s: 1.35 };
const COPY = { x: 929.5, y: 101.5 };
const COUNTING = { x: 1062, y: 205 };
const CLICK2 = 258;

function s4({ f, T }: Ctx) {
  if (f < 222 || f > 304) return null;
  const morph = easeInOut(seg(f, 224, 242));
  // Card placement: focus point F (card px) sits at screen point P with scale S.
  const zoom = easeInOut(seg(f, 270, 292));
  const S = lerp(CARD.s, 2.5, zoom);
  const base = { x: CX - (CARD.w * CARD.s) / 2 + COUNTING.x * CARD.s, y: CY - (CARD.h * CARD.s) / 2 + COUNTING.y * CARD.s };
  const P = { x: lerp(base.x, 1180, zoom), y: lerp(base.y, 560, zoom) };
  const card = { x: P.x - COUNTING.x * S, y: P.y - COUNTING.y * S, w: CARD.w * S, h: CARD.h * S };
  const w = lerp(CIRCLE, card.w, morph);
  const h = lerp(CIRCLE, card.h, morph);
  const x = lerp(CX - CIRCLE / 2, card.x, morph);
  const y = lerp(CY - CIRCLE / 2, card.y, morph);
  const show = seg(f, 232, 244);
  const settle = seg(f, 240, 256);
  const rx = 5 * Math.sin(f * 0.07) * settle;
  const flip = easeIn(seg(f, 290, 301));
  const ry = -6 * Math.cos(f * 0.05) * settle - 90 * flip;
  const handP = easeOut(seg(f, 238, CLICK2 - 3));
  const hand = { x: lerp(1200, COPY.x + 6, handP), y: lerp(420, COPY.y + 8, handP) };
  const press = f >= CLICK2 - 2 && f < CLICK2 + 3 ? 0.84 : 1;
  const copied = f >= CLICK2 ? 1 - seg(f, CLICK2 + 6, CLICK2 + 24) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${x + w / 2}px ${y + h / 2}px`, transform: `perspective(2200px) rotateX(${rx}deg) rotateY(${ry}deg)` }}>
      <Box
        x={x}
        y={y}
        w={w}
        h={h}
        r={lerp(CIRCLE / 2, 16 * S, morph)}
        bg={`color-mix(in srgb, #0c0e14 ${morph * 100}%, ${T.accent})`}
        glow={`0 30px 100px rgba(0,0,0,0.6), 0 0 ${80 * (1 - morph) + 30}px ${T.accent}55`}
      >
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${w / CARD.w}, ${h / CARD.h})`, opacity: show }}>
          <Pic name="link-card" />
          {/* Hide the invite code: a blurred copy of the same image, clipped to the code. */}
          <div style={{ position: "absolute", inset: 0, clipPath: "inset(84px 488px 202px 262px round 6px)", filter: "blur(9px)" }}>
            <Pic name="link-card" />
          </div>
          <div style={{ position: "absolute", left: 897, top: 80, width: 66, height: 43, borderRadius: 22, boxShadow: `0 0 0 3px ${T.accent}, 0 0 30px ${T.accent}`, opacity: copied }} />
          <Ring f={f} at={CLICK2} x={COPY.x} y={COPY.y} color={T.accent} size={70} />
          <Hand x={hand.x} y={hand.y} size={64 / S} press={press} opacity={seg(f, 238, 244) * (1 - seg(f, 266, 272))} />
          <div
            style={{
              position: "absolute",
              left: 1010,
              top: 187,
              width: 110,
              height: 36,
              borderRadius: 18,
              boxShadow: `0 0 0 2px ${T.accent}, 0 0 24px ${T.accent}aa`,
              opacity: seg(f, 276, 284),
            }}
          />
        </div>
        {f < 236 && (
          <svg width={CIRCLE} height={CIRCLE} viewBox="0 0 100 100" style={{ position: "absolute", left: (w - CIRCLE) / 2, top: (h - CIRCLE) / 2, opacity: 1 - seg(f, 226, 234) }}>
            <path d="M28 52 L44 67 L73 36" fill="none" stroke={T.bg} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </Box>
    </div>
  );
}

// ---------- S5: swarm of counted trade rows (f296-352) ----------
const COUNTED = [1, 3, 4, 6, 7, 9];
const ROW = { w: 1070, h: 43 };
const ROWS = COUNTED.map((id, i) => {
  const r = rand(100 + i);
  return { id, i, y: 175 + i * 128, x0: [-260, 120, -420, 60, -180, 220][i], v: (i % 2 ? -1 : 1) * (1.4 + r() * 1.6), s: [1.75, 1.55, 1.85, 1.5, 1.8, 1.6][i] };
});
const rowRect = (row: (typeof ROWS)[number], f: number) => ({ x: row.x0 + row.v * (f - 298), y: row.y, w: ROW.w * row.s, h: ROW.h * row.s });

// Conveyor of prize chips (ladder chips at 2.2x).
const CHIPS = [0, 1, 2, 3, 4, 5, 11, 12, 13];
const CHIP = { w: 150, h: 64, s: 2.8, gap: 30 };
const CHIP_W = CHIP.w * CHIP.s;
const CHIP_H = CHIP.h * CHIP.s;
const CHIP_Y = CY - CHIP_H / 2 + 60;
const CONV_START = 200;
const CONV_SHIFT = CONV_START + CHIP_W / 2 + 8 * (CHIP_W + CHIP.gap) - CX;
const chipX = (k: number, shift: number) => CONV_START + k * (CHIP_W + CHIP.gap) - shift;

function s5({ f, T, at }: Ctx) {
  if (f < 296 || f > 354) return null;
  const countsAt = at("v3", "counts");
  return (
    <>
      {ROWS.map((row) => {
        const r = rowRect(row, f);
        const flipIn = easeOut(seg(f, 298 + row.i * 2, 312 + row.i * 2));
        // Hand-off: each row slides and shrinks into its chip slot.
        const m = easeInOut(seg(f, 338, 352));
        const cx = chipX(row.i, 0);
        const x = lerp(r.x, cx, m);
        const y = lerp(r.y, CHIP_Y, m);
        const w = lerp(r.w, CHIP_W, m);
        const h = lerp(r.h, CHIP_H, m);
        const glow = f >= countsAt + row.i * 2 ? 1 - seg(f, countsAt + row.i * 2 + 4, countsAt + row.i * 2 + 22) : 0;
        const far = (1.85 - row.s) * 6;
        return (
          <div key={row.id} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: `${x + w / 2}px ${y + h / 2}px`, transform: `perspective(1800px) rotateY(${90 * (1 - flipIn)}deg)`, opacity: flipIn }}>
            <Box x={x} y={y} w={w} h={h} r={lerp(10, 12 * CHIP.s, m)} bg="#0d0f17" glow="0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)" blur={far * (1 - m)}>
              <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${w / ROW.w}, ${h / ROW.h})`, opacity: 1 - seg(f, 340, 350) }}>
                <Pic name={`trade-${row.id}`} />
                <div style={{ position: "absolute", left: 764, top: 7, width: 84, height: 29, borderRadius: 8, boxShadow: `0 0 0 2px ${T.accent}, 0 0 22px ${T.accent}`, opacity: glow }} />
              </div>
              <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${w / CHIP.w}, ${h / CHIP.h})`, opacity: seg(f, 342, 352) }}>
                <Pic name={`chip-${CHIPS[row.i]}`} />
              </div>
            </Box>
          </div>
        );
      })}
    </>
  );
}

// ---------- S6: prize chip conveyor, "Top 600 traders get paid" (f352-446) ----------
const POOL = { s: 1.3, w: 1124, h: 191, fill: 0.151 };
const POOL_POS = { x: CX - (POOL.w * POOL.s) / 2, y: CY - (POOL.h * POOL.s) / 2 };
const TRACK = { x: POOL_POS.x + 27 * POOL.s, y: POOL_POS.y + 99.5 * POOL.s, w: (1097 - 27) * POOL.s, h: 9.5 * POOL.s };

function s6({ f, T, at }: Ctx) {
  if (f < 352 || f > 452) return null;
  const shiftP = easeInOut(seg(f, 352, at("v4", "traders")));
  const shift = CONV_SHIFT * shiftP;
  const prev = CONV_SHIFT * easeInOut(seg(f - 1, 352, at("v4", "traders")));
  const blur = speedBlur(shift - prev, 0, 0.05, 7);
  const emph = easeOut(seg(f, at("v4", "traders"), at("v4", "traders") + 12));
  const collapse = easeInOut(seg(f, 424, 446));
  const words: LineWord[] = [
    { text: "Top", at: at("v4", "top") },
    { text: "600", at: at("v4", "six"), color: T.accent },
    { text: "traders", at: at("v4", "traders") },
    { text: "get", at: at("v4", "get") },
    { text: "paid.", at: at("v4", "paid"), color: T.accent },
  ];
  const line = wordLine(f, words, `600 100px ${DISPLAY}`, CX, 300, T.ink);
  const lineOut = seg(f, 418, 430);
  return (
    <>
      <div style={{ opacity: 1 - lineOut, filter: lineOut > 0 ? `blur(${lineOut * 16}px)` : undefined }}>{line.els}</div>
      {CHIPS.map((c, k) => {
        const x = chipX(k, shift);
        if (x > W + 40 || x + CHIP_W < -40) return null;
        const hero = k === CHIPS.length - 1;
        const sc = hero ? 1 + 0.25 * emph : 1;
        let bx = x - (CHIP_W * (sc - 1)) / 2;
        let by = CHIP_Y - (CHIP_H * (sc - 1)) / 2;
        let bw = CHIP_W * sc;
        let bh = CHIP_H * sc;
        let op = hero ? 1 : 1 - 0.65 * emph;
        if (hero) {
          // Hand-off to S7: the $10 chip squeezes into the pool bar's track.
          bx = lerp(bx, TRACK.x, collapse);
          by = lerp(by, TRACK.y, collapse);
          bw = lerp(bw, TRACK.w, collapse);
          bh = lerp(bh, TRACK.h, collapse);
        } else {
          op *= 1 - seg(f, 422, 432);
        }
        return (
          <Box
            key={c}
            x={bx}
            y={by}
            w={bw}
            h={bh}
            r={lerp(12 * CHIP.s * sc, TRACK.h / 2, hero ? collapse : 0)}
            bg={hero ? `color-mix(in srgb, rgb(31,31,40) ${collapse * 100}%, #0b0b10)` : "#0b0b10"}
            glow={hero ? `0 0 ${60 * emph * (1 - collapse)}px ${T.accent}88, 0 0 0 ${2 * emph * (1 - collapse)}px ${T.accent}` : "0 20px 50px rgba(0,0,0,0.5)"}
            opacity={op}
            blur={blur}
          >
            <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${bw / CHIP.w}, ${bh / CHIP.h})`, opacity: 1 - seg(f, 424, 434) }}>
              <Pic name={`chip-${c}`} />
            </div>
          </Box>
        );
      })}
    </>
  );
}

// ---------- S7: the pool fills to 15.1% with the amount on its head; real pool card (f446-545) ----------
function s7({ f, T, at }: Ctx) {
  if (f < 444 || f > 548) return null;
  const fillA = at("v5", "unlocks");
  const fillB = at("v5", "grows") + 10;
  const p = easeInOut(seg(f, fillA, fillB));
  const fillW = TRACK.w * POOL.fill * p;
  const card = seg(f, fillB + 4, fillB + 16);
  const font = `600 110px ${DISPLAY}`;
  const tw = measure("$7,564", font);
  const head = TRACK.x + fillW;
  const numOut = seg(f, fillB - 2, fillB + 6);
  const lab = seg(f, 446, 458) * (1 - numOut);
  // Whip out (hand-off to S8).
  const whip = easeIn(seg(f, 528, 540));
  const dx = -2200 * whip;
  const blur = 30 * whip;
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateX(${dx}px)`, filter: blur > 0.1 ? `blur(${blur}px)` : undefined }}>
      <div style={{ position: "absolute", left: POOL_POS.x, top: POOL_POS.y, transformOrigin: "0 0", transform: `scale(${POOL.s})`, opacity: card, borderRadius: 16, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.6)" }}>
        <Pic name="pool" />
      </div>
      {card < 1 && (
        <>
          <Box x={TRACK.x} y={TRACK.y} w={TRACK.w} h={TRACK.h} r={TRACK.h / 2} bg="rgb(31,31,40)" opacity={1 - card} />
          <Box x={TRACK.x} y={TRACK.y} w={Math.max(fillW, 0.001)} h={TRACK.h} r={TRACK.h / 2} bg={T.accent} glow={`0 0 30px ${T.accent}`} opacity={1 - card} />
          <div style={{ position: "absolute", left: Math.max(TRACK.x, head - tw), top: TRACK.y - 150, font, color: T.ink, whiteSpace: "nowrap", opacity: seg(f, fillA - 6, fillA) * (1 - numOut), filter: numOut > 0 ? `blur(${numOut * 12}px)` : undefined }}>
            {money(7564 * p)}
          </div>
          <div style={{ position: "absolute", left: TRACK.x, top: TRACK.y + 44, font: `500 30px ${BODY}`, color: T.muted, letterSpacing: 2, opacity: lab }}>
            UNLOCKED AS VOLUME GROWS
          </div>
        </>
      )}
    </div>
  );
}

// ---------- S8: whip to the tilted leaderboard; the "You" row lifts (f530-652) ----------
const YOU = { x: 305, y: 1889.7 - 1400, w: 612.4, h: 48.5 };
const YOU_C = { x: YOU.x + YOU.w / 2, y: YOU.y + YOU.h / 2 };
const ROW_LIFT = 2.2;

function s8({ f, T, at }: Ctx) {
  if (f < 530 || f > 660) return null;
  const standAt = at("v6", "where");
  const flat = standAt + 14;
  const enter = easeOut(seg(f, 532, 550));
  const cam = keyedMany(
    [
      { f: 540, s: 1.08, ax: 720, ay: 470, rx: 18, ry: 20, rz: -3 },
      { f: standAt, s: 1.14, ax: 700, ay: 480, rx: 11, ry: 12, rz: -2 },
      { f: flat, s: ROW_LIFT, ax: YOU_C.x, ay: YOU_C.y, rx: 0, ry: 0, rz: 0 },
    ],
    f,
  );
  const handP = easeOut(seg(f, 556, standAt - 3));
  const hand = { x: lerp(1150, YOU_C.x + 60, handP), y: lerp(820, YOU_C.y + 6, handP) };
  const press = f >= standAt - 2 && f < standAt + 3 ? 0.84 : 1;
  const lifted = f >= flat;
  const lift = easeOut(seg(f, flat, flat + 12));
  const away = easeInOut(seg(f, 636, 656));
  const rowS = lerp(ROW_LIFT + 0.25 * lift, 0.5, away);
  return (
    <>
      {f < 648 && (
        <Plane name="live-board-view" {...cam} dx={2200 * (1 - enter)} blur={30 * (1 - enter) + 10 * easeInOut(seg(f, flat - 10, flat + 10))} opacity={1 - 0.45 * lift - 0.55 * seg(f, 632, 646)}>
          <Ring f={f} at={standAt} x={hand.x} y={hand.y} color={T.accent} size={80} />
          <Hand x={hand.x} y={hand.y} size={64 / cam.s} press={press} opacity={seg(f, 556, 562) * (1 - seg(f, standAt + 6, standAt + 12))} />
        </Plane>
      )}
      {lifted && (
        <div
          style={{
            position: "absolute",
            left: CX - YOU.w / 2,
            top: CY - YOU.h / 2,
            transform: `scale(${rowS})`,
            opacity: 1 - seg(f, 644, 656),
            filter: away > 0 ? `blur(${away * 10}px)` : undefined,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: `0 ${20 * lift}px ${60 * lift}px rgba(0,0,0,0.7), 0 0 ${40 * lift}px ${T.accent2}88, 0 0 0 ${1.5 * lift}px ${T.accent2}`,
          }}
        >
          <Pic name="board-you" />
        </div>
      )}
      {lifted && (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: W,
            top: CY + 110 + (1 - lift) * 20,
            textAlign: "center",
            font: `500 34px ${BODY}`,
            color: T.muted,
            letterSpacing: 2,
            opacity: lift * (1 - away),
          }}
        >
          RANK <span style={{ color: T.accent, fontWeight: 700 }}>#8</span> · $184K VOLUME · $121 PRIZE
        </div>
      )}
    </>
  );
}

// ---------- S9: phones fly in from the corners; "Even on your phone." (f638-750) ----------
const PHONES = [1, 2, 3, 4];
const PH = { w: 390, h: 844, s: 0.74 };

function phonesGroup({ f, T, at }: Ctx, dive: number) {
  const push = lerp(1, 1.1, easeInOut(seg(f, 664, 726)));
  const scale = push * lerp(1, 5, easeIn(dive));
  return (
    <div style={{ position: "absolute", inset: 0, transformOrigin: `${CX}px ${CY + 60}px`, transform: `scale(${scale})`, opacity: 1 - seg(dive, 0.5, 1), filter: dive > 0 ? `blur(${dive * 20}px)` : undefined }}>
      {PHONES.map((id, i) => {
        const p = easeOut(seg(f, 640 + i * 3, 664 + i * 3));
        const from = [
          { x: -500, y: -600 },
          { x: -400, y: 1700 },
          { x: 2400, y: -600 },
          { x: 2300, y: 1700 },
        ][i];
        const to = { x: 390 + i * 380, y: CY + 60 };
        const x = lerp(from.x, to.x, p);
        const y = lerp(from.y, to.y, p);
        const prevP = easeOut(seg(f - 1, 640 + i * 3, 664 + i * 3));
        const v = Math.hypot((to.x - from.x) * (p - prevP), (to.y - from.y) * (p - prevP));
        const ry = [30, 11, -11, -30][i];
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: x - (PH.w * PH.s) / 2,
              top: y - (PH.h * PH.s) / 2,
              width: PH.w * PH.s,
              height: PH.h * PH.s,
              borderRadius: 44,
              overflow: "hidden",
              border: "7px solid #1d1a26",
              boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)",
              transform: `perspective(1600px) rotateY(${ry}deg) rotateZ(${(1 - p) * (i % 2 ? -25 : 25)}deg)`,
              filter: v > 1 ? `blur(${Math.min(16, v * 0.08)}px)` : undefined,
              opacity: seg(f, 640 + i * 3, 646 + i * 3),
            }}
          >
            <Pic name={`phone-${id}`} style={{ width: PH.w * PH.s - 14, height: PH.h * PH.s - 14 }} />
          </div>
        );
      })}
    </div>
  );
}

function s9(c: Ctx) {
  const { f, T, at } = c;
  if (f < 638 || f > 760) return null;
  const dive = seg(f, 724, 746);
  const words: LineWord[] = [
    { text: "Even", at: at("v7", "Even") },
    { text: "on", at: at("v7", "on") },
    { text: "your", at: at("v7", "your") },
    { text: "phone.", at: at("v7", "phone"), color: T.accent },
  ];
  const line = wordLine(f, words, `600 84px ${DISPLAY}`, CX, 120, T.ink);
  const out = seg(f, 718, 730);
  return (
    <>
      {phonesGroup(c, dive)}
      <div style={{ opacity: 1 - out, filter: out > 0 ? `blur(${out * 14}px)` : undefined }}>{line.els}</div>
    </>
  );
}

// ---------- S10 + S11: closing line with the Ditto mark as text cursor; the mark becomes the logo (f740-990) ----------
function s10({ f, T, at, props }: Ctx) {
  if (f < 740) return null;
  const words: LineWord[] = [
    { text: "Trade", at: at("v8", "Trade") },
    { text: "on", at: at("v8", "on") },
    { text: "Ditto.", at: at("v8", "Ditto"), color: T.accent },
    { text: "Climb", at: at("v8", "Climb") },
    { text: "the", at: at("v8", "the") },
    { text: "board.", at: at("v8", "board") },
    { text: "Get", at: at("v8", "Get") },
    { text: "paid.", at: at("v8", "paid"), color: T.accent },
  ];
  // Fit the full sentence (plus the mark) inside 1640 px.
  const full = measure(words.map((w) => w.text).join(" "), `600 100px ${DISPLAY}`);
  const size = Math.min(100, Math.floor((100 * 1560) / full));
  const line = wordLine(f, words, `600 ${size}px ${DISPLAY}`, CX - 40, CY + 30, T.ink);
  const END = 838;
  const out = easeInOut(seg(f, END, END + 14));
  const markIn = seg(f, 742, 750);
  // Mark: text cursor right of the line, then the logo in the centre.
  const cur = { x: line.end + 22, y: CY + 30 - size * 0.72, size: size * 0.7 };
  const logo = { x: CX - 105, y: CY - 250, size: 210 };
  const grow = backOut(seg(f, END + 2, END + 18));
  const mx = lerp(cur.x, logo.x, easeInOut(seg(f, END, END + 16)));
  const my = lerp(cur.y, logo.y, easeInOut(seg(f, END, END + 16)));
  const ms = lerp(cur.size, logo.size, grow);
  const blink = f < END ? 0.75 + 0.25 * Math.cos(f * 0.35) : 1;
  const flash = f >= END + 4 ? 1 - seg(f, END + 4, END + 18) : 0;
  const hero = seg(f, END + 2, END + 20);
  const push = lerp(1, 1.06, seg(f, END, 990));
  const title = easeOut(seg(f, END + 16, END + 28));
  const sub = "$50,000 · 4 weeks · on Zaps";
  const typed = Math.floor(sub.length * seg(f, END + 36, END + 66));
  return (
    <>
      {hero > 0 && (
        <AbsoluteFill style={{ opacity: 0.28 * hero }}>
          <Img src={staticFile(T.hero!)} style={{ width: W, height: H, objectFit: "cover", filter: "blur(8px)", transform: `translateX(520px) scale(${lerp(1.25, 1.12, easeOut(seg(f, END, 990)))})` }} />
          <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 20%, ${T.bg} 85%)` }} />
        </AbsoluteFill>
      )}
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${CX}px ${CY}px`, transform: `scale(${push})` }}>
        {out < 1 && <div style={{ opacity: 1 - out, filter: out > 0 ? `blur(${out * 20}px)` : undefined }}>{line.els}</div>}
        <div style={{ position: "absolute", left: mx, top: my, opacity: markIn * blink, filter: `drop-shadow(0 0 ${20 + 30 * grow}px ${T.accent}88)` }}>
          <Mark src={T.logo!} size={ms} />
        </div>
        <div style={{ position: "absolute", left: 0, width: W, top: CY + 10 + (1 - title) * 24, textAlign: "center", font: `600 96px ${DISPLAY}`, color: T.ink, opacity: title, filter: title < 1 ? `blur(${(1 - title) * 14}px)` : undefined }}>
          Ditto Trading Competition
        </div>
        <div style={{ position: "absolute", left: 0, width: W, top: CY + 140, textAlign: "center", font: `500 50px ${BODY}`, color: T.muted, whiteSpace: "pre" }}>
          {sub.slice(0, typed)}
          <span style={{ opacity: typed > 0 && typed < sub.length ? 1 : 0, color: T.accent }}>|</span>
        </div>
      </div>
      {flash > 0 && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 35%, ${T.accent}66, transparent 60%)`, opacity: flash }} />}
    </>
  );
}

const SFX: [string, number][] = [
  ["whoosh", 104],
  ["whoosh", 222],
  ["whoosh", 290],
  ["whoosh", 336],
  ["whoosh", 526],
  ["whoosh", 638],
  ["whoosh", 722],
  ["click", CLICK1],
  ["click", CLICK2],
  ["pop", CLICK1 + 3],
  ["sparkle", 186],
  ["chime", 196],
  ["pop", 244],
];

export const DittoV3: React.FC<FilmProps> = (props) => {
  // Scenes are written in choreography frames; `pace` stretches them into output frames.
  const pace = props.pace ?? 1;
  const f = useCurrentFrame() / pace;
  const T = props.theme;
  const ready = useFilmFonts(T);
  const at = (id: string, word: string, nth = 0) => {
    const v = props.vo[id];
    const hits = v.words.filter((w) => w.w.toLowerCase() === word.toLowerCase());
    if (!hits[nth]) throw new Error(`${id}: no word "${word}"`);
    // The voice plays at natural speed, so its words land t0 seconds after its (stretched) start.
    return v.at + (hits[nth].t0 * 30) / pace;
  };
  const c: Ctx = { f, T, at, props };
  return (
    <ShotsCtx.Provider value={props.shots}>
      <AbsoluteFill style={{ background: T.bg, overflow: "hidden" }}>
        <Background theme={T} />
        {ready && (
          <>
            {s1(c)}
            {s2(c)}
            {s3(c)}
            {s4(c)}
            {s5(c)}
            {s6(c)}
            {s7(c)}
            {s8(c)}
            {s9(c)}
            {s10(c)}
          </>
        )}
        <Audio src={staticFile(props.music.bed)} volume={0.55} />
        {Object.entries(props.vo).map(([id, v]) => (
          <Sequence key={id} from={Math.round(v.at * pace)} durationInFrames={Math.ceil((v.ms / 1000) * 30) + 6}>
            <Audio src={staticFile(v.src)} />
          </Sequence>
        ))}
        {SFX.map(([name, fr], i) => (
          <Sequence key={i} from={Math.round(fr * pace)} durationInFrames={90}>
            <Audio src={staticFile(props.music.sfx[name])} volume={0.5} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </ShotsCtx.Provider>
  );
};

