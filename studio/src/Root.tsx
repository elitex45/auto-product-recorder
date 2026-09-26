import React from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { FPS, HEIGHT, WIDTH, totalFrames } from "./timing";
import type { PromoProps } from "./types";

// Defaults only matter in `npm run preview` before props are passed; renders get real props from polish.mjs.
const empty: PromoProps = {
  edit: {
    theme: { accent: "#2563eb", accent2: "#38bdf8", bg: "#f6f7fb", ink: "#0b1020", muted: "#6b7280", brand: "Your product" },
    scenes: [{ type: "kinetic", phrases: ["Run", "npm run polish"], seconds: 3 }],
  },
  stages: {},
  vo: {},
};

export const Root: React.FC = () => (
  <Composition
    id="Promo"
    component={Promo}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={empty}
    calculateMetadata={({ props }) => ({
      durationInFrames: totalFrames(props),
    })}
  />
);
