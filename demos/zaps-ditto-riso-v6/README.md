# Ditto × Zaps — night-stock risograph edit

A 52.2-second promo for the Ditto Trading Competition on Zaps, printed in the ZAPS house style:
risograph ink on dark paper, stochastic grain, animated on twos. Product screens keep their real
colours so viewers recognise them when they open the app.

- Style source of truth: [STYLE.md](STYLE.md) (the ZAPS house-style doc, unchanged).
- Film code: [studio/src/films/DittoRisoV4.tsx](../../studio/src/films/DittoRisoV4.tsx)
  (composition `DittoRisoV4`).
- Music: [music/source/ayush-music-new.mp3](music/source/ayush-music-new.mp3), from 0:28, with a
  2 s fade-in.
- Poster: `zaps-ditto-promo-riso-v6.jpg`. The mp4 is not in git (over 100 MB); render it with the
  steps below.

## What changed since v4 (demos/zaps-ditto-riso-v4)

- The opening lines say what they mean: "Fifty thousand dollars in rewards.", "Four weeks of trading
  competition.", "One link to trade." (voice and subtitles). The longer clips push everything after
  them 46 film frames later.
- The Ditto trade screen stays whole on screen for `DITTO_HOLD` (36 film frames, about 1.5 s) with a
  slow 4% drift before the camera pushes in, so viewers can read it.
- The pool fills to 90% ($45,000 of $50,000). `shots/pool.png` was re-taken by `pool90.capture.ts`,
  which renders the real page and changes only the board reply in the browser (no database writes).
  The phone and leaderboard shots still show the older 15.1% capture in small text.

## Make it again

From the repo root:

```bash
npm run voice -- demos/zaps-ditto-riso-v6          # Kokoro voice -> audio/ (gitignored)
# then align each clip -> audio/words/<id>.json (docs/film-playbook.md, step 1)
.venv/bin/python scripts/song-bed.py demos/zaps-ditto-riso-v6 \
  demos/zaps-ditto-riso-v6/music/source/ayush-music-new.mp3 --start=28 --fade-in=2   # music/bed.wav
node studio/film.mjs demos/zaps-ditto-riso-v6        # raw render + poster + -14 LUFS
bash demos/zaps-ditto-riso-v6/finish.sh              # on twos, boiling grain, poster on frame 0
```

Output: `demos/zaps-ditto-riso-v6/zaps-ditto-promo-riso-v6.mp4` (1920×1080, 24 fps, about -15.0
LUFS). `music/bed.wav` is already committed, so the second step is only needed when the song or the
start point changes. The screenshots in `shots/` came from `shots.capture.ts` against a local test
setup (test users on a scratch database, `E2E_SECRET` from the environment). Re-capture only when
the product UI changes.

## Make a new video in this style

1. **Start from a normal film.** Build the film as usual (see
   [docs/film-playbook.md](../../docs/film-playbook.md)): shots, narration, `film.json`, a film
   composition. Get timing and story right in colour first. The riso pass is a skin over it.
2. **Copy the riso layer.** Copy `DittoRisoV4.tsx` and reuse its riso block (`INK`, `RisoFilter`,
   `hard()`, `RPlane`, `Paper`, `pinkPass()`) and its render tree (below). Register the
   composition in `studio/src/Root.tsx`.
