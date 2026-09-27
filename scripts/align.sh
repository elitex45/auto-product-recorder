#!/usr/bin/env bash
# Word timings for voice clips: audio/<id>.wav + the line from narration.json -> audio/words/<id>.json.
# usage: bash scripts/align.sh demos/<name> [id ...]     (no ids: every clip in narration.json)
# Run `npm run voice -- demos/<name>` first. Re-run for any line whose text changed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="$(cd "$1" && pwd)"; shift
FFDIR="$(dirname "$(cd "$ROOT" && node -e 'console.log(require("@ffmpeg-installer/ffmpeg").path)' 2>/dev/null || true)")"
[ -x "$FFDIR/ffmpeg" ] || FFDIR="$ROOT/node_modules/@ffmpeg-installer/darwin-arm64"
IDS=("$@")
if [ ${#IDS[@]} -eq 0 ]; then
  while IFS= read -r id; do IDS+=("$id"); done < <(node -e 'for (const k of Object.keys(require(process.argv[1]))) console.log(k)' "$DEMO/narration.json")
fi
mkdir -p "$DEMO/audio/words"
for id in "${IDS[@]}"; do
  [ -f "$DEMO/audio/$id.wav" ] || { echo "missing $DEMO/audio/$id.wav (run: npm run voice -- $DEMO)"; exit 1; }
  node -e 'process.stdout.write(require(process.argv[1])[process.argv[2]])' "$DEMO/narration.json" "$id" > "$DEMO/audio/words/$id.txt"
  (cd "$ROOT/aligner" && PATH="$FFDIR:$PATH" ../.venv/bin/python -m sync.cli align \
    --audio "$DEMO/audio/$id.wav" --transcript "$DEMO/audio/words/$id.txt" --fps 30 -o "$DEMO/audio/words/$id.json")
  echo "aligned $id"
done
