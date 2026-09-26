# Film playbook: how the Ditto v3 promo was made

This is the recipe for the "one unbroken chain" style of promo, the style of `DittoV3`. Follow it
for any new product video. A fresh agent with no memory of this project should be able to rebuild
a film like this from this file alone.

Result it describes: a 41 s, 1920x1080, 30 fps promo with 0 hard cuts. Every shot turns into the
next. The pieces are lifted out of the real product. A voice-over runs on top, with a synthesized
music bed under it and sound effects on the moves. Loudness is -14 LUFS.

---

## 1. The style in one paragraph

The style comes from dissecting a pro SaaS edit that scored 1 of 40 techniques against our old
studio. **Nothing ever cuts.** Each shot hands an object to the next one: a bar becomes a pill,
the pill becomes a button, the button becomes a circle, and so on. Most of these hand-offs are one
rounded rectangle changing position, size, corner radius and colour. The product is never a
whole page sitting in a window. Single pieces (a button, a card, a table row) are **lifted** out
of it and shown big. The page behind them is blurred, or on a tilted 3D plane. Moves land on
spoken words and on the music's beat. Fast moves are blurred, text de-blurs in word by word, and
there is always something moving slowly (a push, a drift, a wobble), so no frame is dead.

Rules that follow from this:

1. **0 hard cuts.** Check it with scene detection (§8).
2. **Every scene's last object is the next scene's first object.** Write the chain down first (§3).
3. **Lift pieces; don't show whole pages.** A page appears only as a backdrop: tilted, then blurred.
4. **Big.** Pieces are shown 1.3x to 2.8x their real size. Stills are captured at 2x (phones at 3x)
   so they stay sharp.
5. **Voice drives timing.** Every visual beat is keyed to a word's aligned time, never to a guess.
6. **Pace for reading.** The user said the first cut was "a bit fast", so the film is stretched
   with `pace: 1.25` (§6). Start new films at 1.25.

---

## 2. Pipeline and files

```
demos/<name>/
  narration.json        voice lines {id: text}
  demo.json             {"voice": "af_heart", "speed": 1.0}
  capture.config.ts     Playwright config for the still captures
  shots.capture.ts      captures stills of pages/pieces -> shots/*.png + shots/shots.json
  film.json             composition, frames, pace, theme, voice start frames, music plan
  assets/               fonts (woff2), logo svg, hero art
  audio/<id>.wav        voice clips (Kokoro); audio/index.json = clip lengths (ms)
  audio/words/<id>.json aligned word times (seconds from clip start)
  music/bed.wav         synthesized bed, ducked under the voice
  music/sfx/*.wav       one-shots: whoosh click pop chime sparkle swell impact

scripts/music.py              music bed + SFX synthesizer (numpy/scipy, no licences)
studio/film.mjs               builds props, renders a film composition, loudness-normalizes
studio/src/film/anim.ts       easing, keyframes, speed blur, seeded random, text measure
studio/src/film/parts.tsx     Plane, Pic, Hand, Ring, Confetti, Mark, wordLine, font loader
studio/src/film/types.ts      FilmProps / Shot
studio/src/films/DittoV3.tsx  the choreography (the worked example)
studio/src/Root.tsx           registers the composition (duration = frames * pace)
```

The commands, in order:

```bash
# 0. local app running on a scratch DB with test users (never a real account)

# 1. voice: narration.json -> Kokoro clips + audio/index.json, then align each clip
npm run voice -- demos/<name>
cd aligner
PATH=<dir of bundled ffmpeg>:$PATH ../.venv/bin/python -m sync.cli align \
  --audio ../demos/<name>/audio/v1.wav --transcript ../demos/<name>/audio/words/v1.txt \
  --fps 30 -o ../demos/<name>/audio/words/v1.json
cd ..
#    bundled ffmpeg: node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg

# 2. stills
npx playwright test -c demos/<name>/capture.config.ts

# 3. music + sfx (re-run whenever film.json frames/pace/voice change)
.venv/bin/python scripts/music.py demos/<name>

# 4. render (about 1 min for 1238 frames on an M-series Mac)
node studio/film.mjs demos/<name>                 # full film -> demos/<name>/<output>
node studio/film.mjs demos/<name> --still=420     # one frame -> demos/<name>/build/still-420.png
node studio/film.mjs demos/<name> --frames=300-420
```

---

## 3. Plan the chain before any code

Write the table first: voice line, picture, and the **hand-off object** to the next shot. Here is
the Ditto one. Frames are choreography frames; the output is `pace` times longer.

