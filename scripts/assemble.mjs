// Stitch a demo: title cards + recorded stages -> one 1080p mp4 with narration.
// usage: node scripts/assemble.mjs <demo dir>
// The order of cards and stages comes from <demo dir>/demo.json "sequence".
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const DEMO = path.resolve(process.argv[2] ?? ".");
const CFG = JSON.parse(fs.readFileSync(path.join(DEMO, "demo.json"), "utf8"));
const AUDIO = path.join(DEMO, "audio");
const IDX = JSON.parse(fs.readFileSync(path.join(AUDIO, "index.json"), "utf8"));
const BUILD = path.join(DEMO, "build");
const BG = CFG.background ?? "0x0b0a14";
const [W, H] = [1920, 1080];
const VENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-r", "30", "-profile:v", "high", "-level", "4.1"];
const AENC = ["-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2"];

/** FFMPEG env var, else the bundled static build (has drawtext + libx264), else ffmpeg on PATH. */
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    return createRequire(import.meta.url)("@ffmpeg-installer/ffmpeg").path;
  } catch {
    return "ffmpeg";
  }
}
const FF = findFfmpeg();

/** First existing font from env or common macOS / Linux / Windows locations. */
function findFont(envName, candidates) {
  const found = [process.env[envName], ...candidates].find((f) => f && fs.existsSync(f));
  if (!found) throw new Error(`no font found; set ${envName}=/path/to/font.ttf`);
  return found;
}
const TITLE_FONT = findFont("TITLE_FONT", [
  "/System/Library/Fonts/Supplemental/Georgia.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
  "/usr/share/fonts/dejavu-serif-fonts/DejaVuSerif.ttf",
  "C:/Windows/Fonts/georgia.ttf",
]);
const BODY_FONT = findFont("BODY_FONT", [
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf",
  "C:/Windows/Fonts/arial.ttf",
]);

fs.rmSync(BUILD, { recursive: true, force: true });
fs.mkdirSync(BUILD);
const ff = (args) => execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
// drawtext needs colons, quotes and percent signs escaped.
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\\\'").replace(/:/g, "\\:").replace(/%/g, "\\%");
const fontArg = (f) => f.replace(/\\/g, "/").replace(/:/g, "\\:");

function clip(id) {
  const file = path.join(AUDIO, `${id}.wav`);
  if (!fs.existsSync(file)) throw new Error(`missing ${file}; run the voice step`);
  return file;
}

/** Each beat's clip, delayed to its start time and mixed into one track of totalMs. */
function audioArgs(beats, totalMs, offset = 1) {
  const inputs = [];
  const filters = [];
  beats.forEach((b, i) => {
    inputs.push("-i", clip(b.id));
    filters.push(`[${i + offset}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${b.start}|${b.start}[a${i}]`);
  });
  const mix = beats.map((_, i) => `[a${i}]`).join("");
  filters.push(`${mix}amix=inputs=${beats.length}:normalize=0:dropout_transition=0,apad,atrim=0:${(totalMs / 1000).toFixed(3)}[aout]`);
  return { inputs, filter: filters.join(";") };
}

/** A title card: title + subtitle on a flat background, with the beat's narration. */
function card(n, { card: id, title = "", subtitle = "" }) {
  const ms = (IDX[id] ?? 0) + 1400;
  const out = path.join(BUILD, `${String(n).padStart(2, "0")}-card-${id}.mp4`);
  const { inputs, filter } = audioArgs([{ id, start: 500 }], ms);
  ff([
    "-f", "lavfi", "-i", `color=c=${BG}:s=${W}x${H}:d=${(ms / 1000).toFixed(3)}`,
    ...inputs,
    "-filter_complex",
    `[0:v]drawtext=fontfile='${fontArg(TITLE_FONT)}':text='${esc(title)}':fontcolor=0xF3EFE6:fontsize=84:x=(w-text_w)/2:y=(h/2-120),` +
      `drawtext=fontfile='${fontArg(BODY_FONT)}':text='${esc(subtitle)}':fontcolor=0xA9A3B8:fontsize=34:x=(w-text_w)/2:y=(h/2+10)[v];${filter}`,
    "-map", "[v]", "-map", "[aout]", ...VENC, ...AENC, "-t", (ms / 1000).toFixed(3), out,
  ]);
  console.log(`card ${id}: ${(ms / 1000).toFixed(1)}s`);
  return out;
}

/** A recorded stage: each frame held until the next arrived; smaller (phone) frames are letterboxed. */
function stage(n, { stage: name }) {
  const dir = path.join(DEMO, "frames", name);
  const metaFile = path.join(dir, "frames.json");
  if (!fs.existsSync(metaFile)) throw new Error(`missing ${metaFile}; run the record step`);
  const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  const frames = meta.frames;
  if (!frames.length) throw new Error(`no frames for ${name}`);
  if (!meta.beats.length) throw new Error(`no beats recorded for ${name}`);
  const lastBeat = meta.beats[meta.beats.length - 1];
  const totalMs = Math.max(meta.total, lastBeat.end + 300);
  const frame = (i) => path.join(dir, String(i).padStart(6, "0") + ".jpg");
  const lines = ["ffconcat version 1.0"];
  frames.forEach((t, i) => {
    const next = i + 1 < frames.length ? frames[i + 1] : totalMs;
    lines.push(`file '${frame(i)}'`, `duration ${(Math.max(next - t, 1) / 1000).toFixed(3)}`);
  });
  lines.push(`file '${frame(frames.length - 1)}'`);
  const list = path.join(BUILD, `${name}.ffconcat`);
  fs.writeFileSync(list, lines.join("\n") + "\n");
  const { inputs, filter } = audioArgs(meta.beats, totalMs);
  const out = path.join(BUILD, `${String(n).padStart(2, "0")}-stage-${name}.mp4`);
  ff([
    "-f", "concat", "-safe", "0", "-i", list, ...inputs,
    "-filter_complex",
    `[0:v]tpad=start_duration=${(frames[0] / 1000).toFixed(3)},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${BG},fps=30,format=yuv420p[v];${filter}`,
    "-map", "[v]", "-map", "[aout]", ...VENC, ...AENC, "-t", (totalMs / 1000).toFixed(3), out,
  ]);
  console.log(`stage ${name}: ${frames.length} frames, ${(totalMs / 1000).toFixed(1)}s, beats ${meta.beats.map((b) => b.id).join(" ")}`);
  return out;
}

const parts = CFG.sequence.map((item, n) => {
  if (item.card) return card(n, item);
  if (item.stage) return stage(n, item);
  throw new Error(`sequence item ${n} needs "card" or "stage": ${JSON.stringify(item)}`);
});
fs.writeFileSync(path.join(BUILD, "concat.txt"), parts.map((p) => `file '${p}'`).join("\n") + "\n");
const final = path.join(DEMO, CFG.output ?? "demo.mp4");
ff(["-f", "concat", "-safe", "0", "-i", path.join(BUILD, "concat.txt"), "-c", "copy", "-movflags", "+faststart", final]);
console.log(`final ${final} ${(fs.statSync(final).size / 1048576).toFixed(1)} MiB`);
const small = final.replace(/\.mp4$/, "-small.mp4");
ff(["-i", final, "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", small]);
console.log(`small ${small} ${(fs.statSync(small).size / 1048576).toFixed(1)} MiB`);