3. **Set the theme to greys** in `film.json`. The filter prints by brightness, so scenes are drawn
   in greys and the filter picks the ink:
   ```json
   "accent": "#808080", "accent2": "#808080", "bg": "#000000", "ink": "#ffffff", "muted": "#808080"
   ```
   Black becomes paper (#0C0A16), mid-grey becomes violet (#8B30FF), white becomes ivory
   (#F2EEE3).
4. **Keep product screens in their real colours** (see the rule below).
5. **Music:** synthesized with `scripts/music.py`, or a real song with `scripts/song-bed.py`
   (`--start` to pick the section, `--fade-in` so it doesn't start mid-hit). Both duck under
   the voice.
6. **Render, then `finish.sh`.** Copy `finish.sh` and change the file names. The raw render is
   smooth 30 fps; the finish makes it riso.
7. **Check the frames.** No glow, no blur, no pink outlines, yellow only on the ZAPS bolt, product
   screens in real colour. Look at the frames and the video before handing it over.

## Rule: product screens keep the product's colours

Any product screen — the Ditto trade screen, the Zaps register page, the leaderboard, link card,
prize chips, pool card, phone screens — shows its **real app colours**, not riso ink. People
should recognise the screen when they open the app. Everything around the screens stays riso: the
paper, the light wedge, the words, the bars, the subtitles, the end card.

How it's done: the scenes are rendered **twice**.

```tsx
<RisoFilter seed={Math.floor(useCurrentFrame() / 2)} />   {/* grain reseeds on twos */}
<style>{`.riso-scene *, .color-pass * { filter: none !important; }
         .color-pass * { visibility: hidden; }
         .color-pass img { visibility: visible; }
         .color-pass img.bg { visibility: hidden; }`}</style>
<AbsoluteFill className="riso-scene" style={{ filter: "url(#riso)" }}>
  <Paper /> {scenes}           {/* pass 1: everything, printed in riso ink */}
</AbsoluteFill>
<AbsoluteFill className="color-pass">
  {scenes}                     {/* pass 2: same scenes, unfiltered, only <img> screenshots visible */}
</AbsoluteFill>
{top layer: Ditto mark, ZAPS lockup}  {captions}
```

The second pass has the same positions, transforms and fades, so each screenshot lands exactly on
its riso copy. Background art that is not a product screen gets `className="bg"` so it stays in
riso. Limitation: anything drawn *on top of* a screenshot (a ring or highlight) is covered by the
colour pass. Put such marks outside the screenshot or in the top layer.

Screens still follow the style's other rules: hard edges, no drop shadow, no blur, no glow.

## How the riso look is built

All of it is local: an SVG filter plus ffmpeg. No image model is used.

| Style rule (STYLE.md) | Implementation |
|---|---|
| Five inks, no blends | `RisoFilter`: luminance → add `feTurbulence` noise (k3 0.6) → `discrete` table with three levels: paper / violet / ivory |
| Stochastic dither | fractal noise at `baseFrequency 0.42`, seed = `floor(frame / 2)` |
| Pink = misregistration sliver only | light areas (lum > 0.7) offset 3 px up-right, minus everything inked (lum > 0.25) → pink only where the offset escapes |
| Light is a hard flat shape | `Paper`: black ground plus one hard wedge polygon at rgb(62,62,62). No radial gradients, no flashes |
| No blur, depth from dot size | `.riso-scene * { filter: none !important }` kills every CSS blur. `hard()` keeps only zero-blur box-shadows. `RPlane` has no drop shadow |
| Yellow only on the ZAPS bolt | the ZAPS lockup and the green Ditto mark sit in a top layer outside the filter (the Ditto mark stays green, the one agreed exception) |
| Cards print in two passes | subtitles in ivory on paper. `pinkPass(t)`: the pink text-shadow lands 2 frames late at 6 px, then settles to 3 px over 4 frames |
| On twos, boiling grain | `finish.sh`: `fps=12,fps=24,noise=c0s=7:c0f=t`, crf 26, `-tune grain`. The poster is re-overlaid on frame 0 (the fps step drops it) |
| Type | Zodiak display, Switzer interface (`assets/`) |

## Files

| Path | What |
|---|---|
| `STYLE.md` | ZAPS house style: palette, rules, image-model prompt, failure modes |
| `film.json` | frames, pace 1.25, grey theme, voice start frames, music duck |
| `narration.json` / `demo.json` | voice lines / Kokoro voice |
| `shots/`, `shots.capture.ts`, `capture.config.ts` | product screenshots and the Playwright spec that took them |
| `pool90.capture.ts` | re-takes `shots/pool.png` at 90% unlocked (`npx playwright test -c capture.config.ts pool90.capture.ts`) |
| `assets/` | fonts, Ditto mark, key art, Zaps lockup |
| `music/bed.wav` | the exact bed in the final video |
| `music/source/ayush-music-new.mp3` | the song it was cut from |
| `music/sfx/` | one-shots. `click.wav` is softened (lowpass 2.5 kHz, -16 dB) so the three UI clicks don't jump out |
| `finish.sh` | the riso finish |
