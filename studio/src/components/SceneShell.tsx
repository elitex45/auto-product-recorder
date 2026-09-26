import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EDGE } from "../timing";
import { transitionStyle } from "../transitions";
import type { Transition } from "../types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Runs a scene's enter and exit transitions over EDGE frames each; scenes overlap by EDGE, so cuts blend. */
export const SceneShell: React.FC<{ enter?: Transition; exit?: Transition; children: React.ReactNode }> = ({
  enter = "blur",
  exit = "blur",
  children,
}) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const leaving = f > d / 2;
  const t = leaving ? interpolate(f, [d - EDGE, d], [1, 0], clamp) : interpolate(f, [0, EDGE], [0, 1], clamp);
  return <AbsoluteFill style={transitionStyle(leaving ? exit : enter, t, leaving)}>{children}</AbsoluteFill>;
};