| # | Frames | Voice | Picture | Hands off as |
|---|---|---|---|---|
| S1 | 0–125 | "Fifty thousand dollars. Four weeks. One link." | Gradient bar grows with `$50,000` counting up on its head. It splits into 4 week segments that light up in turn, then gathers into a glass link pill | the pill |
| S2 | 106–200 | "Register in one click." | The pill morphs into the purple Register button (2.4x). The page fades in around it on a plane anchored at the button, pulls back and tilts, the hand cursor clicks, the button pops to "You're registered", then the plane pushes back in and blurs | the lifted button |
| S3 | 178–226 | — | The button morphs into a green circle, a check draws, confetti bursts, "You're in." | the circle |
| S4 | 222–304 | "Grab your Ditto link…" | The circle morphs into the link card (1.35x), which wobbles in 3D. The hand clicks Copy (ring + glow), the camera zooms to "✓ Counting", the card flips on Y | the flip |
| S5 | 296–354 | "…every trade you open through it counts." | 6 counted trade rows flip in and drift with parallax (the far ones blur). The "Counted" badges glow on the word "counts" | the rows |
| S6 | 352–452 | "The top six hundred traders get paid." | The rows shrink into prize chips, then a conveyor slides with speed blur, landing the `#151–#600 $10` chip on "traders" (the others dim). The words de-blur in above | the $10 chip |
| S7 | 444–548 | "And the pool unlocks as volume grows." | The chip squeezes into the pool bar's track. The fill grows to 15.1% with `$7,564` riding its head, then crossfades to the real pool card lined up pixel for pixel | the whip |
| S8 | 530–660 | "See exactly where you stand." | Whip-pan to the leaderboard on a tilted plane. The hand points at the "You" row, the camera flattens and zooms to 2.2x, the row lifts with a glow, and a "Rank #8 · …" caption appears | the row pushed away |
| S9 | 638–760 | "Even on your phone." | 4 phone screens fly in from the corners, spinning and blurred, into a fanned 3D row, with a slow push | the dive |
| S10 | 740–838 | "Trade on Ditto. Climb the board. Get paid." | Dive through the phones. The sentence appends word by word on one line, with the Ditto mark as the text cursor | the mark |
| S11 | 838–990 | (music impact) | The mark flies to centre and grows into the logo, with a flash, blurred hero art, "Ditto Trading Competition" and a typed subline, over a slow push | end |

Voice start frames (film.json `voice`): v1 12, v2 125, v3 228, v4 348, v5 440, v6 548, v7 650,
v8 738. Leave about 10–20 choreography frames between clips. `pace` adds more.

**Script tips:** short lines of 2–4 s each, one idea per line, and concrete numbers. Each line
must have a picture that *shows* it.

---

## 4. Capturing the pieces (stills, not a screencast)

The film animates **still screenshots**, not video. Stills are sharp at any zoom, and they give an
exact box for every piece, which is what lets morphs line up with the real UI.

`shots.capture.ts` pattern (Playwright test, 1 worker):

```ts
test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }); // phones: 390x844 @3x

/** Screenshot of one element + where it sits on the page (CSS px, page coords). */
async function piece(name: string, el: Locator, pad = 0) {
  await el.scrollIntoViewIfNeeded(); await el.page().waitForTimeout(300);
  const b = (await el.boundingBox())!; const sy = await el.page().evaluate(() => scrollY);
  const clip = { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
  await el.page().screenshot({ path: path.join(OUT, `${name}.png`), clip });
  index[name] = { w: clip.width, h: clip.height, box: { ...clip, y: clip.y + sy } };
}
/** The visible viewport at scroll y (a "page view" to put on a Plane). */
async function view(page: Page, name: string, y: number) { /* scrollTo, screenshot, index[name] = {w,h,box} */ }
test.afterAll(() => /* merge index into shots/shots.json */);
```

- Put an `expect(...)` on every element before you capture it, so a broken page fails the run.
- Log in with the backend's test-login endpoint and put the session in `localStorage` with
  `addInitScript`. Use a scratch DB and seeded test users only.
- Capture both the **page view** (for the plane) and the **pieces inside it** (for lifting). The
  `box` in shots.json is what lets a lifted piece sit exactly where it was on the plane.
- Hide secrets and personal data inside the film, not in the capture: the invite code is covered
  by a blurred copy of the card clipped to the code (`clipPath: inset(...)` plus `filter: blur`).
  Crop out anything that shows `localhost`.
- To line up an animated element with a real one (the pool bar), read the pixels to find it:
  ffmpeg to rawvideo, then numpy. PIL is not installed. The pool track sits at x 27–1097,
  y 99.5–109 CSS px inside `pool.png`.

---

## 5. Components (studio/src/film)

