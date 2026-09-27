#!/usr/bin/env bash
# The check step: numbers plus frame sheets for one video. Run it on every render, then LOOK at the sheets.
# usage: bash scripts/check-video.sh <video.mp4> [frames per sheet tile step]
# Writes <video dir>/build/check-<name>/sheet-*.png and prints a summary. Nothing is deleted or changed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FF="$(cd "$ROOT" && node -e 'console.log(require("@ffmpeg-installer/ffmpeg").path)')"
VID="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
NAME="$(basename "$VID" .mp4)"
OUT="$(dirname "$VID")/build/check-$NAME"
mkdir -p "$OUT"

INFO="$("$FF" -hide_banner -i "$VID" 2>&1 || true)"
DUR="$(sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' <<<"$INFO")"
VLINE="$(grep -m1 'Video:' <<<"$INFO" || true)"
SIZE="$(grep -oE '[0-9]{3,4}x[0-9]{3,4}' <<<"$VLINE" | head -1)"
FPS="$(grep -oE '[0-9.]+ fps' <<<"$VLINE" | head -1)"
AUDIO="$(grep -q 'Audio:' <<<"$INFO" && echo yes || echo NO)"
FRAMES="$("$FF" -v error -i "$VID" -map 0:v:0 -c copy -f null - 2>&1 -progress - | sed -n 's/^frame=//p' | tail -1)"

# Contact sheets: about 100 frames spread over 4 sheets of 5x5 (or every Nth frame if given).
STEP="${2:-$(( FRAMES / 100 > 0 ? FRAMES / 100 : 1 ))}"
"$FF" -v error -y -i "$VID" -vf "select=not(mod(n\,$STEP)),scale=384:-1,tile=5x5" -vsync vfr "$OUT/sheet-%02d.png"

# Hard cuts (a big change between two frames). A one-chain film should have 0; a cut-based edit lists its cuts.
CUTS="$("$FF" -hide_banner -i "$VID" -vf "select=gt(scene\,0.3),showinfo" -an -f null - 2>&1 | grep -oE 'pts_time:[0-9.]+' | cut -d: -f2 | tr '\n' ' ' || true)"
# Blank frames: one flat colour, nothing drawn at all. Intentional flashes show up here too; anything else
# is a gap between scenes. An overlay (HUD, logo bug) hides a gap from this check, so the sheets still matter.
FLAT="$("$FF" -hide_banner -i "$VID" -vf "signalstats,metadata=mode=print:file=$OUT/stats.txt" -an -f null - >/dev/null 2>&1; \
  awk -F'[ :=]+' '/^frame:/{n=$2} /YMIN=/{lo=$NF} /YMAX=/{hi=$NF; if (hi-lo<10) printf "%d ", n}' "$OUT/stats.txt")"
# Frozen stretches of 1 s or more (dead picture).
FROZEN="$("$FF" -hide_banner -i "$VID" -vf "freezedetect=n=0.002:d=1" -an -f null - 2>&1 | grep -oE 'freeze_start: [0-9.]+' | cut -d' ' -f2 | tr '\n' ' ' || true)"
LOUD="$("$FF" -hide_banner -i "$VID" -af ebur128=peak=true -vn -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{i=$2} /True peak/{p=1} p&&/Peak:/{pk=$2} END{printf "%s LUFS, true peak %s dBFS", i, pk}')"

cat <<REPORT
video      $VID
length     $DUR  ($FRAMES frames, $FPS, $SIZE, audio: $AUDIO)
loudness   $LOUD   (target about -14 LUFS, peak under 0)
hard cuts  ${CUTS:-none}
blank      ${FLAT:-none}   (frame numbers; a blank frame between scenes is a bug)
frozen     ${FROZEN:-none}   (seconds where the picture stops for 1 s or more)
sheets     $OUT/sheet-*.png  (every ${STEP}th frame; open and look at every one)
REPORT
