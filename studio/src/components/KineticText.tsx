import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { VO_DELAY } from "../timing";
import type { SpokenWord, Theme } from "../types";

const RISE = 9; // frames a word takes to rise out of the blur
const LEAD = 3; // start rising this many frames before the word is spoken, so it is sharp on the sound
const STAGGER = 5; // fallback spacing when there is no word timing
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * One phrase, word by word: each word rises out of a blur in the accent colour at its frame
 * in `at`, then settles to ink. The phrase's last word stays accent, like the reference.
 */
export const Phrase: React.FC<{ text: string; theme: Theme; size?: number; at?: number[] }> = ({ text, theme, size = 120, at }) => {
  const f = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.28}px`, maxWidth: 1600 }}>
      {words.map((w, i) => {
        const start = at ? at[i] : i * STAGGER;
        const p = interpolate(f, [start, start + RISE], [0, 1], clamp);
        const color =
          i < words.length - 1 ? interpolateColors(f, [start + RISE + 4, start + RISE + 16], [theme.accent, theme.ink]) : theme.accent;
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

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Scene frame at which each phrase word is spoken. Phrase words must appear in the clip in
 * order (skipping is fine); anything else is a script error, so it throws instead of guessing.
 */
export function spokenFrames(phrases: string[], words: SpokenWord[], fps: number): number[][] {
  let k = 0;
  return phrases.map((phrase) =>
    phrase
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => {
        while (k < words.length && norm(words[k].w) !== norm(w)) k++;
        if (k >= words.length) {
          throw new Error(`edit.json: "${w}" in phrase "${phrase}" is not spoken (in this order) in the voice clip`);
        }
        return VO_DELAY + Math.round(words[k++].t0 * fps);
      }),
  );
}

/**
 * A kinetic scene: phrases one after another. With word timing (`words`) each word appears as
 * it is spoken and each phrase holds until the next one starts; without it, phrases share the
 * scene evenly.
 */
export const KineticText: React.FC<{ phrases: string[]; words?: SpokenWord[]; theme: Theme; size?: number }> = ({
  phrases,
  words,
  theme,
  size,
}) => {
  const { durationInFrames: d, fps } = useVideoConfig();
  const timed = words ? spokenFrames(phrases, words, fps) : null;
  const even = Math.floor(d / phrases.length);
  const starts = phrases.map((_, i) => (timed ? Math.max(0, timed[i][0] - LEAD) : i * even));
  return (
    <AbsoluteFill>
      {phrases.map((text, i) => {
        const last = i === phrases.length - 1;
        const end = last ? d : starts[i + 1];
        return (
          <Sequence key={i} from={starts[i]} durationInFrames={Math.max(1, end - starts[i])}>
            <PhraseSlot text={text} theme={theme} size={size} fadeOut={!last} at={timed ? timed[i].map((t) => t - LEAD - starts[i]) : undefined} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Centres a phrase; all but the last blur out over their final 6 frames. */
const PhraseSlot: React.FC<{ text: string; theme: Theme; size?: number; fadeOut: boolean; at?: number[] }> = ({
  text,
  theme,
  size,
  fadeOut,
  at,
}) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const out = fadeOut ? interpolate(f, [d - 6, d], [1, 0], clamp) : 1;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: out, filter: `blur(${(1 - out) * 12}px)` }}>
        <Phrase text={text} theme={theme} size={size} at={at} />
      </div>
    </AbsoluteFill>
  );
};