### anim.ts
| Helper | Use |
|---|---|
| `seg(f, a, b)` | 0..1 progress between frames a and b (clamped) |
| `lerp`, `clamp` | the basics |
| `easeOut` (0.16,1,0.3,1) | arrivals: fast start, long soft landing. The default for things coming in |
| `easeInOut` (0.65,0,0.35,1) | camera moves and morphs |
| `easeIn` | exits, whips, flips |
| `backOut(p)` | pops with a small overshoot (click result, logo grow) |
| `keyed(keys, f)` / `keyedMany([{f, x, y, s…}], f)` | multi-key eased tracks, e.g. a camera path |
| `keyedColor` | colour keyframes |
| `speedBlur(dx, dy, k, max)` | blur that follows speed: compute the value at f and f-1, then blur by the delta |
| `rand(seed)` | deterministic random numbers, so every render is identical |
| `measure(text, font)` | canvas text width, used for layout (numbers riding bar heads, word lines) |

### parts.tsx
| Part | What it does |
|---|---|
| `useFilmFonts(theme)` | Loads the Display/Body/Inter fonts and holds the render until a re-render with fonts ready has committed. Needed because canvas `measure` must see the real font |
| `ShotsCtx`, `Pic name=` | a captured still at its CSS size (the file is 2x/3x) |
| `Plane` | A page image on a 3D plane. The anchor point (page px) sits at screen centre, and `transform-origin` is the anchor, so you can animate `s, ax, ay, rx, ry, rz, dx, blur, opacity` and the anchor stays put. Children use **page px**, so a cursor or overlay inside it moves with it |
| `Hand` | Pointing-hand cursor (Lucide "pointer" path: white fill, dark stroke). Hotspot is the fingertip. Inside a Plane, pass `size = 64 / s` to keep it a constant size on screen; `press = 0.84` for about 5 frames around a click |
| `Ring` | expanding click ring |
| `Confetti` | seeded burst with drag and gravity, ~70 frames |
| `Mark` | the logo mark image |
| `wordLine(f, words, font, cx, baseline, ink)` | Words append on one line and each de-blurs in (blur 14→0, rise 24 px, opacity) when spoken. The line re-centres smoothly as it grows. It returns `end` (the right edge of the newest word) for a text cursor |

### In the film file
- `Box`: the **morph box**, a rounded rect with x, y, w, h, radius, background, glow, border
  and blur. Most hand-offs are one `Box` lerped between two rects. Inside it, the image of the
  piece is scaled with `scale(w / pieceW, h / pieceH)` and crossfaded, so it looks like the
  real UI element is changing shape.
- Colour morphs use `color-mix(in srgb, A p%, B)`.
- Gradient → glass: stack a gradient layer over a glass layer and fade the gradient out.

---

## 6. Timing: voice, pace and beat

- **Word times** come from the forced aligner (`audio/words/<id>.json`). In the film,
  `at("v4", "traders")` returns the choreography frame where that word is spoken. Key every
  visual beat off `at(...)`, not hard numbers, so a re-voiced line stays in sync. Punctuation is
  stripped from the words in film.mjs, so look up `"Ditto"`, not `"Ditto."`.
- **Pace** (`film.json "pace"`): the choreography is written in film frames, and the composition
  runs `f = frame / pace`. The voice plays at natural speed from `at * pace`, so `at()` returns
  `v.at + t0*30/pace`. The effect: every move is `pace` times slower and there is more room
  between lines, while the voice still sounds natural. SFX are placed at `frame * pace`. The
  output length is `frames * pace` (Root.tsx).
- **Music follows pace:** `scripts/music.py` plays `bpm` at `bpm / pace` and places the ducking
  at `frame * pace`, so a move that sat on a beat at pace 1 still sits on one. Written at 120 BPM
  (1 beat = 15 frames, 1 bar = 60 frames). At pace 1.25 it plays at 96 BPM.
- The music's **impact** is on the first `end` bar (bar 14 = 28 s × pace). The logo lands there
  (S11 at film frame 838–842). If you move the logo, move the bars.

---

## 7. Music and sound (scripts/music.py)

Everything is synthesized, so there is no licensing and no external service. film.json `music`:

```json
"music": { "bpm": 120, "chords": ["Am","F","C","G"], "duck": 0.25,
  "bars": ["intro","intro","main","main","main","main","main","main","main","main","main","main","break","rise","end","end","end"] }
```

- One word per bar says what plays in it:
  - `intro`: pad, soft kick, hats.
  - `main`: kick, clap, hats, eighth-note bass, pluck arp, pad, with a sidechain pump.
  - `break`: pad and arp only.
  - `rise`: noise riser plus a snare roll.
  - `end`: impact, a long chord and a sub, then a fade.
