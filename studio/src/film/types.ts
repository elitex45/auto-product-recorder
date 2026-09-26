import type { SpokenWord, Theme } from "../types";

/** A still of a UI piece or a page view, captured at 2x by a *.capture.ts spec. Sizes in CSS px. */
export type Shot = { src: string; w: number; h: number; box?: { x: number; y: number; width: number; height: number } };

/** Everything a film composition needs; built by studio/film.mjs from <demo>/film.json. */
export type FilmProps = {
  /** Length in choreography frames. The output is frames * pace long. */
  frames: number;
  /** >1 plays the choreography slower (voice keeps its speed). Default 1. */
  pace?: number;
  theme: Theme;
  shots: Record<string, Shot>;
  /** Voice clips: id -> file, start frame in the film, length, word timings. */
  vo: Record<string, { src: string; at: number; ms: number; words: SpokenWord[] }>;
  /** Music bed (already ducked under the voice) and one-shot effects, by name. */
  music: { bed: string; sfx: Record<string, string> };
};
