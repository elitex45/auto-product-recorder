# Night reel

A motion-design showreel look: fast, confident, cut hard on the beat.

- **Palette:** ink #0E0E12, paper #F3EFE6, orange #FF5B1F, blue #3D5AFE. Neighbouring scenes flip
  between dark, light and colour.
- **Type:** Inter 900 for kinetic words, a serif display face (Zodiak) for the signature.
- **Motion:**
  - One scene per 2 s (8 beats at 120 bpm), each showing a different craft.
  - One recurring object (the orange dot) ties the scenes together.
  - Staggers, squash and stretch, and overshoot everywhere.
  - A viewer HUD (timecode, section label, beat squares) over everything, blended with
    `mix-blend-mode: difference`.
- **Sound:** a synth bed at 120 bpm with a break and a rise before the drop. Whooshes on the
  transitions, a sparkle on the particles, a pop on the signature.
- **Example:** `demos/showreel`, `studio/src/films/Showreel.tsx`.
- **Watch for:** scene changes must overlap. A flash has to fade over the next scene, never into
  an empty frame.
