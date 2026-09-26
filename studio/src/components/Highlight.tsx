import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts } from "../fonts";
import type { Theme } from "../types";

const PAD = 10; // px of breathing room around the element

/**
 * A glowing outline that draws itself around a box (window px), then breathes; an optional
 * label pops above it. Lives inside the zoomed layer, so strokes and text counter-scale by `zoom`.
 */
export const Highlight: React.FC<{
  box: { x: number; y: number; w: number; h: number };
  at: number;
  /** Frames it stays, including a short fade-out at the end. */
  length: number;
  label?: string;
  zoom: number;
  theme: Theme;
}> = ({ box, at, length, label, zoom, theme }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < at || f > at + length) return null;
  const out = interpolate(f, [at + length - 8, at + length], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = 1 / zoom;
  const x = box.x - PAD;
  const y = box.y - PAD;
  const w = box.w + PAD * 2;
  const h = box.h + PAD * 2;
  const draw = interpolate(f, [at, at + 18], [0, 1], { extrapolateRight: "clamp" });
  const breathe = 0.75 + 0.25 * Math.sin((f - at) / 9);
  const perimeter = 2 * (w + h);
  const pop = spring({ frame: f - at - 10, fps, config: { damping: 13, mass: 0.7 } });
  return (
    <div style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity: out }}>
      <svg
        style={{ position: "absolute", left: x, top: y, overflow: "visible", filter: `drop-shadow(0 0 ${14 * s}px ${theme.accent})` }}
        width={w}
        height={h}
      >
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={14}
          fill={`${theme.accent}14`}
          stroke={theme.accent}
          strokeWidth={3 * s}
          strokeDasharray={perimeter}
          strokeDashoffset={perimeter * (1 - draw)}
          opacity={draw < 1 ? 1 : breathe}
        />
      </svg>
      {label ? (
        <div
          style={{
            position: "absolute",
            left: x,
            top: y,
            transformOrigin: "0 100%",
            transform: `translateY(-100%) translateY(${-10 * s}px) scale(${s * pop})`,
            fontFamily: fonts(theme).body,
            fontSize: 26,
            fontWeight: 600,
            whiteSpace: "nowrap",
            padding: "8px 18px",
            borderRadius: 999,
            background: theme.accent,
            color: theme.bg,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
