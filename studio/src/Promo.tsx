import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Background } from "./components/Background";
import { FeatureCards } from "./components/FeatureCards";
import { StatCounter } from "./components/StatCounter";
import { fonts, useThemeFonts } from "./fonts";
import { KineticText } from "./components/KineticText";
import { LogoOutro } from "./components/LogoOutro";
import { SceneShell } from "./components/SceneShell";
import { ScreenClip } from "./components/ScreenClip";
import { EDGE, VO_DELAY, sceneFrames, screenRange } from "./timing";
import type { PromoProps, Scene } from "./types";

/** The whole promo: scenes back to back on one background, voice clips on top. */
export const Promo: React.FC<PromoProps> = (props) => {
  const { edit } = props;
  useThemeFonts(edit.theme);
  let at = 0;
  return (
    <AbsoluteFill style={{ fontFamily: fonts(edit.theme).display }}>
      <Background theme={edit.theme} />
      {edit.scenes.map((scene, i) => {
        const d = sceneFrames(scene, props);
        const from = at;
        at += d - EDGE;
        return (
          <Sequence key={i} from={from} durationInFrames={d} name={`${i} ${scene.type}`}>
            <SceneShell enter={scene.enter} exit={scene.exit}>
              <SceneBody scene={scene} props={props} />
            </SceneShell>
            {"vo" in scene && scene.vo ? <Voice id={scene.vo} props={props} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneBody: React.FC<{ scene: Scene; props: PromoProps }> = ({ scene, props }) => {
  const theme = props.edit.theme;
  switch (scene.type) {
    case "kinetic":
      return <KineticText phrases={scene.phrases} words={words(scene.vo, props)} theme={theme} size={scene.size} />;
    case "stat":
      return <StatCounter scene={scene} words={words(scene.vo, props)} theme={theme} />;
    case "cards":
      return <FeatureCards scene={scene} words={words(scene.vo, props)} theme={theme} />;
    case "screen": {
      const { stage, from, to } = screenRange(scene, props);
      return <ScreenClip scene={scene} stage={stage} from={from} to={to} theme={theme} />;
    }
    case "outro":
      return <LogoOutro theme={theme} />;
  }
};

const words = (id: string | undefined, props: PromoProps) => (id ? props.vo[id]?.words : undefined);

/** A narration clip, starting a few frames into its scene. Screen scenes carry their own voice in the stage video. */
const Voice: React.FC<{ id: string; props: PromoProps }> = ({ id, props }) => {
  const clip = props.vo[id];
  if (!clip) throw new Error(`edit.json: no voice clip "${id}" (is it in narration.json?)`);
  return (
    <Sequence from={VO_DELAY} layout="none">
      <Audio src={staticFile(clip.src)} />
    </Sequence>
  );
};
