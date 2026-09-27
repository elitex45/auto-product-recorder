---
name: revise-video
description: Change an existing video in this repo (new copy, timing, music, numbers on screen, style) as a new version, without touching earlier versions. Use when the user gives feedback on a video or asks for "another version".
---

# Revise a video

Earlier versions are never overwritten. Every change becomes a new folder with its own composition.

1. **Restate the change.** List each change the user asked for as one line: what, where (time or
   scene), and to what. If the feedback is a feeling ("too fast", "can't understand it"), name the
   concrete fix you'll make. For more than a small tweak, confirm the list with the user before
   building.
2. **Make the version:**
   `node scripts/new-video.mjs <name>-v<N> --from=<previous demo>`.
   - This copies the folder (voice clips included, renders excluded) and the film code under a new
     composition name.
   - It registers the new composition and starts `CHANGES.md`. Write the change list there.
3. **Change only what was asked:**
   - **Copy / voice line:** edit `narration.json`. Then run `npm run voice -- demos/<new>` and
     `bash scripts/align.sh demos/<new> <ids>`. If the length changed, shift the later start frames
     in `film.json` `voice`.
   - **More time on a moment:** hold that scene's clock (see `docs/blocks.md`: `HOLDS`, clock
     remap). Then add the hold length to `frames` and to every later voice start and SFX. Keep holds
     a multiple of 15 frames, and add a music bar so the `end` still lands on the logo.
   - **A number on screen:** re-capture with the value patched via `page.route`, into the new folder.
     Check every shot that shows the same number.
   - **Music:** re-run `music.py` or `song-bed.py` after any change to frames, pace or voice timing.
4. **Render and check** exactly as in `make-video` step 6. Compare against the previous version at
   the changed moments: extract the same frames from both.
5. **Deliver.** Give the new mp4 path and a list of what changed. Anything asked for but not done,
   say so. Add a "What changed" section to the new folder's README. Add what you learned to
   `docs/lessons.md`.
