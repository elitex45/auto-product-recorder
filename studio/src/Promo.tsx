import React from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile } from "remotion";
import { Background } from "./components/Background";
import { KineticText } from "./components/KineticText";
import { LogoOutro } from "./components/LogoOutro";
import { SceneShell } from "./components/SceneShell";
import { ScreenClip } from "./components/ScreenClip";
import { EDGE, sceneFrames, screenRange } from "./timing";
import type { PromoProps, Scene } from "./types";

// Inter (OFL), bundled in public/fonts so renders never depend on the network.
const fontHandle = delayRender("Loading Inter");
const inter = new FontFace("Inter", `url(${staticFile("fonts/Inter.ttf")})`, { weight: "100 900" });
inter
  .load()
  .then((f) => {
    document.fonts.add(f);
    continueRender(fontHandle);
  })
  .catch((e) => {
    console.error(e);
    continueRender(fontHandle);
  });

/** The whole promo: scenes back to back on one background, voice clips on top. */
export const Promo: React.FC<PromoProps> = (props) => {
  const { edit } = props;
  let at = 0;
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif" }}>
      <Background theme={edit.theme} />
      {edit.scenes.map((scene, i) => {
        const d = sceneFrames(scene, props);
        const from = at;
        at += d - EDGE;
        return (
          <Sequence key={i} from={from} durationInFrames={d} name={`${i} ${scene.type}`}>
            <SceneShell>
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
      return <KineticText phrases={scene.phrases} theme={theme} />;
    case "screen": {
      const { stage, from, to } = screenRange(scene, props);
      return <ScreenClip scene={scene} stage={stage} from={from} to={to} theme={theme} />;
    }
    case "outro":
      return <LogoOutro theme={theme} />;
  }
};

/** A narration clip, starting a few frames into its scene. Screen scenes carry their own voice in the stage video. */
const Voice: React.FC<{ id: string; props: PromoProps }> = ({ id, props }) => {
  const clip = props.vo[id];
  if (!clip) throw new Error(`edit.json: no voice clip "${id}" (is it in narration.json?)`);
  return (
    <Sequence from={6} layout="none">
      <Audio src={staticFile(clip.src)} />
    </Sequence>
  );
};
