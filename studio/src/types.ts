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
  /** Headline font file (kinetic words, stats, cards, brand), from the demo folder. Default Inter. */
  displayFont?: string;
  /** Font file for small text (labels, captions). Default Inter. */
  bodyFont?: string;
  /** Logo image for the outro, from the demo folder. Default: a sparkle in the brand colours. */
  logo?: string;
  /** Key art behind the outro, from the demo folder. */
  hero?: string;
  /** Partner lockup shown next to the logo on the outro ("logo × partner"), from the demo folder. */
  partnerLogo?: string;
};

/** How a scene arrives and leaves (see transitions.ts). */
export type Transition = "blur" | "fade" | "zoomIn" | "zoomOut" | "slideUp" | "slideLeft" | "none";

type SceneBase = {
  /** Default "blur". */
  enter?: Transition;
  /** Default "blur". */
  exit?: Transition;
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
  /** Hard cuts (ms since the stage started), from rec.cut(). */
  cuts?: number[];
  beats: Beat[];
  total: number;
};

/** Big words on the background, phrase by phrase, over one voice clip. */
export type KineticScene = SceneBase & {
  type: "kinetic";
  /** Font size in px. Default 120. */
  size?: number;
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
export type ScreenScene = SceneBase & {
  type: "screen";
  /**
   * How the window arrives: "rise" (tilted, from below; default), "pop" (scales up),
   * "swing" (turns in from the side; good for phones), "none".
   */
  entrance?: "rise" | "pop" | "swing" | "none";
  stage: string;
  /** Seconds into the stage. Default 0. */
  from?: number;
  /** Seconds into the stage. Default: end of stage. */
  to?: number;
  /** Small line above the window. */
  title?: string;
  /**
   * Camera moves, eased one into the next. Each zooms to `mark` (or back to the whole page if
   * there is no mark), starting at `at` (s into the stage) or else `lead` s before the mark happened.
   */
  focus?: { mark?: string; at?: number; scale?: number; lead?: number; until?: number }[];
  /**
   * Glowing outlines drawn around marks, with an optional label. Shown from `at` (s into the stage;
   * default when the mark happened) for `for` seconds (default 2.5), so they leave before the page scrolls on.
   */
  highlights?: { mark: string; at?: number; for?: number; label?: string }[];
  /** Marks the cursor moves to and clicks (or taps, on a phone). */
  clicks?: string[];
};

/** Closing logo and URL. */
/** One big number counting up while the voice says it, with a label under it. */
export type StatScene = SceneBase & {
  type: "stat";
  value: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  vo?: string;
  seconds?: number;
};

/** Cards that pop in one by one, each on the spoken word `cue`. */
export type CardsScene = SceneBase & {
  type: "cards";
  cards: { cue: string; title: string; sub?: string }[];
  vo?: string;
  seconds?: number;
};

export type OutroScene = SceneBase & {
  type: "outro";
  vo?: string;
  seconds?: number;
};

export type Scene = KineticScene | ScreenScene | StatScene | CardsScene | OutroScene;

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
