import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts } from "../fonts";
import type { CardsScene, SpokenWord, Theme } from "../types";
import { spokenFrames } from "./KineticText";

const LEAD = 4; // start popping a few frames before the cue word, so the card lands on it

/**
 * A row of cards. Each flips up out of depth on its cue word; the newest glows in the accent
 * colour and the earlier ones step back a little.
 */
export const FeatureCards: React.FC<{ scene: CardsScene; words?: SpokenWord[]; theme: Theme }> = ({ scene, words, theme }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames: d } = useVideoConfig();
  const n = scene.cards.length;
  const at = words
    ? spokenFrames(scene.cards.map((c) => c.cue), words, fps).map(([t]) => t - LEAD)
    : scene.cards.map((_, i) => Math.round(((i + 0.3) * d) / (n + 0.5)));
  const { display, body } = fonts(theme);
  const current = at.filter((t) => f >= t).length - 1;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 1800 }}>
      <div style={{ display: "flex", gap: 40 }}>
        {scene.cards.map((c, i) => {
          const s = spring({ frame: f - at[i], fps, config: { damping: 15, mass: 0.9 } });
          const active = i === current;
          const glow = spring({ frame: f - at[i], fps, config: { damping: 30 } });
          const dim = active ? 1 : 0.62;
          return (
            <div
              key={i}
              style={{
                width: 480,
                height: 420,
                boxSizing: "border-box",
                padding: "54px 44px",
                borderRadius: 32,
                background: `linear-gradient(160deg, ${theme.accent2}26, rgba(255,255,255,0.03) 55%)`,
                border: `1.5px solid ${active ? theme.accent : "rgba(255,255,255,0.10)"}`,
                boxShadow: active ? `0 0 ${50 * glow}px ${theme.accent}55, 0 40px 80px -30px rgba(0,0,0,0.6)` : "0 40px 80px -30px rgba(0,0,0,0.6)",
                opacity: s * dim,
                transform: `translateY(${(1 - s) * 160}px) rotateX(${(1 - s) * 55}deg) scale(${(active ? 1.04 : 0.96) * (0.8 + s * 0.2)})`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <div style={{ fontFamily: body, fontSize: 26, letterSpacing: "0.2em", color: theme.accent, marginBottom: 20 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: display, fontSize: 88, fontWeight: 700, lineHeight: 1, color: theme.ink, letterSpacing: "-0.02em" }}>
                {c.title}
              </div>
              {c.sub ? <div style={{ fontFamily: body, fontSize: 36, color: theme.muted, marginTop: 18 }}>{c.sub}</div> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
