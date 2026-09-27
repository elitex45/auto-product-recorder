# Building blocks

A new film is mostly these pieces, combined. Shared helpers are imported. Scene-level pieces live
inside the film that made them: copy the function into your film and change its numbers. When a
piece has been copied twice, move it into `studio/src/film/`.

## Shared (import from `studio/src/film/`)

| Block | File | Use |
|---|---|---|
| `seg`, `lerp`, `clamp` | anim.ts | progress between two frames, blending |
| `easeOut`, `easeInOut`, `easeIn`, `backOut`, `bounceOut` | anim.ts | arrivals, camera/morphs, exits, pops, landings |
| `keyed`, `keyedMany`, `keyedColor` | anim.ts | multi-keyframe tracks (camera paths, colour changes) |
| `BEAT`, `beatPulse` | anim.ts | 15-frame beat grid; a kick on every beat |
| `speedBlur` | anim.ts | blur that follows speed |
| `rand(seed)` | anim.ts | deterministic random numbers (identical renders) |
| `measure(text, font)` | anim.ts | text width, for layout (fonts must be loaded) |
| `useFilmFonts` | parts.tsx | loads Inter / Display / Body before the first frame |
| `Pic`, `ShotsCtx`, `useShot` | parts.tsx | a captured still at its CSS size |
| `Plane` | parts.tsx | a page on a 3D plane, anchored on a point; children in page px |
| `Hand`, `Ring` | parts.tsx | the drawn cursor and its click ring |
| `Confetti` | parts.tsx | a seeded burst |
| `wordLine` | parts.tsx | words append on one line and de-blur in as they are spoken |

## Scene pieces (copy from a film)

| Piece | Where | What it does |
|---|---|---|
| `Box` morph | `films/DittoV3.tsx` | one rounded rect between two rects (position, size, radius, colour); most hand-offs |
| Lift | `films/DittoV3.tsx` s2, s8 | flatten the plane, draw the piece big at centre, blur the page |
| `HOLDS` + `toScene` | `films/DittoV3.tsx` | add reading time without re-timing scenes |
| Clock remap inside a scene | `films/DittoRisoV4.tsx` sDitto | hold one scene longer (`DITTO_HOLD`) |
| Riso layer (`INK`, `RisoFilter`, `hard`, `RPlane`, `Paper`, `pinkPass`) | `films/DittoRisoV2.tsx` | the ZAPS risograph look (`styles/riso`) |
| Two-pass real-colour screens | `films/DittoRisoV2.tsx` render tree | stylise everything except product screenshots |
| Path trail (`catmull`, `along`, `trail`) | `films/Showreel.tsx` s1 | a dot travels a smooth path and draws its line |
| Per-letter kinetic type | `films/Showreel.tsx` s2 | mask rise, weight wave, clock-wipe reveal, bounce drop |
| Shape morph (`SHAPES`, `radii`, `shapePath`) | `films/Showreel.tsx` s3 | circle ↔ square ↔ triangle ↔ star by radius sampling |
| Tile flip grid | `films/Showreel.tsx` s4 | diagonal-wave 3D flip revealing a word; collapse from the centre |
| Text to particles (`sampleText`, `makeParticles`) | `films/Showreel.tsx` s5 | a vortex of dots gathers into text |
| Glitch slices + 3D word ring | `films/Showreel.tsx` s6 | an RGB-split slice glitch; a spinning ring of words that speeds up |
| Panel mosaic (ball, cube, waves, counter) | `films/Showreel.tsx` s7 | 2x2 panels slam in on eighths; squash-and-stretch ball, CSS cube |
| Signature end card | `films/Showreel.tsx` s8 | shockwave, a dot slides away, the wordmark reveals |
| Viewer HUD | `films/Showreel.tsx` `hud` | timecode, section label, beat squares, blend-difference overlay |
