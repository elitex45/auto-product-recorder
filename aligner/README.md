# aligner

Forced aligner (from claude-audio-sync). It takes a voice clip and its exact script and
works out when each word is spoken. The studio uses it so kinetic words appear on the beat.

It uses torchaudio's MMS_FA model (~1.2 GB, downloaded once to `~/.cache/torch`). It runs in the
repo's `.venv`, the same one as Kokoro. `studio/polish.mjs` calls it; you normally never do:

```bash
cd aligner
../.venv/bin/python -m sync.cli align --audio clip.wav --transcript clip.txt --fps 30 -o words.json
```

The output is `[{w, t0, t1, score, ...}]`, with times in seconds. A `score` below 0.5 means the aligner is unsure.
