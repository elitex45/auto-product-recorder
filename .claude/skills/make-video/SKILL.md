---
name: make-video
description: Make a new video in this repo (product demo, promo film, launch teaser, showreel, logo sting, any motion graphics). Use whenever the user asks for a new video. Covers brief, story, capture, voice, music, film code, render, check and hand-over.
---

# Make a video

Every video takes the same seven steps. Each step writes a file, so any session can see where a video
stands and pick it up. Read `CLAUDE.md` (map and hard rules) first, then `docs/lessons.md`.

## 1. Brief (`demos/<name>/brief.md`)

1. `node scripts/new-video.mjs <name>`. This makes `demos/<name>/` (brief, film.json, empty
   shots/audio), a starter composition in `studio/src/films/<Name>.tsx`, and registers it.
2. Fill `brief.md` from the request, the product and the repo. Ask the user only for the gaps, in
   one batched question, with a suggested answer next to each.
3. Choose the engine (the table in `CLAUDE.md`) and a look (`styles/`). If the user gave a reference
   video, dissect it first (`docs/film-playbook.md` §0).

## 2. Story (`brief.md` script + the shot list)

- Write the one message, then the script: one idea per line, 2–4 s, every number with its meaning
  ("$50,000 in rewards").
- Write a shot table: frames, voice line, picture, the hand-off to the next shot. Put it on the beat
  grid (1 beat = 15 frames at 120 bpm), and leave reading time (`docs/craft.md`).
- For a user-facing product video, show the user the script before building. It is cheap to change
  now.

## 3. Assets (`shots/`, `assets/`, `audio/`)

- **Screens:** copy a `*.capture.ts` + `capture.config.ts` from `demos/zaps-ditto-riso-v6`. Capture
  stills at 2x (phones at 3x), with an `expect` on everything you capture. Use a scratch DB and test
  users only; live sites are read-only. Patch displayed numbers with `page.route`. Wait for
  networkidle plus a test id, then settle.
- **Brand:** fonts (woff2), logo and key art go in `assets/`, referenced from `film.json` `theme`.
- **Voice:** write `narration.json`, then `npm run voice -- demos/<name>`, then
  `bash scripts/align.sh demos/<name>`. Put each clip's start frame in `film.json` `voice`.

## 4. Motion (`studio/src/films/<Name>.tsx`)

- One function per scene (`s1`…`sN`), each a function of the frame that returns null outside its
  range. Overlap neighbouring scenes by a few frames so no frame is empty.
- Build from `docs/blocks.md`: import the shared helpers, and copy scene pieces from the example
  films. Apply the chosen style from `styles/<look>/`.
- Key moves to spoken words (`at("v2", "click")`) and to beats (`BEAT`, `beatPulse`).
- Typecheck: `cd studio && npx tsc --noEmit -p .`. Try single frames: `node studio/film.mjs demos/<name> --still=N`.

## 5. Sound (`music/`)

- Synth bed: set `film.json` `music` (bpm, chords, bars; `end` on the logo; `fade`), then run
  `.venv/bin/python scripts/music.py demos/<name>`. A song:
  `.venv/bin/python scripts/song-bed.py demos/<name> <file> --start=S --fade-in=2`. Only cleared music.
- Put SFX on moves in the film's `SFX` list: whoosh on big moves, pop on results, soft click on
  clicks, an impact on the logo.

## 6. Check (`build/check-<output>/`)

1. `node studio/film.mjs demos/<name>` renders the film, puts the poster on frame 0 and brings it to -14 LUFS.
2. Run `bash scripts/check-video.sh demos/<name>/<output>.mp4` and read every line:
   - length;
   - loudness about -14 LUFS;
   - `blank` must be `none`;
   - `hard cuts` should match the plan (0 for a one-chain film);
   - `frozen` only where you held on purpose.
3. **Open every sheet image and look.** Look for:
   - empty or black frames at scene changes;
   - text overflowing the frame;
   - doubles during crossfades;
   - unreadable holds;
   - anything the voice says that the picture doesn't show.
4. Extract single frames around each scene change (every frame, ±5) and look at those too.
5. Fix, render again, check again, until it's clean. Add each bug you caught to `docs/lessons.md`.

## 7. Deliver

- Hand over the mp4 path, one line on what's in it, the check numbers, and anything not done.
- Write a `README.md` in the demo folder: what it is, how to make it again (the exact commands), and
  what changed from the previous version.
- Do not commit or push until the user says so. This repo is public: no secrets, no real user data,
  mp4s stay out of git (the poster jpg is fine).
