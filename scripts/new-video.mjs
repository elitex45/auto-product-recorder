// Start a new video, or a new version of one, without hand-copying files.
//
//   node scripts/new-video.mjs <name>                  new project from templates/
//   node scripts/new-video.mjs <name> --from=<demo>    new version: copies demos/<demo> and its film code
//
// Writes demos/<name>/ and studio/src/films/<Name>.tsx, and registers <Name> in studio/src/Root.tsx.
// Never overwrites: it stops if the folder or the composition already exists.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [name, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, "").split("=")));
if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error("usage: node scripts/new-video.mjs <name> [--from=<existing demo>]   (name: lowercase, digits, dashes)");
  process.exit(1);
}
const comp = name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase()).replace(/^(\d)/, "V$1");
const demo = path.join(ROOT, "demos", name);
const filmFile = path.join(ROOT, "studio", "src", "films", `${comp}.tsx`);
const rootFile = path.join(ROOT, "studio", "src", "Root.tsx");
const stop = (msg) => {
  console.error(msg);
  process.exit(1);
};
if (fs.existsSync(demo)) stop(`demos/${name} already exists. Pick a new name (versions are never overwritten).`);
if (fs.existsSync(filmFile)) stop(`studio/src/films/${comp}.tsx already exists.`);
let root = fs.readFileSync(rootFile, "utf8");
if (root.includes(`id="${comp}"`)) stop(`${comp} is already registered in Root.tsx.`);

// Renders and screencast frames are re-made, not copied. Voice clips (audio/, not in git) are copied so
// a new version renders straight away; re-run voice + align only for lines that change.
const SKIP = new Set(["frames", "build", "node_modules"]);
const copyDir = (from, to, oldOut = "") => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(e.name) || /\.(mp4|mov)$/.test(e.name)) continue;
    if (oldOut && e.name.startsWith(oldOut) && e.name.endsWith(".jpg")) continue; // the old version's poster
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
};

let film, code;
if (opt.from) {
  const src = path.join(ROOT, "demos", opt.from);
  if (!fs.existsSync(path.join(src, "film.json"))) stop(`demos/${opt.from}/film.json not found (only film projects can be versioned this way).`);
  film = JSON.parse(fs.readFileSync(path.join(src, "film.json"), "utf8"));
  copyDir(src, demo, path.basename(film.output ?? "", ".mp4").replace(/-raw$/, ""));
  const oldComp = film.composition;
  const oldFile = path.join(ROOT, "studio", "src", "films", `${oldComp}.tsx`);
  if (!fs.existsSync(oldFile)) stop(`studio/src/films/${oldComp}.tsx not found.`);
  code = fs.readFileSync(oldFile, "utf8").replace(new RegExp(`\\b${oldComp}\\b`, "g"), comp);
  film.composition = comp;
  film.output = `${name}.mp4`;
  fs.appendFileSync(path.join(demo, "CHANGES.md"), `\n## ${name}\n\nCopied from ${opt.from}. What changed and why:\n\n- \n`);
} else {
  copyDir(path.join(ROOT, "templates", "video"), demo);
  fs.copyFileSync(path.join(ROOT, "templates", "brief.md"), path.join(demo, "brief.md"));
  film = JSON.parse(fs.readFileSync(path.join(demo, "film.json"), "utf8"));
  film.composition = comp;
  film.output = `${name}.mp4`;
  code = fs.readFileSync(path.join(ROOT, "templates", "Film.tsx.tmpl"), "utf8").replaceAll("__NAME__", comp).replaceAll("__DEMO__", name);
}
fs.writeFileSync(path.join(demo, "film.json"), JSON.stringify(film, null, 2) + "\n");
fs.writeFileSync(filmFile, code);

// Register the composition: an import after the last film import, a <Composition> before the closing fragment.
const imports = [...root.matchAll(/^import \{ \w+ \} from "\.\/films\/\w+";\n/gm)];
const close = "  </>\n);";
if (!imports.length || !root.includes(close)) stop("Root.tsx layout changed: register the composition by hand.");
const last = imports[imports.length - 1];
const at = last.index + last[0].length;
root = root.slice(0, at) + `import { ${comp} } from "./films/${comp}";\n` + root.slice(at);
const block = `  <Composition
    id="${comp}"
    component={${comp}}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={{} as FilmProps}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.frames ?? 1) * (props.pace ?? 1)) })}
  />
`;
const i = root.lastIndexOf(close);
root = root.slice(0, i) + block + root.slice(i);
fs.writeFileSync(rootFile, root);

console.log(`made demos/${name}/ and studio/src/films/${comp}.tsx (composition ${comp})`);
console.log(opt.from ? `next: write what changes in demos/${name}/CHANGES.md, then edit the film` : `next: fill in demos/${name}/brief.md`);
