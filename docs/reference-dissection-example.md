# Reference promo, dissected

Source: `~/Downloads/saas-video-edit.mp4` (LangEase promo, made with a "zellos" template, whose faint watermark sits top-left).
33.03 s, 1280x720, 30 fps, AAC stereo. Frames: `reference-frames/` (sheetNN = 3.2 s each at 5 fps; burst_T = 10 fps from T s; spec.png = audio spectrogram).

## The one idea behind the whole video

**One object never leaves the screen. It turns into the next thing.**

A word becomes a folder. The folder drops into a window. The window becomes phones. A phone becomes a blue ribbon. The ribbon becomes a progress bar. The bar shrinks into a dot. The dot becomes a check. The check becomes a card. The card becomes a row of cards. The row becomes the app. One card is picked out of the app. That card becomes a swarm of cards. The swarm flies away and the app comes back. One row of the app is lifted out. Its button is pressed. The button becomes a sparkle. The sparkle writes a checkmark and becomes a text cursor. It then shrinks into the logo mark.

There is not one hard cut in 33 s (ffmpeg scene detection at threshold 0.25 found none). Every change is a **morph** (one shape turning into another), a **match move** (the camera follows the object into the next shot), or a **blur pass** (motion blur hiding the swap). That is why it feels premium. Our v2 is built from separate scenes that fade or slide into each other. The reference is one unbroken chain.

Supporting rules seen everywhere:

