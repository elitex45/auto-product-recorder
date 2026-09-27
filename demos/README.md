# Demos

One folder per video. Each folder holds the brief, the script, captures, voice, music and output.
Voice clips, renders and mp4s are not in git; each README says how to make them again.

| Folder | What | Engine | Style |
|---|---|---|---|
| `example/` | Tour of playwright.dev, desktop and phone | screencast (`npm run demo`) | plain |
| `google/` | Google search, plus a polished promo (`edit.json`) | screencast + `npm run polish` | plain |
| `zaps-ditto-riso-v4/` | Ditto × Zaps promo with a licensed song | film (`DittoRisoV2`) | riso |
| `zaps-ditto-riso-v6/` | Latest Ditto × Zaps promo: clearer opening, longer screen hold, pool at 90% | film (`DittoRisoV4`) | riso |
| `showreel/` | 15 s motion-design reel, 8 crafts on the beat | film (`Showreel`) | night-reel |
| `hello-film/` | The starter project from `scripts/new-video.mjs`, rendered as is | film (`HelloFilm`) | none |

Start a new one with `node scripts/new-video.mjs <name>` and follow `.claude/skills/make-video`.
