import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { Theme } from "../types";

/** A click (or tap) the cursor performs: frame, and where in window px. */
export type Click = { at: number; x: number; y: number };

const TRAVEL = 20; // frames to glide to the next click
const RING = 16; // frames the click ring expands
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Headless recordings have no mouse pointer, so the studio draws one: it glides in,
 * arrives just before each click, dips, and leaves a ring. `touch` draws a finger dot instead.
 * Lives inside the zoomed layer, so it counter-scales by `zoom` to keep a constant size.
 */
export const Cursor: React.FC<{ clicks: Click[]; zoom: number; touch: boolean; theme: Theme; start: { x: number; y: number } }> = ({
  clicks,
  zoom,
  touch,
  theme,
  start,
}) => {
  const f = useCurrentFrame();
  if (!clicks.length) return null;

  // Position: glide from the previous point to each click, arriving 3 frames early.
  let pos = start;
  for (const c of clicks) {
    const arrive = c.at - 3;
    const p = ease(interpolate(f, [arrive - TRAVEL, arrive], [0, 1], clamp));
    pos = { x: pos.x + (c.x - pos.x) * p, y: pos.y + (c.y - pos.y) * p };
    if (f < arrive) break;
  }
  const appear = interpolate(f, [clicks[0].at - TRAVEL - 12, clicks[0].at - TRAVEL], [0, 1], clamp);
  const last = clicks[clicks.length - 1].at;
  const leave = interpolate(f, [last + 30, last + 42], [1, 0], clamp);
  const press = clicks.some((c) => f >= c.at && f < c.at + 5) ? 0.85 : 1;

  const s = 1 / zoom;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {clicks.map((c, i) => {
        const r = interpolate(f, [c.at, c.at + RING], [0, 1], clamp);
        if (f < c.at || r >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              width: 70,
              height: 70,
              marginLeft: -35,
              marginTop: -35,
              borderRadius: "50%",
              border: `3px solid ${theme.accent}`,
              opacity: 0.7 * (1 - r),
              transform: `scale(${(0.3 + r * 1.2) * s})`,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          opacity: appear * leave,
          transformOrigin: "0 0",
          transform: `scale(${s * press})`,
        }}
      >
        {touch ? (
          <div
            style={{
              width: 56,
              height: 56,
              marginLeft: -28,
              marginTop: -28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.55)",
              border: "2px solid rgba(20,30,50,0.25)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
            }}
          />
        ) : (
          <svg width="34" height="40" viewBox="0 0 34 40" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>
            <path d="M2 2 L2 32 L10 25 L16 38 L22 35 L16 23 L27 23 Z" fill="#111" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
};
