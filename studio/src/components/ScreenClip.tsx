import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Mark, ScreenScene, Stage, Theme } from "../types";
import { WIDTH, HEIGHT } from "../timing";
import { Cursor, type Click } from "./Cursor";
import { Phrase } from "./KineticText";

const CHROME = 46; // browser toolbar height on desktop windows
const MOVE = 26; // frames a camera move takes
const PUSH = 0.06; // slow push-in across the whole scene, so the picture never sits still
const ease = Easing.bezier(0.65, 0, 0.35, 1);

type Cam = { z: number; x: number; y: number }; // zoom, and the content point at the window centre

/**
 * A slice of a recorded stage inside a floating window (browser on desktop, phone bezel on mobile).
 * The camera eases in to each `focus` mark and the cursor glides to each `clicks` mark.
 */
export const ScreenClip: React.FC<{ scene: ScreenScene; stage: Stage; from: number; to: number; theme: Theme }> = ({
  scene,
  stage,
  from,
  to,
  theme,
}) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const vp = stage.viewport;
  const phone = vp.width < vp.height;

  // Where the page sits inside the 1920x1080 stage video (phones are letterboxed).
  const s0 = Math.min(WIDTH / vp.width, HEIGHT / vp.height);
  const src = { x: (WIDTH - vp.width * s0) / 2, y: (HEIGHT - vp.height * s0) / 2, w: vp.width * s0 };

  // Window size on our canvas.
  const titleSpace = scene.title ? 90 : 0;
  const maxH = HEIGHT - 170 - titleSpace - (phone ? 0 : CHROME);
  const w = phone ? (maxH * vp.width) / vp.height : Math.min(1500, (maxH * vp.width) / vp.height);
  const h = (w * vp.height) / vp.width;
  const k = w / src.w; // stage-video px -> window px
  const css = w / vp.width; // page CSS px -> window px

  const markById = (id: string): Mark => {
    const m = stage.marks.find((x) => x.id === id);
    if (!m) throw new Error(`edit.json: stage "${scene.stage}" has no mark "${id}" (add rec.mark("${id}", ...) to the spec)`);
    return m;
  };
  const frameOf = (ms: number) => (ms / 1000 - from) * fps;

  // Camera keyframes: base view, then each focus, returning to base after `until`.
  const base: Cam = { z: 1, x: w / 2, y: h / 2 };
  const keys: { at: number; cam: Cam }[] = [{ at: 0, cam: base }];
  (scene.focus ?? []).forEach((fc) => {
    const m = markById(fc.mark);
    const z = fc.scale ?? 1.6;
    const cx = (m.box.x + m.box.width / 2) * css;
    const cy = (m.box.y + m.box.height / 2) * css;
    // Keep the zoomed view inside the page.
    const clampTo = (v: number, size: number) => Math.min(Math.max(v, size / (2 * z)), size - size / (2 * z));
    keys.push({ at: frameOf(m.t) - (fc.lead ?? 0.5) * fps, cam: { z, x: clampTo(cx, w), y: clampTo(cy, h) } });
    if (fc.until !== undefined) keys.push({ at: (fc.until - from) * fps, cam: base });
  });
  keys.sort((a, b) => a.at - b.at);
  const focused = camAt(keys, f);
  const cam = { ...focused, z: focused.z * (1 + (PUSH * f) / durationInFrames) };

  // Cursor path in window px.
  const clicks: Click[] = (scene.clicks ?? []).map((id) => {
    const m = markById(id);
    return { at: frameOf(m.t), x: (m.box.x + Math.min(m.box.width / 2, 60)) * css, y: (m.box.y + m.box.height / 2) * css };
  });

  // Entrance: the window rises and un-tilts; then it floats very slightly.
  const rise = spring({ frame: f, fps, config: { damping: 18, mass: 0.9 } });
  const rotX = interpolate(rise, [0, 1], [22, 0]) + Math.sin(f / 50) * 0.8;
  const rotY = interpolate(rise, [0, 1], [-10, 0]) + Math.cos(f / 60) * 0.8;
  const lift = interpolate(rise, [0, 1], [120, 0]);

  const frameStyle: React.CSSProperties = phone
    ? { borderRadius: 54, padding: 14, background: "#0d0f14", boxShadow: shadow(theme) }
    : { borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: shadow(theme) };

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 2400 }}>
      {scene.title ? (
        <div style={{ position: "absolute", top: 70 }}>
          <Phrase text={scene.title} theme={theme} size={56} />
        </div>
      ) : null}
      <div
        style={{
          ...frameStyle,
          marginTop: titleSpace,
          transform: `translateY(${lift}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        }}
      >
        {phone ? null : <BrowserBar width={w} />}
        <div style={{ position: "relative", width: w, height: h, overflow: "hidden", borderRadius: phone ? 42 : 0 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transformOrigin: "0 0",
              transform: `translate(${w / 2 - cam.x * cam.z}px, ${h / 2 - cam.y * cam.z}px) scale(${cam.z})`,
            }}
          >
            <div style={{ position: "relative", width: w, height: h, overflow: "hidden" }}>
              <OffthreadVideo
                src={staticFile(stage.src)}
                trimBefore={Math.round(from * fps)}
                trimAfter={Math.round(to * fps)}
                style={{
                  position: "absolute",
                  left: -src.x * k,
                  top: -src.y * k,
                  width: WIDTH * k,
                  height: HEIGHT * k,
                  maxWidth: "none",
                }}
              />
            </div>
            <Cursor clicks={clicks} zoom={cam.z} touch={phone} theme={theme} start={{ x: w * 0.78, y: h * 1.05 }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Camera state at frame f. Each keyframe eases from wherever the camera was when it began;
 * a move cut short by the next keyframe hands over from its state at that moment.
 */
function camAt(keys: { at: number; cam: Cam }[], f: number): Cam {
  let cur = keys[0].cam;
  for (let i = 1; i < keys.length && f >= keys[i].at; i++) {
    const stop = i + 1 < keys.length ? Math.min(f, keys[i + 1].at) : f;
    cur = mix(cur, keys[i].cam, ease(Math.min(1, (stop - keys[i].at) / MOVE)));
  }
  return cur;
}

const mix = (a: Cam, b: Cam, p: number): Cam => ({
  z: a.z + (b.z - a.z) * p,
  x: a.x + (b.x - a.x) * p,
  y: a.y + (b.y - a.y) * p,
});

const shadow = (theme: Theme) =>
  `0 60px 120px -30px ${theme.accent}40, 0 30px 60px -30px rgba(10,20,40,0.35), 0 0 0 1px rgba(10,20,40,0.06)`;

const BrowserBar: React.FC<{ width: number }> = ({ width }) => (
  <div
    style={{
      width,
      height: CHROME,
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "0 18px",
      background: "#f3f4f7",
      borderBottom: "1px solid #e4e6eb",
      boxSizing: "border-box",
    }}
  >
    {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
      <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
    ))}
    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
      <div style={{ width: Math.min(560, width * 0.4), height: 26, borderRadius: 8, background: "#e6e8ee" }} />
    </div>
    <div style={{ width: 57 }} />
  </div>
);