1. **Never show the whole app flat.** The product is always tilted in 3D, cropped, or cut down to one piece (one card, one row, one button).
2. **Show a piece, not a page.** Each product moment shows one UI element, big, with nothing else around it.
3. **The text is tiny, and it is the product that is big.** Headline words are small (about 4% of frame height). They sit in empty space or among the product. They never cover it.
4. **Everything moves on the beat.** The music is about 120 BPM (a pulse every ~0.5 s). Almost every visual event lands on a pulse.
5. **One palette.** Lavender-white background (#f6f6fb-ish), one brand blue (≈#2f6bff→#5aa9ff gradient), dark ink (#1a1a2e) for the "settled" word. Plus one pink only in the confetti.
6. **Depth.** Soft blue glow under every lifted object. Heavy depth-of-field blur on anything behind. Motion blur on every fast move.

## Timeline, chunk by chunk

Beat numbers refer to the ~0.5 s pulses in the music.

### C1 · 0.0–1.1 s · "Turn Books"
- **Shown:** blank lavender background, faint watermark. Two words, centre: "Turn" (blue) and "Books" (ink).
- **Animation:** each word **de-blurs in**: it starts blurred and slightly large, then snaps sharp. The second word arrives one pulse after the first.
- **Colour logic:** the verb/first word is blue, the noun is ink. (This rule holds all through: the first word is brand colour, the words after it settle to ink or a lighter blue.)
- **Exit (1.0 s):** the phrase **shrinks into the distance and blurs**: a push-back (the camera flies forward past it), not a fade.
- **Why it works:** it opens on words, not UI, so the viewer learns the claim first. The music starts at 0.3 s, and the first word lands on the first hit.

### C2 · 1.2–2.1 s · "Audio"
- **Shown:** one word, "Audio", blue.
- **Animation:** it **arrives big and blurred, then settles** to size (a scale-down de-blur). It's the reverse of C1's exit, so it feels like the camera kept flying forward and hit the next word.
- **Exit (2.0 s):** it blurs out.
- **Why:** single-word shots on consecutive beats make a **word rhythm**: Books → Audio → (Video later). This is a list told as a beat pattern.

### C3 · 2.2–3.1 s · "Any language"
- **Shown:** "Any" (blue) de-blurs in. Then "language" (ink) **slides in from the right**, and the gap between the words tightens as it lands (a letter-spacing/kerning close).
- **Why:** the change in how the second word enters (slide instead of de-blur) keeps the text from feeling repetitive.

### C4 · 3.2–4.5 s · "Any language [folder] Instantly"
- **Shown:** a **sentence built around an object**. Left: "Any language". Centre: a glassy blue 3D folder icon (tilted, papers peeking out, label "Folder"). Right: "Instantly" (light blue).
- **Animation:** the folder **pops in between the words** (the words part to make room). A **grab-hand cursor** appears on the folder at ~3.8 s.
- **Exit (4.4 s):** the words blur out, and the folder stays. It becomes the hero of the next shot.
- **Why:** an **inline icon** in the headline shows the product's input (a folder of files) at the same moment as the promise. The cursor tells the viewer "something will be dragged".

### C5 · 4.5–5.8 s · the folder drop (match move)
- **Shown:** folder alone, bigger; then a **white app window seen at a steep 3D angle** (laid almost flat like a table, blue rim, "Upgrade Now" / "Help & Resources" visible in the corner).
- **Animation, frame by frame (burst_4.4):**
  - 4.5–4.7: the folder scales up and drifts, and the hand cursor carries it (a **drag**).
  - 4.7–4.9: the window **slides in underneath** from the top, tilted away.
  - 4.9–5.1: the folder **shrinks as it drops** into the window (it moves down in Z, and its shadow tightens).
  - 5.1–5.3: the folder vanishes. A **ghost card** appears in the window where it landed, and the cursor lifts away.
  - 5.3–5.7: the card **multiplies into a stack of 3 blurred white cards** (an "import" ripple / stack echo). The camera tilts the window further and pulls back.
- **Why:** a UI action (drag-and-drop upload) is **acted out with objects**, not shown as a real recording. It's cleaner and easier to read than a screen capture of an upload dialog.

### C6 · 5.8–7.3 s · "Just drop and go" + phones fly in
- **Shown:** words one at a time: "Just" (blue), "drop" (light blue), "and" (ink), "go" (grey).
- **Animation:** each word de-blurs in, on its own beat. From ~6.4 s, **4 phones fly in from the corners**, heavily tilted. They're big, cropped by the frame, and each shows a different app screen (transcript, file preview, video with a person, credits).
- **Why:** the phones start arriving **while the text is still on screen**. The next shot's content overlaps the current line. That overlap is what makes it feel continuous.

### C7 · 7.3–9.7 s · the phone tunnel · "Books. Audio. Video" → "All In One Platform"
- **Shown:** 4 phones arranged like the **walls of a tunnel** (top, bottom, left and right). Each is tilted toward the centre, with text small in the middle.
- **Camera:** a slow **push forward down the tunnel** (the phones grow a little and slide outward), plus a very slight roll.
- **Text:** "Books." → "Books. Audio." → "Books. Audio. Video" (each word appended on a beat, blue). Then at ~8.8 s the line **swaps with a horizontal blur-slide** to "All In One Platform" (blue/ink mix).
- **Depth of field:** the phone edges nearest the camera are blurred, and the centre is sharp.
- **Why:** 4 real app screens shown at once and angled = "all in one" **shown, not said**. The text builds a list in place (words appended), and then the summary line replaces it.

### C8 · 9.6–10.9 s · phone → ribbon → bar (morph)
- **Frame by frame (burst_9.6):**
  - 9.7: text blurs away. The camera **rolls and dives toward the bottom phone**.
  - 9.9–10.1: one phone fills the frame, tilted, with motion blur.
  - 10.1–10.4: a **solid blue shape pours out of the phone's right edge**, like paint or a ribbon, and stretches right.
  - 10.4–10.8: the phone slides off to the left. The ribbon **straightens into a flat horizontal band**, then **thins into a rounded bar** with a gradient (lavender → deep blue → sky blue).
- **Why:** it links "the app does work" to "progress". The bar **is** the phone's content, poured out. There's no cut, so the viewer's eye never loses the thread.

### C9 · 10.9–13.0 s · progress bar + counter
- **Shown:** a thick rounded gradient bar with a soft blue glow under it, and a number above its right end: "67/100" → "81" → "88" → "93" → "96" → "98" → "99" → "100/100".
- **Animation:**
  - The bar's right end fills rightward. The **counter rides above the bar's leading edge**, moving with it.
  - The count **eases out**: it's fast at first (67→81 in 0.2 s), then slow (98→99→100 over 0.4 s). That's how real progress "feels".
  - The number is blue, and "/100" is light grey.
  - The **camera pans right** with the bar's head, so the bar is always cut off at the left edge.
- **Why:** a simple "it's processing, it finishes" beat. It creates **tension and release** before the payoff.

### C10 · 12.8–14.3 s · bar → dot → check → confetti
- **Frame by frame (burst_12.8):**
  - 12.8–13.0: the bar **shrinks from the left into a pill, then a round dot** (it collapses toward its right end). "100/100" stays above it, then fades.
  - 13.0: "Done" (light blue) replaces the number. The dot becomes a **glassy circle** (white-to-blue gradient, thin blue ring).
  - 13.1–13.3: a **checkmark draws itself** inside the circle (stroke animation, left stroke then right stroke).
  - 13.2–14.3: **confetti bursts** from the top and sides: blue, sky blue, pink, navy. The flat paper pieces tumble, with motion blur on the near ones. It lasts ~1 s.
- **Why:** it's the **reward moment**. It's tied to the beat (13.37 is an onset). The circle is the same object as the bar, so the payoff grows out of the progress.

### C11 · 14.3–15.8 s · check → card → card row
- **Frame by frame (burst_14.2):**
  - 14.4: the confetti fades. The check circle **morphs into a rounded-square white tile** (glassy, blue rim).
  - 14.5: a video thumbnail fades in inside the tile, and it **becomes a video card** ("English Lesson", flag, date).
  - 14.6–15.0: more cards **slide in from the right** to form a row ("History Lecture", "Span travel", "Mountains"). The **row pans left** continuously (a conveyor). The cards entering and leaving at the edges are faded/blurred.
- **Why:** the "Done" result **turns into the output** (your videos). It goes result → the thing you get, in one move.

### C12 · 15.8–17.4 s · card row → the app (reveal)
- **Shown:** the card row **snaps into place inside the real app's "Library" page** (LangEase sidebar, tabs All/Videos/Files/Audio, search, grid of video cards).
- **Camera:** the app is on a **tilted 3D plane** (rotated about Y, left side nearer). It slowly **pushes in and rotates** toward flat, and the cursor (a hand) enters at ~16.6 s.
- **Audio:** the **bass drops out ~16.2–16.8 s** (spectrogram: low end empty) and comes back at ~17.0 s. It's a small "drop" timed to the zoom into the card.
- **Why:** this is the first time the viewer sees the *whole* app, and it's earned: they have already met its pieces.

### C13 · 17.0–18.2 s · pick one card (isolate)
- **Frame by frame (burst_17.4):**
  - 17.0–17.3: the camera **zooms into the grid**. The hand cursor moves onto "History Lecture".
  - 17.4: hover: the card **lifts** (blue outline, glow).
  - 17.6–17.9: the card **pops out of the page toward the camera**, and it's big. The rest of the app **blurs out and fades** (a depth-of-field rack).
  - The card **wobbles/tilts** slightly as it floats (rotateX/Y).
- **Why:** it's a click that means "open this". The chosen thing leaves its context and becomes the hero.

### C14 · 18.1–20.1 s · card → card swarm · "Multiple Languages"
- **Frame by frame:**
  - 18.1–18.3: the card **flips/spins** fast (rotateY). Motion blur splits it into several copies.
  - 18.3–18.5: the copies **scatter into a swarm** of 6 cards around the frame. Each is tilted, at different depths, **drifting slowly**. Each copy has a **different language flag** (Portugal, Italy, UK).
  - 18.6: "Multiple" appears centre (blue). At 18.8 "Languages" follows (blue). Each de-blurs in.
  - 18.8–19.9: the cards drift outward, a slow parallax (the near ones move faster and are more blurred).
- **Why:** one video → the same video in many languages. **Duplication shows the feature**: same card, different flags.

### C15 · 20.0–22.0 s · swarm out → app list view
- **Frame by frame (burst_19.9):**
  - 20.0: the cards **fly outward past the camera** (scale up, motion blur), and the text shrinks away.
  - 20.2: a **whip of white blur** (a fast diagonal swipe) crosses the frame. It is the new window entering at speed.
  - 20.4: the app comes in again, now in **list view** (rows: How-to Video, History Lecture, Birthday, Span travel, Mountains), on a **tilted plane (rotated back and to the right)**.
  - 20.6–22.0: slow **push in plus rotation**. The hand cursor **moves up the list** to the "How-to Video" row.
- **Why:** the whip hides the swap. The list view shows a different part of the product than the grid did.

### C16 · 22.0–23.5 s · lift one row out
- **Frame by frame (burst_21.9):**
  - 22.0–22.1: the app **blurs heavily and zooms** (a motion blur zoom-through).
  - 22.2: only the **"How-to Video" row** remains, now a floating white strip with a blue glow under it, large and sharp, and cropped at the right edge.
  - 22.4–23.0: the row **slides left**, revealing its right end, where a black **"Distribute To Youtube"** button sits. It's a pan along the row to the action.
  - 23.0: the hand cursor comes in from the right.
- **Why:** it leads the eye along one row from the item to its action, like reading a sentence left to right.

### C17 · 23.2–24.5 s · press the button
- **Frame by frame (burst_23.5):**
  - 23.2–23.6: the cursor moves onto the button. The camera centres on the button and zooms a bit.
  - 23.8: **press**: the button shrinks (scale ~0.9), and its colour shifts black → dark slate blue. The row card around it **fades away**.
  - 24.0: **release**: the button **pops bigger** (scale ~1.3), now a **bright blue gradient** (cyan → blue), with larger text. The cursor lifts off.
  - 24.0–24.4: the button stays centre, alone. Its gradient slowly shifts and it breathes.
- **Why:** the press is exaggerated (squash, then overshoot) so it reads at video speed. The colour change says "it worked" without words.

### C18 · 24.4–25.9 s · button → sparkle → bounce
- **Frame by frame:**
  - 24.4: a light blue **flash/wash** fills the frame (the background brightens). The button fades.
  - 24.5–24.6: a **huge 4-point sparkle** (same blue gradient, concave sides) **expands from the button** and fills the frame. It's the button turning into a star.
  - 24.8–25.4: the sparkle **shrinks down while spinning**, and it **bounces**: it squashes (wide, flat), then stretches (tall, thin), then squashes again, settling small. Each bounce lands on a pulse.
  - 25.6–25.9: it **shoots toward the top-left**, leaving a **soft trail**, and leaves the frame.
- **Why:** the sparkle is the brand's logo mark (the LangEase logo is a "J" plus a sparkle). The video is **introducing the logo's piece** before the logo appears.

### C19 · 25.9–28.4 s · sparkle writes · "Translate. Dub. Distribute"
- **Frame by frame:**
  - 26.0: the sparkle **re-enters from top-left**, trailing a thick soft stroke.
  - 26.2: the stroke draws a **big checkmark (✓)**, and "Translate." appears under it (sky blue).
  - 26.4–26.6: the check stroke fades. The sparkle **hops to the end of the text line** and sits right after the last word, like a **text cursor**.
  - 26.6: "Dub." is appended, and the sparkle moves to its end. 27.4: "Distribute" (ink), and the sparkle moves to its end.
  - The first words shift colour as new ones arrive (a sky blue → deeper blue gradient across the line). The line **re-centres** each time.
  - The sparkle **spins slightly** at each stop.
- **Audio:** the bass drops out ~26.5–28.0 s (spectrogram), a quiet break before the logo hit.
- **Why:** the sparkle acts as the **typing cursor** (an AI "writing" the tagline). The last word is ink = the full stop of the line.

### C20 · 28.4–29.2 s · text → logo (morph)
- **Frame by frame (burst_28.3):**
  - 28.5: all the text blurs out. **Only the sparkle is left**, in the centre.
  - 28.6: the "J" shape of the logo **grows from the sparkle** (it wipes in from its left). Now it is the logo mark.
  - 28.8: "Lang" appears to the right. 29.0: "Ease" follows (the words are spaced; then 29.2–29.4 the space **closes up** to "LangEase").
- **Audio:** a **bass hit at ~28.3 s** (the low end comes back, loud), the logo landing.
- **Why:** the sparkle has been the thread from 24.5 s onward. The logo is where it has been going. **Payoff of a setup.**

### C21 · 29.4–32.9 s · end card
- **Shown:** logo "J✦ LangEase", ink wordmark, blue mark, centre. Under it: "langease.ai" in small ink text.
- **Animation:**
  - The URL **types itself out** (typewriter: "lange" → "langease" → "langease.a" → "langease.ai", ~0.2 s per step, 29.6–30.0).
  - Then there's a **very slow push-in** (scale ~1.0→1.03 over 3 s): the image isn't frozen.
- **Audio:** music fades out (−16 → −31 dB over 29–31.5 s), silent from ~32 s.
- **Why:** it's calm after a busy video. The URL is typed, so it reads as "go type this".

## Audio

- **Music only as far as I can tell. No clear voice-over.** Spectrogram (`reference-frames/spec.png`) shows a steady beat with tonal/vocal-like textures (curved harmonics 17–25 s). No steady speech pattern. Not verified by ear.
- **Tempo ≈ 120 BPM.** Strong onsets every ~0.49–0.52 s (0.35, 0.72, 1.18 … 9.85, 10.33, 10.87, 11.35, 11.89, 12.38, 12.89, 13.37, 13.91, 14.40 …). My auto-tempo said 58.7 BPM; that is half-time, the real pulse is double.
- **Visual events land on onsets:** phone dive 9.85, ribbon 10.33, bar 10.87, Done 12.89/13.37, card 14.40, app zoom 16.95, card lift 17.97, swarm out 19.99, row isolate 22.01, button press 23.52/23.89, logo hit ~28.3.
- **Two "drops"** (bass removed then back): 16.2–16.8 s (before zoom into the card) and 26.5–28.3 s (before the logo). Silence-then-hit = emphasis.
- **Loudness:** about −12 to −14 dB RMS for 4–26 s; quieter intro (−16) and outro fade.
- Our promos: voice only, no music bed, no sound effects.

## Technique catalogue

| # | Technique | Where | What it is |
|---|---|---|---|
| T1 | **De-blur word entrance** | C1–C3, C6, C14 | word starts blurred + slightly scaled, snaps sharp |
| T2 | **Push-back exit** | C1 | phrase shrinks into depth + blurs (camera flies past) |
| T3 | **Scale-down arrival** | C2 | word arrives huge + blurred, settles to size |
| T4 | **Word appending in place** | C7, C19 | the line grows word by word, re-centring |
| T5 | **Two-tone words** | throughout | first/key word brand blue, others ink or light blue |
| T6 | **Inline object in a sentence** | C4 | an icon sits between the words of the headline |
| T7 | **Acted-out UI action** | C5 | drag-and-drop shown with objects and a hand cursor, not a recording |
| T8 | **Stack echo** | C5 | one card multiplies into a stack of blurred copies |
| T9 | **Overlap next shot under text** | C6 | the next visuals arrive while the line is still up |
| T10 | **Device tunnel / collage** | C7 | 4 phones as tunnel walls, each with a different screen |
| T11 | **Morph between objects** | C8, C10, C11, C18, C20 | shape A turns into shape B (phone→ribbon→bar→dot→check→card; button→sparkle→logo) |
| T12 | **Progress bar + riding counter** | C9 | a counter above the bar's head, eased (fast then slow) |
| T13 | **Checkmark draw** | C10, C19 | a stroke draws itself |
| T14 | **Confetti burst** | C10 | ~1 s of brand-coloured paper, motion blurred |
| T15 | **Conveyor row** | C11 | cards slide in and keep panning, edges fade |
| T16 | **Tilted 3D app plane** | C12, C15 | the whole app on a plane at a steep angle, slowly rotating flat while the camera pushes in |
| T17 | **Isolate one element** | C13, C16 | one card/row lifts out of the page, the rest blurs away (depth-of-field rack) |
| T18 | **Float wobble** | C13, C14 | a lifted object tilts gently in 3D |
| T19 | **Flip into duplicates** | C14 | fast spin, motion blur splits it into copies |
| T20 | **Swarm with parallax** | C14 | copies at different depths drifting at different speeds |
| T21 | **Whip / swipe transition** | C15 | a fast blurred swipe hides the scene change |
| T22 | **Zoom-through blur** | C16 | radial/motion blur while zooming in = a transition |
| T23 | **Pan along an element to its action** | C16 | slide along a row to reveal the button at its end |
| T24 | **Exaggerated press** | C17 | squash (0.9) → overshoot pop (1.3) + colour change |
| T25 | **Flash wash** | C18 | the background brightens for a frame or two on the hit |
| T26 | **Squash-and-stretch bounce** | C18 | a shape bounces with cartoon squash |
| T27 | **Motion trail** | C18, C19 | a soft streak behind a moving object |
| T28 | **Sparkle as text cursor** | C19 | the brand mark sits at the end of the typed line |
| T29 | **Logo built from a recurring motif** | C20 | the object from earlier becomes the logo |
| T30 | **Word-gap close** | C3, C20 | two words arrive spaced, then snap together |
| T31 | **Typewriter URL** | C21 | the URL types in |
| T32 | **Slow push on the end card** | C21 | a tiny scale-in so the frame is never frozen |
| T33 | **Depth of field everywhere** | C7, C12–C16 | near and far objects blurred, focus plane sharp |
| T34 | **Motion blur on every fast move** | all moves | no fast move is ever crisp |
| T35 | **Soft coloured under-glow** | C9, C11, C13, C16, C17 | blue blurred shadow under every lifted object |
| T36 | **Beat-synced edits (~120 BPM)** | all | events land on 0.5 s pulses |
| T37 | **Bass drop-out before a hit** | 16.5 s, 27–28.3 s | the music thins out, then the hit returns |
| T38 | **Hand cursor (grab/point)** | C4, C5, C12–C17 | a big stylised hand, not an arrow; switches grab vs point |
| T39 | **Camera always moving** | all | a slow drift/push even in "still" shots; never locked |
| T40 | **Watermark** | all | faint brand mark top-left, all the time |

## Have vs missing (our studio today)

Legend: **Have** = works now. **Partly** = something close but not the same. **Missing** = nothing like it.

| # | Technique | Status | What we have / what it would take |
|---|---|---|---|
| T1 | De-blur word entrance | **Have** | KineticText blurs words in |
| T2 | Push-back exit | **Partly** | `exit: zoomOut` scales the whole scene, with no per-phrase depth push |
| T3 | Scale-down arrival | **Partly** | `enter: zoomIn` on the whole scene; not per word |
| T4 | Word appending in place | **Partly** | KineticText adds words as spoken, but doesn't re-centre smoothly |
| T5 | Two-tone words | **Partly** | new word = accent, then settles to ink; no fixed "key word stays blue" |
| T6 | Inline object in a sentence | **Missing** | needs a kinetic phrase with an image/icon slot |
| T7 | Acted-out UI action | **Missing** | we only replay recordings; needs animated stand-in objects (icon + cursor + drop target) |
| T8 | Stack echo | **Missing** | |
| T9 | Overlap next shot under text | **Partly** | scenes overlap by EDGE (10 frames) only; no text-over-next-visual layer |
| T10 | Device tunnel / collage | **Missing** | needs several stages/screenshots on 3D planes at once |
| T11 | Morph between objects | **Missing** | the biggest gap; needs shared-element transitions between scenes (the same object's box/shape/colour interpolated across the scene boundary) |
| T12 | Progress bar + riding counter | **Partly** | StatCounter counts up with ease; no bar, and the counter doesn't ride anything |
| T13 | Checkmark draw | **Missing** | easy: SVG stroke dash (Highlight already uses dash offset) |
| T14 | Confetti | **Missing** | easy: seeded particles in brand colours |
| T15 | Conveyor row | **Missing** | FeatureCards pop in place; no panning row |
| T16 | Tilted 3D app plane, rotating flat | **Partly** | ScreenClip has a 3D window with entrances rise/pop/swing, but it settles flat fast; no long slow rotate-while-pushing |
| T17 | Isolate one element | **Missing** | we zoom the camera to a mark; we don't lift the element out and blur the page. Doable: crop the mark's box from the recorded frame into its own layer, scale it up, blur the rest |
| T18 | Float wobble | **Missing** | small: gentle rotateX/Y on a lifted layer |
| T19 | Flip into duplicates | **Missing** | |
| T20 | Swarm with parallax | **Missing** | |
| T21 | Whip / swipe transition | **Missing** | transitions list has slide, not a motion-blurred whip |
| T22 | Zoom-through blur | **Partly** | cutBlur hides recording cuts with blur; no directional zoom blur |
| T23 | Pan along an element | **Partly** | focus can move between marks; no "slide along one element" |
| T24 | Exaggerated press | **Partly** | cursor click ripple; the button itself doesn't squash/pop (it's inside the video) |
| T25 | Flash wash | **Missing** | small |
| T26 | Squash-and-stretch | **Missing** | |
| T27 | Motion trail | **Missing** | |
| T28 | Brand mark as text cursor | **Missing** | |
| T29 | Logo built from motif | **Missing** | LogoOutro fades the logo in; nothing leads to it |
| T30 | Word-gap close | **Missing** | small |
| T31 | Typewriter URL | **Missing** | small (we also have no real URL for Ditto yet) |
| T32 | Slow push on end card | **Partly** | hero image scales 1.3→1.05; the logo itself is static |
| T33 | Depth of field | **Partly** | only as a transition blur; no persistent near/far blur |
| T34 | Motion blur on fast moves | **Missing** | Remotion has `<Trail>`/`<CameraMotionBlur>` in @remotion/motion-blur; not used |
| T35 | Coloured under-glow | **Partly** | StageGlow on dark themes, Highlight glow; not under every lifted element |
| T36 | Beat-synced edits | **Missing** | we sync to the voice words (aligner). No music, so no beats |
| T37 | Bass drop before a hit | **Missing** | no music |
| T38 | Hand cursor | **Partly** | we draw an arrow cursor with a click ring; no grab/drag state |
| T39 | Camera always moving | **Partly** | camera eases between focuses, then holds still |
| T40 | Watermark | **Missing** | trivial |

**Count:** have 1, partly 15, missing 24 (of 40).

## What this means for us (for when we build; not built)

The difference is not "more animation types". It's three structural things:

1. **Continuity instead of scenes.** They pass one object from shot to shot (T11, T29). We fade scene into scene. This needs a way for scene N's last object to become scene N+1's first object.
2. **Pieces instead of pages.** They show one card, one row, one button, lifted out (T17, T23, T24). We show the recorded page and zoom the camera. We already record `marks` (element boxes), so we can crop those pieces out of our own frames and float them. No new recording needed.
3. **A music clock.** They cut to a ~120 BPM grid (T36, T37). We only have the voice clock. A music bed plus a beat grid would give every non-voice move a place to land.

Everything else (confetti, check draw, whip, flash, typewriter, trail, wobble, watermark) is small, self-contained components.

Two honest limits:
- Their product shots are **designed mock-ups** (clean, perfect data, sometimes redrawn). Ours are real recordings of a live page, with dense text. The "lift one piece out" technique is how we get close without redrawing the app.
- Their video has **no voice**; ours is voice-led. Their text is short (1–3 words per shot) because it's all the viewer gets. With a voice we can keep text even shorter, or drop it on product shots.

## Method (how this was checked)

- Frames at 5 fps for the whole video (`sheet00`–`sheet10`), plus 10 fps bursts at 4.4, 9.6, 12.8, 14.2, 17.4, 19.9, 21.9, 23.5 and 28.3 s.
- Scene detection (`select=gt(scene,0.25)`): 0 hard cuts.
- Audio: spectrogram, per-second RMS, spectral-flux onsets and autocorrelation tempo (numpy, in .venv).
- Not verified: whether there is a faint voice in the music (not listened to by ear); exact easing curves (read off frames, not measured).
