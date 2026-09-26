/** Brand look for one video. Every component reads colours and names from here. */
export type Theme = {
  /** Main brand colour: new words, highlights, the cursor ring. */
  accent: string;
  /** Second brand colour, used in gradients next to `accent`. */
  accent2: string;
  /** Page background. Light backgrounds read as "SaaS"; dark ones work too. */
  bg: string;
  /** Text colour once a word has settled. */
  ink: string;
  /** Secondary text (URL, small captions). */
  muted: string;
  /** Name shown on the closing logo. */
  brand: string;
  /** URL shown under the logo. */
  url?: string;
};

/** One word of a voice clip and when it is spoken (seconds from the clip start). From the aligner. */
export type SpokenWord = { w: string; t0: number; t1: number };

export type Box = { x: number; y: number; width: number; height: number };
/** Where an element was on screen, and when (ms since the stage started). Written by rec.mark(). */
export type Mark = { id: string; t: number; box: Box };
export type Beat = { id: string; start: number; audio: number; end: number };

/** One recorded stage, as the polish script hands it to the studio. */
export type Stage = {
  /** Stage video (1920x1080, content letterboxed) under public/. */
  src: string;
  viewport: { width: number; height: number; dpr: number };
  marks: Mark[];
  beats: Beat[];
  total: number;
};

/** Big words on the background, phrase by phrase, over one voice clip. */
export type KineticScene = {
  type: "kinetic";
  /**
   * Words from the voice clip, in spoken order (you may skip words).
   * Each word appears the moment it is spoken; each phrase replaces the previous one.
   */
  phrases: string[];
  /** Beat id of the voice clip to play. */
  vo?: string;
  /** Scene length. Default: voice length + 0.6 s. */
  seconds?: number;
};

/** A slice of a recorded stage in a floating 3D window, with camera zooms and a cursor. */
export type ScreenScene = {
  type: "screen";
  stage: string;
  /** Seconds into the stage. Default 0. */
  from?: number;
  /** Seconds into the stage. Default: end of stage. */
  to?: number;
  /** Small line above the window. */
  title?: string;
  /** Camera moves: zoom to a mark, starting `lead` s before it happened, until the next focus. */
  focus?: { mark: string; scale?: number; lead?: number; until?: number }[];
  /** Marks the cursor moves to and clicks (or taps, on a phone). */
  clicks?: string[];
};

/** Closing logo and URL. */
export type OutroScene = {
  type: "outro";
  vo?: string;
  seconds?: number;
};

export type Scene = KineticScene | ScreenScene | OutroScene;

/** demos/<name>/edit.json */
export type Edit = {
  theme: Theme;
  scenes: Scene[];
};

/** Everything the composition needs; built by polish.mjs from the demo folder. */
export type PromoProps = {
  edit: Edit;
  stages: Record<string, Stage>;
  /** Voice clips: beat id -> { src under public/, ms, words: when each word is spoken }. */
  vo: Record<string, { src: string; ms: number; words?: SpokenWord[] }>;
};
