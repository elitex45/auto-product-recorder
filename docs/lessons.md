# Lessons

What went wrong on earlier videos, and the fix. Read this before a new video. Add a line after every
video: what was caught, by whom (check, frames, user), and the fix. The Ditto film's own list is in
`film-playbook.md` §8.

## Story and copy
- **Numbers without meaning confused new viewers.** "Fifty thousand. Four weeks. One link." became
  "Fifty thousand dollars in rewards. / Four weeks of trading competition. / One link to trade."
  (riso v5, user.)
- **A reused reference song was rejected.** Keep a reference's structure, not its music (Ditto v4).

## Timing
- **The first cut is always too fast.** Start product films at `pace: 1.25` (Ditto, user).
- **A product screen zoomed before anyone could read it.** Hold the screen about 1.5 s before the
  move. Done with a clock remap inside the scene, not by re-timing the film (riso v6, user).
- **Lines left the screen too soon.** Keep 0.3 s per word after a line settles; fix with `HOLDS`
  (Ditto).

## Picture
- **A black frame at a scene change.** The flash ended one frame before the next scene started
  drawing. Overlap scenes by a few frames, and let the flash fade *over* the incoming scene
  (showreel, frame sheets).
- **Styled product screens were hard to recognise.** Keep real app colours with a second,
  unfiltered pass (riso v2, user).
- **The on-screen number looked weak (15% of the pool).** Patch the page's API reply in the capture
  (`page.route`) to show a better state; no database writes (riso v6, user).
- **Captures came out faded, with the intro splash still showing.** Wait for `networkidle` plus a
  known test id, then settle 1–2.5 s before the screenshot (riso v6).
- **Known limit:** a patched value only changes the capture it was patched in. Other shots still show
  the real number. Patch every capture that shows it.

## Sound
- **Abrupt click sounds.** Soften UI clicks (low-pass about 2.5 kHz, -16 dB) (riso v4, user).
- **A song started mid-hit.** Fade in over 2 s (`song-bed.py --fade-in=2`) (riso v4, user).
- **A 2.5 s music tail on a 15 s piece.** Set `music.fade` per film (showreel).
- **Voice buried under the music.** Duck to 0.25, not 0.45 (Ditto).

## Tools
- The bundled ffmpeg `drawtext` needs `fontfile=`, and a path with `/` breaks the filter string.
  Leave sheets unlabelled.
- zsh: `grep --include` globs fail, so use `git grep`. `$((…))` in long ffmpeg lines: run them in
  `bash -c`.
- No PIL. Read pixels with ffmpeg to rawvideo, then numpy.
- `useFilmFonts` must finish before `measure`, or text layout is wrong.
- Do not delete files, even scratch files, without asking the user. Write to a new folder.
