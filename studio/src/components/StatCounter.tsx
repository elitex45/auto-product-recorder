import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts } from "../fonts";
import { VO_DELAY } from "../timing";
import type { SpokenWord, StatScene, Theme } from "../types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * A big number that counts up while the voice says it: it starts on the first spoken word,
 * lands on the last, then glows. The label rises in under it.
 */
export const StatCounter: React.FC<{ scene: StatScene; words?: SpokenWord[]; theme: Theme }> = ({ scene, words, theme }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: d } = useVideoConfig();
  const start = words?.length ? VO_DELAY + words[0].t0 * fps : VO_DELAY;
  const end = words?.length ? VO_DELAY + words[words.length - 1].t1 * fps : Math.min(d - 10, start + 1.5 * fps);
  const p = interpolate(f, [start - 4, end], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const value = Math.round(scene.value * p).toLocaleString("en-US");
  const pop = spring({ frame: f - 2, fps, config: { damping: 14, mass: 0.8 } });
  const landed = spring({ frame: f - end, fps, config: { damping: 9, mass: 0.6 } });
  const label = spring({ frame: f - end + 4, fps, config: { damping: 18 } });
  const { display, body } = fonts(theme);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${theme.accent}33, transparent)`,
          transform: `scale(${0.6 + p * 0.5 + landed * 0.1})`,
        }}
      />
      <div
        style={{
          fontFamily: display,
          fontSize: 260,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          color: theme.ink,
          opacity: pop,
          // a small bump when the count lands
          transform: `scale(${0.8 + pop * 0.2 + Math.sin(Math.min(1, landed) * Math.PI) * 0.05})`,
          textShadow: `0 0 ${30 + landed * 70}px ${theme.accent}66`,
        }}
      >
        <span style={{ color: theme.accent }}>{scene.prefix}</span>
        {value}
        {scene.suffix}
      </div>
      {scene.label ? (
        <div
          style={{
            marginTop: 30,
            fontFamily: body,
            fontSize: 40,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: theme.muted,
            opacity: label,
            transform: `translateY(${(1 - label) * 30}px)`,
          }}
        >
          {scene.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
