# ZAPS house style — night-stock risograph

The look used for "Paid in Dust" and the Aerodrome campaign film. This file is the
source of truth. Copy the block in **The prompt** into any image model; everything
above it explains why each line is there, so you can adapt without breaking it.

## What the style is called

Full name: **duotone risograph screenprint on dark stock, stochastic dither,
animated on twos.**

Four separate traditions stacked, and it helps to know which is which, because
models respond to the specific term and not to "riso" alone:

| Element | The real term | What it does here |
|---|---|---|
| Limited inks | spot-colour / duotone printing | five inks, no blends, no gradients |
| The grain | stochastic (FM) dithering | random dot placement, not a dot grid |
| The texture | halftone screen + paper tooth | dot size carries depth |
| The offset | ink misregistration / mistrapping | pink hairline where passes miss |
| The motion | animation on twos | 12 unique frames per second of 24 |

Nearest references if someone asks: Risograph zine printing, Push Pin Studios
posters, Saul Bass title sequences, and the flat spot-colour work of Malika Favre —
but darker, and printed badly on purpose.

## The palette — five inks, nothing else

```
#0C0A16  paper        violet-black night stock, the ground for everything
#F2EEE3  ivory/cream  the light ink; also the paper for day scenes
#8B30FF  violet       the only saturated colour, screen light and figures
#C8288F  fluor pink   hairline misregistration fringe ONLY, never a fill
#F5E64B  acid yellow  the ZAPS bolt ONLY, four or five appearances per film
```

Yellow is rationed. If it appears more than five times in a 40-second film it stops
meaning ZAPS and starts meaning decoration. Pink is never a shape; it is only the
sliver where a second print pass missed its register.

## The rules that actually hold the style together

**1. Light is a hard-edged flat geometric shape.** This is the one rule that, when
broken, destroys the look completely. Screen glow, rim light, bloom, falloff, soft
gradients and radial haze turn it into neon synthwave inside one generation. Light
is a wedge or a shaft with straight cut-paper boundaries, filled with one flat
dither density.

**2. Depth comes from dot size, never from blur.** Foreground 3px dots at full
density, mid-ground 4px at 40%, background 6px at 15%. Nothing is ever optically
out of focus.

**3. Misregistration is a sliver, not an outline.** The second pass sits 3px up and
right. Pink shows only where the offset copy escapes the shape underneath. A pink
line drawn all the way around something is the failure mode, and it reads as a
sticker.

**4. Figures are faceless.** Solid violet-black silhouettes. No eyes, no mouth, no
nose, no facial features at any distance. Hands are closed mitts with no separated
fingers. Seven head heights tall, shoulders 2.4 head widths.

**5. Flat colour blocking.** No rendering, no shading ramps, no ambient occlusion.
A shape is one ink at one density, or it is two shapes.

**6. On twos.** 12fps stepped motion on a 24fps timeline. The stutter is the point.

## The prompt

Paste this whole block. For a new shot, replace only the SUBJECT line.

```
A single frame from a 2D animated short film. Risograph screenprint on dark
paper — duotone spot-colour printing with visible stochastic dithering, halftone
dot texture and paper tooth. Flat colour blocking, no rendering, no shading ramps.

SUBJECT: <describe the shot here, one or two sentences>

PALETTE — five inks only, no other colours anywhere in the image:
  paper / ground:  #0C0A16  a violet-black night stock
  light ink:       #F2EEE3  warm ivory
  main colour:     #8B30FF  electric violet
  fringe:          #C8288F  fluorescent pink, hairline only
  accent:          #F5E64B  acid yellow, ONLY on the ZAPS lightning bolt

LIGHT: every lit area is a HARD-EDGED FLAT GEOMETRIC SHAPE with straight
cut-paper boundaries, filled with even halftone dither at one flat density.
Absolutely no glow, no bloom, no gradient, no falloff, no rim light, no radial
haze, no soft edges of any kind. A screen throws a sharp wedge, not a halo.

DEPTH: carried by dot size, never by blur. Foreground dots small and dense,
background dots large and sparse. Nothing is optically out of focus.

MISREGISTRATION: a second print pass offset 3 pixels up and to the right, showing
as a thin fluorescent pink sliver only where it escapes the shape beneath it.
It is never a continuous outline around an object.

FIGURES: completely faceless solid violet-black silhouettes. No eyes, no mouth,
no nose, no facial features whatsoever. Hands are closed mitts with no separated
fingers. Proportions seven head heights tall, shoulders 2.4 head widths.

TEXTURE: heavy stochastic dither throughout, visible paper grain, slight ink
mottling. Printed imperfectly on purpose.

DO NOT: no glow or bloom, no gradients, no soft shadows, no photographic depth of
field, no facial features, no neon or synthwave look, no chrome, no 3D rendering,
no lens flare, no extra colours outside the five listed, no pink outlines, no text
or lettering anywhere in the image.
```

Add `no text or lettering` every time. Image models mangle letterforms, and all
type in this system is set locally where kerning and weight are controlled.

## Animating a still

Feed the image as `start_image` and write a **motion-only** prompt of roughly
fifteen words. Never restate the style — describing the look again makes the model
redraw the frame instead of animating it, and the redraw is where text and detail
get destroyed.

Good: `The phone screen blinks twice, fast. He flinches back sharply. Loose papers stir.`

## Finishing every clip

```bash
ffmpeg -i clip.mp4 -vf "scale=1920:1080:flags=lanczos,fps=12,fps=24,noise=alls=10:allf=t" \
       -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p out.mp4
```

`fps=12,fps=24` is the on-twos step. The noise filter reseeds per frame so the grain
boils rather than sitting static — static grain reads as a dirty lens, boiling grain
reads as print.

For DaVinci Resolve on Linux:

```bash
ffmpeg -i out.mp4 -c:v dnxhd -profile:v dnxhr_hq -pix_fmt yuv422p \
       -color_range tv -r 24 -an out.mov
```

## Type

| Role | Face | Fallback |
|---|---|---|
| Display | Zodiak | Instrument Serif, Georgia |
| Interface | Switzer | Plus Jakarta Sans, Helvetica |
| Mono | Geist Mono | SF Mono, Menlo |

Cards print in two passes: ivory lands on frame 0, pink lands on frame 2 offset 3px
up and right, then settles over four frames.

## Known failure modes

- **Neon synthwave.** Caused by any softness in the light. Re-read rule 1.
- **Sticker logos.** A mark pasted flat instead of projected. Light falling on a body
  skews and bends across its contours.
- **Pink outlines.** The model draws the fringe as a contour. Say "sliver, never a
  continuous outline" and it usually recovers.
- **Garbled interface text.** Video models redraw every frame. Fix it locally by
  warping the correct still back over the clip as a plate rather than rerolling.
