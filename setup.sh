#!/usr/bin/env bash
# One-time setup: Node packages, Chromium for Playwright, Python + Kokoro in .venv.
set -euo pipefail
cd "$(dirname "$0")"

echo "== Node packages"
npm install
npx playwright install chromium

echo "== Python 3.12 + Kokoro (in .venv)"
if command -v uv >/dev/null; then
  [ -d .venv ] || uv venv --python 3.12 .venv
  uv pip install --python .venv/bin/python -r requirements.txt
else
  PY=$(command -v python3.12 || command -v python3.11 || command -v python3.10 || true)
  [ -n "$PY" ] || { echo "Need Python 3.10-3.12 (or 'uv'). macOS: brew install uv"; exit 1; }
  [ -d .venv ] || "$PY" -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

if ! command -v espeak-ng >/dev/null; then
  echo "note: espeak-ng not found. Kokoro works without it, but uses it to say unusual words."
  echo "      macOS: brew install espeak-ng   Linux: sudo apt-get install espeak-ng"
fi

echo "== Pre-download the Kokoro voice model (~330 MB, once)"
.venv/bin/python -c "from kokoro import KPipeline; KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')" 2>/dev/null
echo "Done. Try: npm run demo -- demos/example"
