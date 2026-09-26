# auto-product-recorder

Make a narrated demo video of any website with one command.

You write two things: **what the voice says** and **what the browser clicks**.
The tool does the rest:

1. **Voice**: [Kokoro](https://github.com/hexgrad/kokoro) (a free, local,
   open-weight text-to-speech model) turns each sentence into a clip.
2. **Record**: Playwright drives a headless Chromium through your script and
   saves every frame via the Chrome DevTools screencast. Each step waits until
   its sentence has been spoken, so voice and picture stay in sync.
3. **Assemble**: ffmpeg adds title cards, puts each clip at the moment its
   step started, and writes a 1080p mp4 (plus a smaller copy).

No screen-recording permission, no window on your screen, no API keys. Works
on macOS and Linux.

```
narration.json ─voice─▶ audio/<beat>.wav + audio/index.json (ms per beat)
                                  │
record.spec.ts ◀──────────────────┘  each rec.beat() lasts as long as its clip
   │ CDP screencast → frames/<stage>/NNNNNN.jpg + frames.json
   ▼
assemble ─▶ title cards + stages + voice ─▶ <output>.mp4
```

## Setup (once)

You need **Node 20+** and either **[uv](https://docs.astral.sh/uv/)** or
**Python 3.10–3.12** (Kokoro does not support 3.13 yet).

```bash
# macOS
brew install uv espeak-ng     # espeak-ng is optional; helps Kokoro say rare words
# Linux: install uv (see link above), then: sudo apt-get install espeak-ng

git clone https://github.com/elitex45/auto-product-recorder.git
cd auto-product-recorder
npm run setup
```

`npm run setup` installs the Node packages (including a static ffmpeg),
Playwright's Chromium, and Kokoro in `./.venv`, then downloads the voice model
(~330 MB, stored in `~/.cache/huggingface`) and the word aligner model used by
the studio (~1.2 GB, stored in `~/.cache/torch`).

## Try it

```bash
npm run demo -- demos/google      # → demos/google/google-search-demo.mp4
npm run demo -- demos/example     # → demos/example/example-demo.mp4
```

A run takes about a minute. The first voice step is slower while the model loads.

## Make a video of your own product

```bash
cp -r demos/example demos/my-product
```

Then edit the three files in `demos/my-product/`:

### 1. `narration.json`: what the voice says

```json
{
  "t0": "This is a quick tour of My Product.",
  "d1": "Here's the dashboard. Your projects are on the left.",
  "d2": "Click New project, give it a name, and you're done."
}
```

Keys are **beat ids**. A beat is one sentence or two, under ~12 seconds.
Convention: `t…` for title cards, `d…` desktop steps, `m…` phone steps. Write
it the way you would explain it to a friend.

### 2. `record.spec.ts`: what the browser does

```ts
const rec = new Recorder("desktop");      // stage name → frames/desktop/
await rec.start(page);
await rec.beat("d1", async () => {        // voice d1 plays while this runs
  await expect(page.getByText("Projects")).toBeVisible();
  await hold(1500);
});
await rec.beat("d2", async () => {
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").pressSequentially("Launch plan", { delay: 80 });
});
await rec.stop();
```

- A beat always lasts at least as long as its clip (+0.9 s). If your clicks
  take longer, the video waits for them in silence.
- `hover()` before `click()` so the viewer sees where the cursor goes.
- `hold(ms)` after a page loads so people can read it.
- `scrollTo(page, y)` scrolls smoothly; `settle(page)` waits for loads.
- Put `expect(...)` on whatever the voice claims. If the app is broken the
  run fails, instead of producing a video that says something untrue.
- Phone stage: `test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: PHONE_UA })`,
  as in the examples. It is centred on the 1080p canvas.

**Signed-in pages:** never record with a real person's account. Log in a test
user in the spec, or set the session cookie with `context.addCookies(...)`.
Behind HTTP Basic Auth? Set `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD`.
Local app? Start it first (a production build looks cleaner than a dev server)
and point the spec at `http://localhost:3000`, or set `BASE_URL`.

### 3. `demo.json`: voice, order, and title cards

```json
{
  "output": "my-product-demo.mp4",
  "voice": "af_heart",
  "speed": 1.0,
  "background": "0x0b0a14",
  "sequence": [
    { "card": "t0", "title": "My Product in 60 seconds", "subtitle": "A quick tour" },
    { "stage": "desktop" },
    { "stage": "mobile" }
  ]
}
```

`sequence` is played top to bottom. A `card` shows a title on a flat
background and speaks the beat of the same id. A `stage` is a recording made
by `new Recorder("<stage>")`.

Then run it:

```bash
npm run demo -- demos/my-product
```

## Make it a polished promo (studio)

The plain video is step one. `studio/` turns the same recording into a
SaaS-style promo: big words that arrive one by one, the product in a floating
3D browser or phone, the camera zooming to what matters, a drawn cursor that
clicks, and a logo ending. It uses [Remotion](https://www.remotion.dev)
(React components rendered to video) and keeps the Kokoro voice.

```bash
npm run demo   -- demos/google     # record first (plain video)
npm run polish -- demos/google     # → demos/google/google-search-promo.mp4
```

The storyboard is `demos/<name>/edit.json`:

```json
{
  "output": "my-product-promo.mp4",
  "theme": { "accent": "#1a73e8", "accent2": "#34a8ff", "bg": "#f6f8fc", "ink": "#0b1426",
             "muted": "#6b7280", "brand": "My Product", "url": "myproduct.com" },
  "scenes": [
    { "type": "kinetic", "vo": "t0", "phrases": ["Meet", "My Product"] },
    { "type": "screen", "stage": "desktop", "title": "Ask anything",
      "focus": [{ "mark": "search-box", "scale": 1.7 }], "clicks": ["search-box"] },
    { "type": "outro", "seconds": 3 }
  ]
}
```

| Scene | What it shows |
|---|---|
| `kinetic` | `phrases` one after another, over voice clip `vo`. Each word appears the moment it is spoken, so phrases must use the clip's words, in order |
| `screen` | recorded `stage` (optionally `from`/`to` seconds) in a floating window. `focus` zooms to marks, `clicks` draws the cursor clicking them |
| `outro` | brand mark, `theme.brand` and `theme.url` |

Zooms and clicks need to know where things were, so mark them in the spec
right before the action:

```ts
await rec.mark("search-box", page.locator("textarea[name=q]"));
await page.locator("textarea[name=q]").click();
```

`cd studio && npm run preview` opens Remotion's editor to scrub through a
render; components live in `studio/src/components/`.

**License note:** Remotion is free for individuals and companies of up to 3
people; bigger companies need a [company license](https://www.remotion.pro).

## Run one step at a time

```bash
npm run voice    -- demos/my-product   # only re-makes clips whose text changed
npm run record   -- demos/my-product
npm run assemble -- demos/my-product
```

**Re-record after changing the words.** The recorder reads the clip lengths at
record time; if you only re-run voice and assemble, the voice drifts.

## Voices

Set `voice` in `demo.json`, or override once with `VOICE=bf_emma npm run demo -- …`.
`SPEED=1.1` speaks faster.

| Voice | Accent | Notes |
|---|---|---|
| `af_heart` | American, female | best-rated, default |
| `af_bella` | American, female | very good |
| `am_michael`, `am_fenrir` | American, male | good |
| `bf_emma` | British, female | best British |
| `bm_george` | British, male | good |

Full list and grades: [Kokoro VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).
The first letter picks the language (`a` American, `b` British); other
languages need `espeak-ng` and `lang` set in `demo.json`.

## Checking the result

```bash
ffprobe -v error -show_entries stream=codec_name,width,height -of compact demos/google/google-search-demo.mp4
ffmpeg -i demos/google/google-search-demo.mp4 -af volumedetect -vn -f null - 2>&1 | grep -E "mean|max"   # mean ≈ -23 dB
```

## Troubleshooting

- **"audio/index.json not found"**: run the voice step first (`npm run demo` does).
- **Robot check / CAPTCHA page**: some sites (Google search results, for
  example) block scripted browsers. Record the parts they allow, or your own
  app. The Google demo stops at the suggestions list for this reason and fails
  if the robot page appears.
- **Phone stage shows a tiny desktop page**: set a phone `userAgent` (see above).
- **Blurry phone text**: use `deviceScaleFactor: 2`.
- **No font found**: set `TITLE_FONT` / `BODY_FONT` to any `.ttf` file.
- **Kokoro exits with `Error processing file '…/espeak-ng-data/phontab'`**:
  seen when the repo sat in a deep temp folder. Clone it into a normal folder
  (e.g. `~/code/auto-product-recorder`) and run `npm run setup` again.
- **Use your own ffmpeg**: `FFMPEG=/path/to/ffmpeg`. It needs `libx264`, `aac`
  and `drawtext`.
- **Disk**: frames take ~1 MB per second of recording. They live in
  `demos/*/frames/` (git-ignored); delete them when you're done.

## Layout

```
lib/recorder.ts        Recorder class + hold / settle / scrollTo helpers
scripts/voice.py       narration.json → Kokoro clips + index.json
scripts/assemble.mjs   frames + clips + cards → mp4
scripts/run.mjs        runs voice → record → assemble
studio/                Remotion project: polish.mjs + reusable components
aligner/               word timing for voice clips (forced alignment, runs in .venv)
demos/example/         tour of playwright.dev (desktop + phone)
demos/google/          Google search: home page, typing, suggestions
setup.sh               one-time install
```

## Credits

Original demo recorder (Playwright + CDP screencast + ffmpeg method) by
Akshay ([@starlord-defi](https://github.com/starlord-defi)). This repo makes it
generic and swaps the macOS `say` voice for Kokoro.

Voice: [Kokoro-82M](https://github.com/hexgrad/kokoro) by hexgrad (Apache-2.0).
Browser automation: [Playwright](https://playwright.dev). Video: [ffmpeg](https://ffmpeg.org).
