# Riso (ZAPS night-stock risograph)

Risograph ink on dark paper, stochastic grain, animated on twos. Product screens keep their real colours.

- **Rules (source of truth):** [demos/zaps-ditto-riso-v4/STYLE.md](../../demos/zaps-ditto-riso-v4/STYLE.md)
- **How it is built and how to apply it:** [demos/zaps-ditto-riso-v4/README.md](../../demos/zaps-ditto-riso-v4/README.md)
  ("Make a new video in this style", "Rule: product screens keep the product's colours").
- **Code:** the riso block in `studio/src/films/DittoRisoV2.tsx` (`INK`, `RisoFilter`, `hard`,
  `RPlane`, `Paper`, `pinkPass`), plus `finish.sh` in the demo folder.
- **Latest example:** `demos/zaps-ditto-riso-v6` (composition `DittoRisoV4`).

In short:
1. Build the film in greys (theme: bg #000, ink #fff, accents #808080).
2. Render the scenes twice: once through `url(#riso)`, once unfiltered with only `<img>` visible.
3. Render, then run `finish.sh` (on twos, boiling grain, poster on frame 0).
