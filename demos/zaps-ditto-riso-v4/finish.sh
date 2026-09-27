#!/bin/bash
# Riso finish (ZAPS house style): on twos (12 unique fps on a 24 fps timeline), luma grain that
# reseeds every frame so it boils, then the poster baked back in as frame 0 (the fps step drops it).
# Run after: node studio/film.mjs demos/zaps-ditto-riso-v4
set -euo pipefail
cd "$(dirname "$0")"
FF="$(cd ../.. && pwd)/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg"
"$FF" -v error -y -i zaps-ditto-promo-riso-v4-raw.mp4 -i zaps-ditto-promo-riso-v4-raw.jpg \
  -filter_complex "[0:v]fps=12,fps=24,noise=c0s=7:c0f=t[g];[1:v]scale=1920:1080[p];[g][p]overlay=enable='eq(n,0)'[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 26 -preset slow -tune grain -pix_fmt yuv420p -c:a copy -movflags +faststart \
  zaps-ditto-promo-riso-v4.mp4
cp zaps-ditto-promo-riso-v4-raw.jpg zaps-ditto-promo-riso-v4.jpg
