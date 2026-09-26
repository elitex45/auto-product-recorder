// Render a hand-choreographed film (a composition in src/films/) from a demo folder.
// usage: node studio/film.mjs <demo dir> [--frames=a-b] [--still=N]
// Needs in <demo dir>: film.json, shots/ (+ shots.json, from the *.capture.ts spec), audio/<id>.wav
// with aligned words in audio/words/<id>.json, music/bed.wav and music/sfx/*.wav (scripts/music.py).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const STUDIO = path.dirname(new URL(import.meta.url).pathname);
const demo = path.resolve(process.argv[2] ?? "");
const opt = Object.fromEntries(process.argv.slice(3).map((a) => a.replace(/^--/, "").split("=")));
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const film = readJson(path.join(demo, "film.json"));

const pub = path.join(STUDIO, "public", "_film");
fs.rmSync(pub, { recursive: true, force: true });
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(path.join(pub, to)), { recursive: true });
  fs.copyFileSync(path.join(demo, from), path.join(pub, to));
  return `_film/${to}`;
};

const theme = { ...film.theme };
for (const key of ["displayFont", "bodyFont", "logo", "hero"]) if (theme[key]) theme[key] = copy(theme[key], theme[key]);

const shots = {};
for (const [name, s] of Object.entries(readJson(path.join(demo, "shots", "shots.json")))) {
  shots[name] = { ...s, src: copy(`shots/${name}.png`, `shots/${name}.png`) };
}

const index = readJson(path.join(demo, "audio", "index.json"));
const vo = {};
for (const [id, at] of Object.entries(film.voice)) {
  const words = readJson(path.join(demo, "audio", "words", `${id}.json`))
    .filter((w) => w.seg >= 0)
    .map(({ w, t0, t1 }) => ({ w: w.replace(/[^\w']/g, ""), t0, t1 }));
  vo[id] = { src: copy(`audio/${id}.wav`, `audio/${id}.wav`), at, ms: index[id], words };
}

const sfx = {};
for (const f of fs.readdirSync(path.join(demo, "music", "sfx"))) sfx[path.parse(f).name] = copy(`music/sfx/${f}`, `sfx/${f}`);
const music = { bed: copy("music/bed.wav", "bed.wav"), sfx };

const propsFile = path.join(demo, "build", "film-props.json");
fs.mkdirSync(path.dirname(propsFile), { recursive: true });
// pace > 1 slows the whole film: the choreography (written in film.json frames) plays pace times
// slower while the voice keeps its natural speed, so there is more room between lines.
fs.writeFileSync(propsFile, JSON.stringify({ frames: film.frames, pace: film.pace ?? 1, theme, shots, vo, music }, null, 1));

const args = opt.still
  ? ["still", "src/index.ts", film.composition, path.join(demo, "build", `still-${opt.still}.png`), `--frame=${opt.still}`]
  : ["render", "src/index.ts", film.composition, path.join(demo, film.output), ...(opt.frames ? [`--frames=${opt.frames}`] : [])];
const r = spawnSync("npx", ["remotion", ...args, `--props=${propsFile}`, "--log=warn"], { cwd: STUDIO, stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
// Finish: bake the poster in as frame 0 (so feeds and players that show the first frame show the
// best one; the frame is replaced, not added, so timing and audio stay the same) and bring the mix to
// web loudness (-14 LUFS, peaks under -1 dB). Also writes <output>.jpg and share-copy.txt.
if (!opt.still && !opt.frames) {
  const { createRequire } = await import("node:module");
  const ffmpeg = createRequire(import.meta.url)(path.join(path.dirname(STUDIO), "node_modules", "@ffmpeg-installer", "ffmpeg")).path;
  const run = (a) => {
    const n = spawnSync(ffmpeg, ["-v", "error", "-y", ...a], { stdio: "inherit" });
    if (n.status !== 0) process.exit(n.status ?? 1);
  };
  const out = args[3];
  const tmp = out.replace(/\.mp4$/, ".loud.mp4");
  const poster = out.replace(/\.mp4$/, ".jpg");
  // film.json "poster": the film frame to use (default: the last one).
  const pf = Math.round((film.poster ?? film.frames - 1) * (film.pace ?? 1));
  run(["-i", out, "-vf", `select=eq(n\\,${pf})`, "-frames:v", "1", "-q:v", "2", poster]);
  run(["-i", out, "-i", poster, "-filter_complex", "[0:v][1:v]overlay=enable='eq(n,0)'[v]", "-map", "[v]", "-map", "0:a",
    "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-af", "loudnorm=I=-14:TP=-1:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "256k", tmp]);
  fs.renameSync(tmp, out);
  if (film.share) fs.writeFileSync(path.join(demo, "share-copy.txt"), film.share.trim() + "\n");
}
console.log(`done: ${args[3]}`);
