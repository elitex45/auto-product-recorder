// Turn a recorded demo into a polished promo.
// usage: node studio/polish.mjs <demo dir>      (after `npm run demo -- <demo dir>`)
// Reads <demo dir>/edit.json (the storyboard), the recorded stages and the voice clips,
// renders with Remotion, writes <demo dir>/<output from edit.json, default "<name>-promo.mp4">.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const STUDIO = path.dirname(new URL(import.meta.url).pathname);
const demo = path.resolve(process.argv[2] ?? "");
const editFile = path.join(demo, "edit.json");
if (!fs.existsSync(editFile)) {
  console.error(`${editFile} not found.\nusage: npm run polish -- <demo dir>   (e.g. demos/google)`);
  process.exit(1);
}
const edit = JSON.parse(fs.readFileSync(editFile, "utf8"));
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

// Stage assets go under studio/public/_demo so Remotion can serve them.
const pub = path.join(STUDIO, "public", "_demo");
fs.rmSync(pub, { recursive: true, force: true });
fs.mkdirSync(path.join(pub, "audio"), { recursive: true });

// Theme files (fonts, logo, key art) are paths in the demo folder; serve them from public/.
for (const key of ["displayFont", "bodyFont", "logo", "hero"]) {
  const rel = edit.theme[key];
  if (!rel) continue;
  const file = path.join(demo, rel);
  if (!fs.existsSync(file)) throw new Error(`edit.json theme.${key}: ${file} not found`);
  fs.mkdirSync(path.join(pub, "assets"), { recursive: true });
  fs.copyFileSync(file, path.join(pub, "assets", path.basename(file)));
  edit.theme[key] = `_demo/assets/${path.basename(file)}`;
}

const stages = {};
for (const name of new Set(edit.scenes.filter((s) => s.type === "screen").map((s) => s.stage))) {
  const meta = readJson(path.join(demo, "frames", name, "frames.json"));
  const build = path.join(demo, "build");
  const video = fs.existsSync(build) && fs.readdirSync(build).find((f) => f.endsWith(`-stage-${name}.mp4`));
  if (!video) throw new Error(`no stage video for "${name}" in ${build}; run: npm run demo -- ${path.relative(process.cwd(), demo)}`);
  if (!meta.viewport) throw new Error(`${name}/frames.json has no viewport; re-record with the current recorder`);
  fs.copyFileSync(path.join(build, video), path.join(pub, `${name}.mp4`));
  stages[name] = { src: `_demo/${name}.mp4`, viewport: meta.viewport, marks: meta.marks ?? [], beats: meta.beats, total: meta.total };
}

// Word timing for kinetic scenes comes from the forced aligner in aligner/: given the clip and
// its exact script it returns when each word is spoken. Cached per clip content.
const ROOT = path.dirname(STUDIO);
const ALIGNER = path.join(ROOT, "aligner");
const PYTHON = path.join(ROOT, ".venv", "bin", "python");
// The aligner calls `ffmpeg` from PATH; use the bundled one unless FFMPEG is set.
const require = createRequire(import.meta.url);
const FFMPEG = process.env.FFMPEG ?? require(path.join(ROOT, "node_modules", "@ffmpeg-installer", "ffmpeg")).path;
const narration = readJson(path.join(demo, "narration.json"));
function align(id, wav) {
  const cacheDir = path.join(demo, "audio", "words");
  const hash = crypto.createHash("sha1").update(fs.readFileSync(wav)).update(narration[id]).digest("hex").slice(0, 16);
  const cached = path.join(cacheDir, `${id}.${hash}.json`);
  if (!fs.existsSync(cached)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const script = path.join(cacheDir, `${id}.txt`);
    fs.writeFileSync(script, narration[id] + "\n");
    const r = spawnSync(
      PYTHON,
      ["-m", "sync.cli", "align", "--audio", wav, "--transcript", script, "--fps", "30", "-o", cached],
      { cwd: ALIGNER, encoding: "utf8", env: { ...process.env, PATH: `${path.dirname(FFMPEG)}${path.delimiter}${process.env.PATH}` } },
    );
    if (r.status !== 0) throw new Error(`aligner failed on ${id}:\n${r.stderr || r.stdout}`);
  }
  const words = readJson(cached);
  if (words.some((w) => w.seg === -1)) console.warn(`!! ${id}: aligner ran in DEGRADED mode (no ML model); word timing is approximate`);
  const unsure = words.filter((w) => w.seg >= 0 && w.score < 0.5).map((w) => w.w);
  if (unsure.length) console.warn(`${id}: aligner unsure about: ${unsure.join(", ")} (listen to check)`);
  return words.filter((w) => w.seg >= 0).map(({ w, t0, t1 }) => ({ w, t0, t1 }));
}

const index = readJson(path.join(demo, "audio", "index.json"));
const vo = {};
for (const scene of edit.scenes.filter((s) => s.vo)) {
  const id = scene.vo;
  if (!(id in index)) throw new Error(`edit.json uses voice "${id}" but narration.json has no such beat`);
  const wav = path.join(demo, "audio", `${id}.wav`);
  fs.copyFileSync(wav, path.join(pub, "audio", `${id}.wav`));
  vo[id] = { src: `_demo/audio/${id}.wav`, ms: index[id] };
  if (!["kinetic", "stat", "cards"].includes(scene.type)) continue;
  vo[id].words = align(id, wav);
}

const propsFile = path.join(demo, "build", "promo-props.json");
fs.mkdirSync(path.dirname(propsFile), { recursive: true });
fs.writeFileSync(propsFile, JSON.stringify({ edit, stages, vo }, null, 1));
const out = path.join(demo, edit.output ?? `${path.basename(demo)}-promo.mp4`);
const r = spawnSync("npx", ["remotion", "render", "src/index.ts", "Promo", out, `--props=${propsFile}`, "--log=warn"], {
  cwd: STUDIO,
  stdio: "inherit",
});
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`promo ${out} ${(fs.statSync(out).size / 1048576).toFixed(1)} MiB`);
