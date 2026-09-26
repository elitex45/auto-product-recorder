"""The no-ML fallback: syllable-proportional split, snapped to local quiet.

This is a faithful re-implementation of the method the user's vo3.py used, kept
for two reasons:

  1. it is the baseline the ML aligner has to beat, and verify.py scores the two
     against each other on real audio;
  2. it is the graceful-degradation path.  When torch is not installed the tool
     still emits usable JSON -- with `backend: "naive"` and a `warnings` entry
     shouted into the metadata, never silently.

Its known failure mode is exactly the one that started this: syllable count is a
poor proxy for duration (stressed monosyllables are long, unstressed
polysyllables are short), so interior word edges drift and the error accumulates
towards the middle of a sentence.
"""
from __future__ import annotations

from typing import List, Sequence, Tuple

import numpy as np

from .audio import read_f32, rms_envelope
from .segment import syllables

# 8 kHz / 100 fps are vo3.py's numbers.  8 kHz is plenty for an RMS envelope
# (voiced energy lives below 4 kHz) and keeps the read cheap.
ENV_SR = 8000
ENV_FPS = 100
# +-110 ms search radius = +-11 envelope frames.  Wide enough to find the dip at
# a real word boundary, narrow enough that it cannot jump to the neighbouring
# boundary (the shortest word in the reference take is ~130 ms).
SNAP_RADIUS_S = 0.110
MIN_WORD_S = 0.060      # vo3.py's floor; verify.py checks the stricter 40 ms bar


def _quietest(env: np.ndarray, i: int, rad: int) -> int:
    a, b = max(0, i - rad), min(len(env), i + rad + 1)
    if b <= a:
        return int(min(max(i, 0), len(env) - 1))
    return a + int(np.argmin(env[a:b]))


def align_naive(audio_path: str,
                sentences: Sequence[str],
                spans: Sequence[Tuple[float, float]],
                snap_radius: float = SNAP_RADIUS_S) -> List[dict]:
    """Split each sentence's span between its words by syllable count, then pull
    every interior edge to the quietest envelope frame within `snap_radius`."""
    x = read_f32(audio_path, ENV_SR, 1)
    env = rms_envelope(x, ENV_SR, ENV_FPS)
    rad = int(round(snap_radius * ENV_FPS))

    words: List[dict] = []
    for si, (text, (t0, t1)) in enumerate(zip(sentences, spans)):
        ws = text.split()
        if not ws:
            continue
        syl = [syllables(w) for w in ws]
        tot = float(sum(syl)) or 1.0
        edges = [t0]
        acc = 0
        for s in syl[:-1]:
            acc += s
            guess = t0 + (t1 - t0) * acc / tot
            edges.append(_quietest(env, int(round(guess * ENV_FPS)), rad) / ENV_FPS)
        edges.append(t1)
        # snapping can reorder edges when two guesses find the same dip
        edges = sorted(edges)
        for wi, w in enumerate(ws):
            a, b = edges[wi], edges[wi + 1]
            if b - a < MIN_WORD_S:
                b = a + MIN_WORD_S
            words.append({"w": w.strip(".,;:!?\"'"), "seg": si,
                          "t0": round(a, 4), "t1": round(b, 4)})
    return words
