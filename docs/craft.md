# Craft: what makes these videos good

The rules here are general. Each one came from a real video in this repo. The deep film details are
in `film-playbook.md`; the history of mistakes is in `lessons.md`.

## Story

- **One message.** Write it as one sentence before anything else. Every shot either supports it or
  goes.
- **A stranger watches it.** Every number and noun needs its meaning in the same line: "Fifty thousand
  dollars in rewards", "Four weeks of trading competition", "One link to trade". Test: read the
  script to someone with no context. Anything they ask about ("50,000 what?") is a missing word.
- **One idea per line, 2–4 s each, concrete.** Each line has a picture that shows it.
- **Open strong, close on the brand.** The first 2 s decide if people keep watching. The last frame
  is the poster (it is also baked in as frame 0), so make it the end card.

## Timing

- **The beat grid.** 30 fps at 120 bpm: 1 beat = 15 frames, 1 bar = 60 frames. Put cuts, hits and
  landings on multiples of 15. Moves that land on the music feel intentional.
- **Voice drives timing.** Key moves to aligned words (`at("v4", "traders")`), never to guesses, so a
  re-voiced line stays in sync.
- **Reading time.** Once a line has settled, keep it up at least 0.3 s per word (0.8 s for a short
  label). A product screen needs about 1.5 s of stillness before it zooms, or nobody can tell what it is.
- **Pace.** Product films start at `pace: 1.25`. First cuts are nearly always too fast. Pure motion
  pieces can run at 1.
- **Add time without re-timing.** Hold the scene clock (a `HOLDS` list, or remap the clock inside one
  scene) instead of shifting every number after it.

## Motion

- **Easing does the work.** Things arrive with `easeOut`, the camera and morphs use `easeInOut`,
  exits use `easeIn`, pops use `backOut`, landings use `bounceOut`.
- **Something always moves.** A slow push, drift or pulse, so no frame is dead.
- **Stagger.** Letters, tiles and panels start 1–4 frames apart. A wave reads as design; everything
  at once reads as a slideshow.
- **Squash and stretch, overshoot, follow-through.** Small amounts (10–40%) make objects feel physical.
- **Hand-offs.** The last object of one scene becomes the first of the next (morphs, match moves,
  wipes with a coloured edge). Never leave an empty frame between scenes.
- **Fast moves blur, then land sharp.** Blur follows speed (`speedBlur`).
- **Lift pieces, don't show whole pages.** Show a button, a card or a row big (1.3x–2.8x), with the
  page blurred or tilted behind it. Capture at 2x (phones at 3x) so it stays sharp.
- **Product screens keep their real colours** even inside a stylised look, so viewers recognise them.

## Sound

- The music sets the grid, so choose the tempo before animating.
- **Voice sits about 10 dB over the music:** duck the bed to 0.25 under each line.
- **SFX on moves:** whoosh on big moves, pop on results, click on clicks (softened: loud UI clicks
  sound harsh), an impact on the logo. About 0.45–0.5 volume.
- **A real song:** choose the start point, fade in over about 2 s, and duck it under the voice
  (`song-bed.py`).
- **Short films get short fades** (`music.fade`, about 0.6 s for a 15 s piece).
- **Final mix:** -14 LUFS, true peak under -1 dBFS (`film.mjs` does it).

## Look

- **A small palette:** a background, an ink colour, one or two accents. Contrast between neighbouring
  scenes (dark ↔ light ↔ colour) makes the cuts feel designed.
- **Type:** one display face for statements, one clean sans for UI and labels. Large sizes, tight
  spacing.
- **A style is a skin over a working film.** Get the story and timing right in plain colour first,
  then apply the look (`styles/`).
