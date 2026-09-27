# Showreel

A 15 s motion-design reel. It has 8 scenes of 2 s each. Every cut is on the beat (30 fps, 120 bpm,
1 beat = 15 frames). One orange dot runs through the whole film.

The scenes, in order: path animation, kinetic type, shape morph, tile flip, particles to text, glitch
and 3D word ring, a 2x2 mosaic of crafts, and a signature end card. Style:
[styles/night-reel](../../styles/night-reel/README.md). Code: `studio/src/films/Showreel.tsx`.

```bash
.venv/bin/python scripts/music.py demos/showreel   # music/bed.wav (committed) + sfx
npm run film -- demos/showreel                     # -> showreel.mp4, 15.06 s, about -14 LUFS
npm run check -- demos/showreel/showreel.mp4
```

The check reports 3 hard cuts near 12 s. They are the intentional white flash into the drop.
Caught on the frame sheets: a black frame at 12.0 s. The fix: the flash now fades over the incoming
panels.
