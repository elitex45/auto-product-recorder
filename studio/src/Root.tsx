import React from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { FPS, HEIGHT, WIDTH, totalFrames } from "./timing";
import type { PromoProps } from "./types";
import { DittoV3 } from "./films/DittoV3";
import { DittoV5 } from "./films/DittoV5";
import { DittoRiso } from "./films/DittoRiso";
import { DittoRisoV2 } from "./films/DittoRisoV2";
import { DittoRisoV3 } from "./films/DittoRisoV3";
import { DittoRisoV4 } from "./films/DittoRisoV4";
import { Showreel } from "./films/Showreel";
import { HelloFilm } from "./films/HelloFilm";
import type { FilmProps } from "./film/types";

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
  <>
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
  {/* Hand-choreographed films, rendered by film.mjs from demos/<name>/film.json. */}
  <Composition
    id="DittoV3"
    component={DittoV3}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={{} as FilmProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.frames ?? 1) * (props.pace ?? 1)) })}
  />
  <Composition
    id="DittoV5"
    component={DittoV5}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={{} as FilmProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.frames ?? 1) * (props.pace ?? 1)) })}
  />
  <Composition
    id="DittoRiso"
    component={DittoRiso}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={{} as FilmProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.frames ?? 1) * (props.pace ?? 1)) })}
  />
  <Composition
    id="DittoRisoV2"
    component={DittoRisoV2}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={{} as FilmProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.frames ?? 1) * (props.pace ?? 1)) })}
  />
  <Composition
    id="DittoRisoV3"
    component={DittoRisoV3}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={{} as FilmProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.frames ?? 1) * (props.pace ?? 1)) })}
  />
  <Composition
    id="DittoRisoV4"
    component={DittoRisoV4}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={{} as FilmProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.frames ?? 1) * (props.pace ?? 1)) })}
  />
  <Composition
    id="Showreel"
    component={Showreel}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={{} as FilmProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.frames ?? 1) * (props.pace ?? 1)) })}
  />
  <Composition
    id="HelloFilm"
    component={HelloFilm}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={{} as FilmProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.frames ?? 1) * (props.pace ?? 1)) })}
  />
  </>
);