- Instruments: `kick clap hat pluck bass_note pad riser impact`, built from filtered saws and
  noise with envelopes.
- **Ducking:** the whole bed dips to `duck` under every voice clip, with a smooth ~60 ms
  envelope. **0.25** is right. 0.45 left the voice only ~6 dB above the music, which is too close.
- SFX one-shots are written to `music/sfx/`. The film places them itself: whoosh on every big
  move and flip, click on clicks, pop on results, sparkle on the confetti, chime on the check.
  Volume is 0.5, bed volume is 0.55.
- The fixed RNG seed makes the same film.json always give the same track.
- After rendering, `film.mjs` runs `loudnorm=I=-14:TP=-1:LRA=11` (audio only; video is copied).

---

## 8. Verification loop (do all of it before you hand over)

1. **Contact sheets**: every 10th frame, 5x5 tiles.
   `ffmpeg -i out.mp4 -vf "select=between(n\,0\,249)*not(mod(n\,10)),scale=384:-1,tile=5x5" -frames:v 1 -vsync vfr sheet0.png`
2. **Bursts at every hand-off**: every 3rd frame over the 45 frames around each morph. Check for
   pops, jumps, doubles and dead frames. (Run it in `bash -c`: zsh chokes on `$((…))` in these
   lines.)
3. **Hard cuts**: `ffmpeg -i out.mp4 -vf "select=gt(scene\,0.3),showinfo" -f null - 2>&1 | grep -c pts_time` must print **0**.
4. **Loudness**: `-af ebur128=peak=true` → about -14 LUFS, peak ≤ -1 dBFS.
5. **Voice over music**: compare the RMS of each voice clip with the bed under it. Aim for ≥ 10 dB.
6. Watch it once at full speed. The user reviews only the video.

Bugs this loop caught on Ditto (look for them first next time):
- The final sentence overflowed the frame. Fix: auto-fit the font size to 1560 px.
- The text cursor covered each new word. Fix: use `end`, not the growing total.
- The prize chips were too small at 2.2x. Fix: 2.8x.
- Conveyor speed blur was too strong (k 0.1). Fix: k 0.05, max 7.
- The check vanished before the circle→card morph. Fix: carry the check into the card morph and fade it there.
- Two numbers showed during the pool crossfade. Fix: blur the riding number out *before* the real card fades in.
- The page blur jumped on the row lift. Fix: ramp the blur across the flatten.
- The hero art's own mark sat behind the logo (a double logo). Fix: shift, blur and dim the hero.
- The first cut was too fast. Fix: `pace: 1.25`.

---

## 9. Gotchas

- ES modules have no `__dirname`. Use `path.dirname(new URL(import.meta.url).pathname)`.
- Headless Chrome shows no cursor. Draw the `Hand` yourself.
- `filter: blur` on a 3D-transformed parent flattens it and blurs its children. So lift a piece
  only when the plane is **flat**: animate the camera to rx = ry = rz = 0 and to scale LIFT,
  anchored on the piece. Then draw the lifted copy at screen centre × LIFT (an exact match),
  then blur the plane.
- Canvas `measure` before the fonts load gives wrong widths. That's why `useFilmFonts` exists.
- The bundled ffmpeg's `drawtext` needs a font file. Don't label contact sheets with it.
- macOS: there is no `timeout` command, and `sed -i ''` needs the empty quotes.
- Remotion serves files from `studio/public/`. `film.mjs` copies everything into `public/_film/`
  (gitignored) each render.
- Never touch other local servers' ports. For Ditto, 3000 and 3004 belonged to other work.

---

## 10. Checklist for a new film

1. Write the chain table (§3): lines, pictures, hand-off objects. Keep each line 2–4 s.
2. `narration.json` → voice clips → align every clip.
3. `shots.capture.ts`: page views plus every piece you will lift, at 2x/3x, with `expect`s.
4. `film.json`: theme (accent, accent2, bg, ink, muted, fonts, logo, hero), `frames`,
   `pace: 1.25`, voice start frames, music bars (put the `end` impact on the logo).
5. `scripts/music.py demos/<name>`.
6. Copy `studio/src/films/DittoV3.tsx` to `studio/src/films/<Name>.tsx`, rewrite the scene
   functions (`s1`…`sN`) for the new chain, and register it in `Root.tsx`. Keep: the `Box` morph,
   `Plane` + lift, `wordLine`, the `at()` word lookup, pace handling, and the SFX list.
7. Render → verification loop (§8) → fix → render again, until it's clean.
8. Hand over the mp4 path.
