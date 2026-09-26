// One command for the whole pipeline: voice -> record -> assemble.
// usage: node scripts/run.mjs [--step voice|record|assemble] <demo dir>
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const stepAt = args.indexOf("--step");
const only = stepAt >= 0 ? args.splice(stepAt, 2)[1] : null;
const demo = path.resolve(args[0] ?? "demos/example");
if (!fs.existsSync(path.join(demo, "narration.json"))) {
  console.error(`${demo} has no narration.json.\nusage: npm run demo -- <demo dir>   (e.g. demos/example)`);
  process.exit(1);
}

const venvPy = [".venv/bin/python", ".venv/Scripts/python.exe"].map((p) => path.join(ROOT, p)).find((p) => fs.existsSync(p));
const run = (cmd, cmdArgs, env = {}) => {
  console.log(`\n$ ${cmd} ${cmdArgs.join(" ")}`);
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const steps = {
  voice: () => run(venvPy ?? "python3", ["scripts/voice.py", demo]),
  record: () =>
    run("npx", ["playwright", "test", path.relative(ROOT, path.join(demo, "record.spec.ts")), "--workers=1", "--reporter=line"], { DEMO_DIR: demo }),
  assemble: () => run("node", ["scripts/assemble.mjs", demo]),
};
if (only && !steps[only]) {
  console.error(`unknown step "${only}"; use voice, record or assemble`);
  process.exit(1);
}
for (const [name, fn] of Object.entries(steps)) if (!only || only === name) fn();
