import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Theme } from "../types";

/** Soft light background with two slow-drifting brand-colour glows. */
export const Background: React.FC<{ theme: Theme }> = ({ theme }) => {
  const f = useCurrentFrame();
  const drift = (speed: number, amp: number) => Math.sin(f * speed) * amp;
  const glow = (color: string, x: number, y: number, size: number, opacity: number): React.CSSProperties => ({
    position: "absolute",
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
    borderRadius: "50%",
    background: color,
    opacity,
    filter: "blur(160px)",
  });
  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      <div style={glow(theme.accent, 420 + drift(0.011, 80), 260 + drift(0.017, 40), 900, 0.14)} />
      <div style={glow(theme.accent2, 1540 + drift(0.013, 70), 860 + drift(0.009, 50), 1000, 0.12)} />
    </AbsoluteFill>
  );
};
