import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../types";

const STAGGER = 5; // frames between words
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * One phrase, word by word: each word rises out of a blur in the accent colour,
 * then settles to ink. The newest word stays accent, like the reference.
 */
export const Phrase: React.FC<{ text: string; theme: Theme; size?: number; settle?: boolean }> = ({
  text,
  theme,
  size = 120,
  settle = true,
}) => {
  const f = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.28}px`, maxWidth: 1600 }}>
      {words.map((w, i) => {
        const at = i * STAGGER;
        const p = interpolate(f, [at, at + 12], [0, 1], clamp);
        const isLast = i === words.length - 1;
        const color =
          settle && !isLast
            ? interpolateColors(f, [at + 14, at + 26], [theme.accent, theme.ink])
            : theme.accent;
        return (
          <span
            key={i}
            style={{
              fontSize: size,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color,
              opacity: p,
              filter: `blur(${(1 - p) * 16}px)`,
              transform: `translateY(${(1 - p) * 30}px) scale(${0.92 + p * 0.08})`,
              display: "inline-block",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** A kinetic scene: phrases one after another, each owning an equal slice of the scene. */
export const KineticText: React.FC<{ phrases: string[]; theme: Theme }> = ({ phrases, theme }) => {
  const { durationInFrames } = useVideoConfig();
  const slice = Math.floor(durationInFrames / phrases.length);
  return (
    <AbsoluteFill>
      {phrases.map((text, i) => {
        const last = i === phrases.length - 1;
        return (
          <Sequence key={i} from={i * slice} durationInFrames={last ? durationInFrames - i * slice : slice}>
            <PhraseSlot text={text} theme={theme} fadeOut={!last} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Centres a phrase; all but the last blur out over their final 8 frames. */
const PhraseSlot: React.FC<{ text: string; theme: Theme; fadeOut: boolean }> = ({ text, theme, fadeOut }) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const out = fadeOut ? interpolate(f, [d - 8, d], [1, 0], clamp) : 1;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: out, filter: `blur(${(1 - out) * 12}px)` }}>
        <Phrase text={text} theme={theme} />
      </div>
    </AbsoluteFill>
  );
};
