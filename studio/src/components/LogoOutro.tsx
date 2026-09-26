import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../types";

/** Four-point sparkle, the brand mark placeholder until a real logo is supplied. */
export const Sparkle: React.FC<{ size: number; theme: Theme }> = ({ size, theme }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id="sparkle" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={theme.accent2} />
        <stop offset="1" stopColor={theme.accent} />
      </linearGradient>
    </defs>
    <path d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z" fill="url(#sparkle)" />
  </svg>
);

/** Closing card: the mark spins in, the brand name slides out from behind it, the URL fades up. */
export const LogoOutro: React.FC<{ theme: Theme }> = ({ theme }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 12, mass: 0.7 } });
  const name = spring({ frame: f - 10, fps, config: { damping: 20 } });
  const url = interpolate(f, [26, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <div style={{ transform: `scale(${pop}) rotate(${(1 - pop) * -120}deg)` }}>
          <Sparkle size={110} theme={theme} />
        </div>
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              fontSize: 112,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              color: theme.ink,
              transform: `translateX(${(1 - name) * -60}px)`,
              opacity: name,
            }}
          >
            {theme.brand}
          </div>
        </div>
      </div>
      {theme.url ? (
        <div style={{ position: "absolute", bottom: 120, fontSize: 30, color: theme.muted, opacity: url, letterSpacing: "0.02em" }}>
          {theme.url}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
