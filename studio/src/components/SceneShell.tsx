import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EDGE } from "../timing";

/** Every scene enters out of a soft blur and leaves into one, so cuts feel like one continuous motion. */
export const SceneShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const t = Math.min(
    interpolate(f, [0, EDGE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(f, [d - EDGE, d], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const leaving = f > d / 2;
  return (
    <AbsoluteFill
      style={{
        opacity: t,
        filter: `blur(${(1 - t) * 14}px)`,
        transform: `scale(${leaving ? 1 + (1 - t) * 0.06 : 0.96 + t * 0.04})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
