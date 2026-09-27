# auto-product-recorder: guide for Claude

This repo makes videos from code: product demos, polished promos, motion pieces. Every video goes
through the same steps, and each step reads a file and writes a file:

**brief → story → assets → motion → sound → check → deliver**

Start every video with the `make-video` skill (`.claude/skills/make-video/`). To change an existing
video, use `revise-video`. These two skills are the workflow. This file is the map and the rules.

## Which kind of video

| The user wants | Engine | Worked example |
|---|---|---|
| A plain narrated walkthrough of a site | `npm run demo` (screencast + voice + cards) | `demos/example`, `demos/google` |
| A quick branded promo from that walkthrough | `npm run polish` (`edit.json` scenes) | `demos/google/edit.json` |
| A crafted film: lifted UI pieces, morphs, word-synced voice | `node studio/film.mjs` (a React composition) | `demos/zaps-ditto-riso-v6` (riso look, real product) |
| Pure motion: showreel, logo sting, launch teaser | `node studio/film.mjs` (a composition, no screens) | `demos/showreel` |

When unsure, build a film: it has the most control and the full check step.

## Map

```
CLAUDE.md                  this file: map, rules, where to start
.claude/skills/            make-video (new video), revise-video (new version of one)
templates/                 brief.md, a starter project (video/) and a starter film composition
docs/craft.md              how to make it good: story, timing, motion, sound
docs/lessons.md            what went wrong before and the fix. Read it; add to it after every video
docs/blocks.md             reusable building blocks and where they live
docs/film-playbook.md      deep reference for films (the Ditto one-chain promo, every detail)
styles/                    one folder per look (rules + how to apply)
scripts/                   one command per step (see below)
studio/                    Remotion: film.mjs, polish.mjs, src/film (blocks), src/films (one file per film)
lib/recorder.ts            Playwright recorder for screencasts
aligner/                   word timings for voice clips
demos/<name>/              one folder per video: brief, script, captures, voice, music, output
sessions/                  local notes per day (not in git)
```

## One command per step

| Step | Command |
|---|---|
| New project / new version | `node scripts/new-video.mjs <name>` / `... <name>-v2 --from=<name>` |
| Capture stills | `npx playwright test -c demos/<name>/capture.config.ts` |
| Capture a screencast | `npm run record -- demos/<name>` |
| Voice | `npm run voice -- demos/<name>` then `bash scripts/align.sh demos/<name>` |
| Music (synth) | `.venv/bin/python scripts/music.py demos/<name>` |
| Music (a song) | `.venv/bin/python scripts/song-bed.py demos/<name> <song> --start=S --fade-in=2` |
| Render one frame | `node studio/film.mjs demos/<name> --still=N` → `demos/<name>/build/still-N.png` |
| Render | `node studio/film.mjs demos/<name>` (poster on frame 0, -14 LUFS) |
| Check | `bash scripts/check-video.sh demos/<name>/<output>.mp4`, then look at every sheet |
| Typecheck | `cd studio && npx tsc --noEmit -p .` |

Tools: ffmpeg is bundled (`node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg`; its `drawtext` needs
a font file). Python is `.venv/bin/python` (numpy, scipy, soundfile; no PIL). First time on a
machine: `npm run setup`.

## Hard rules

1. **Brief first.** Fill `demos/<name>/brief.md` from `templates/brief.md` before any code. Ask only
   for the gaps, in one batched question, with a suggested answer for each.
2. **Never overwrite a version.** A change is a new folder (`new-video.mjs --from`). Old outputs stay.
3. **Never touch real accounts or data.** Use a scratch database and test users. A live product site
   is read-only: no wallet connects, no trades, no posts. Fake on-screen numbers by patching the page's
   data in the browser (`page.route`), never by writing to a database.
4. **No secrets in git.** This repo is public. Secrets come from environment variables, and the
   screen must not show them (blur them in the film, crop out `localhost`).
5. **Only cleared music.** Synthesized beds, or songs the user owns or has licensed.
6. **Check before handing over.** Run `check-video.sh`, look at every sheet and every cut, and
   watch it once. A video is not done because it rendered. The user reviews only the video.
7. **Leave other local servers alone.** Do not stop or reuse ports you did not start.
8. **Ask before commit and before push.** Each needs its own yes.
9. **Log what you learn.** When a check or the user catches a bug, add it to `docs/lessons.md`.
