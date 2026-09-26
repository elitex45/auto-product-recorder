import type { PromoProps, Scene } from "./types";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Frames every scene spends fading in and out (see SceneShell). */
export const EDGE = 10;

const sec = (s: number) => Math.round(s * FPS);

/** Stage slice in seconds, with defaults filled in. */
export function screenRange(scene: Extract<Scene, { type: "screen" }>, props: PromoProps) {
  const stage = props.stages[scene.stage];
  if (!stage) throw new Error(`edit.json: unknown stage "${scene.stage}"`);
  const from = scene.from ?? 0;
  const to = scene.to ?? stage.total / 1000;
  return { stage, from, to };
}

/** Scenes overlap by EDGE frames, so one blurs out while the next blurs in. */
export function totalFrames(props: PromoProps): number {
  const sum = props.edit.scenes.reduce((n, s) => n + sceneFrames(s, props), 0);
  return Math.max(1, sum - EDGE * (props.edit.scenes.length - 1));
}

export function sceneFrames(scene: Scene, props: PromoProps): number {
  const voSec = (id?: string) => (id && props.vo[id] ? props.vo[id].ms / 1000 : 0);
  switch (scene.type) {
    case "kinetic":
      return sec(scene.seconds ?? voSec(scene.vo) + 0.6);
    case "screen": {
      const { from, to } = screenRange(scene, props);
      return sec(to - from);
    }
    case "outro":
      return sec(scene.seconds ?? Math.max(3, voSec(scene.vo) + 1));
  }
}
