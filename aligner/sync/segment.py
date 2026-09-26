"""Sentence segmentation from ffmpeg `silencedetect`.

This is the part of the old pipeline that was already accurate: sentence starts
measured this way matched the take to the millisecond.  It is kept, both as the
fallback aligner's scaffolding and as the independent yardstick the ML aligner
is scored against in verify.py.
"""
from __future__ import annotations

import re
import subprocess
from typing import List, Optional, Sequence, Tuple

from .audio import FFMPEG, duration

# -40 dB / 0.13 s are the values the campaigns take was originally measured
# with.  -40 dB sits below Arthur's room tone but above his quietest fricatives;
# 0.13 s is short enough to catch a breath and long enough to ignore a stop
# consonant's closure.
DEFAULT_NOISE_DB = -40.0
DEFAULT_MIN_SILENCE = 0.13
# gaps wider than this separate sentences.  0.6 s was chosen because the widest
# intra-sentence pause in the reference take is 0.21 s (before "fail") and the
# narrowest inter-sentence gap is 0.14 s... which is why `n_sentences` below
# exists: a fixed threshold is a guess, "the n-1 widest gaps" is not.
DEFAULT_SENTENCE_GAP = 0.6

_START = re.compile(r"silence_start:\s*(-?[\d.]+)")
_END = re.compile(r"silence_end:\s*(-?[\d.]+)")


def silences(path: str, noise_db: float = DEFAULT_NOISE_DB,
             min_silence: float = DEFAULT_MIN_SILENCE) -> List[Tuple[float, float]]:
    """Return [(start, end)] of every detected silent run, in seconds."""
    p = subprocess.run(
        [FFMPEG, "-v", "info", "-nostats", "-i", path,
         "-af", "silencedetect=n=%gdB:d=%g" % (noise_db, min_silence),
         "-f", "null", "-"],
        capture_output=True)
    log = p.stderr.decode("utf8", "replace")
    dur = duration(path)
    out: List[Tuple[float, float]] = []
    pending: Optional[float] = None
    for line in log.splitlines():
        m = _START.search(line)
        if m:
            pending = float(m.group(1))
            continue
        m = _END.search(line)
        if m and pending is not None:
            out.append((pending, float(m.group(1))))
            pending = None
    if pending is not None:              # file ends inside a silence
        out.append((pending, dur))
    return out


def speech_runs(path: str, **kw) -> List[Tuple[float, float]]:
    """Complement of `silences`: the stretches that actually contain voice."""
    dur = duration(path)
    sil = silences(path, **kw)
    runs: List[Tuple[float, float]] = []
    t = 0.0
    for a, b in sil:
        if a - t > 1e-6:
            runs.append((max(0.0, t), a))
        t = b
    if dur - t > 1e-6:
        runs.append((t, dur))
    return runs


def sentence_spans(path: str, n_sentences: Optional[int] = None,
                   gap: float = DEFAULT_SENTENCE_GAP,
                   noise_db: float = DEFAULT_NOISE_DB,
                   min_silence: float = DEFAULT_MIN_SILENCE) -> List[Tuple[float, float]]:
    """Group speech runs into sentence spans.

    If `n_sentences` is given, the split points are the (n-1) widest gaps
    between speech runs, which always yields exactly n spans.  That is strictly
    better than thresholding when the transcript is known -- and the transcript
    is always known here.  Without it, fall back to the fixed `gap` threshold.
    """
    runs = speech_runs(path, noise_db=noise_db, min_silence=min_silence)
    if not runs:
        return []
    gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
    if n_sentences is not None and n_sentences > 0:
        if n_sentences > len(runs):
            raise ValueError(
                "transcript has %d sentences but only %d speech runs were detected "
                "at %g dB / %g s -- lower the threshold or merge sentences"
                % (n_sentences, len(runs), noise_db, min_silence))
        k = n_sentences - 1
        cut = set(sorted(range(len(gaps)), key=lambda i: -gaps[i])[:k]) if k else set()
    else:
        cut = {i for i, g in enumerate(gaps) if g > gap}
    spans: List[Tuple[float, float]] = []
    start = runs[0][0]
    for i, (a, b) in enumerate(runs):
        if i in cut or i == len(runs) - 1:
            spans.append((start, b))
            if i + 1 < len(runs):
                start = runs[i + 1][0]
    return spans


def split_sentences(text: str) -> List[str]:
    """One sentence per line if the transcript is already line-broken, else a
    naive terminator split.  Line breaks win because the user writes the script
    that way and hand-broken lines carry intent a regex cannot recover."""
    lines = [l.strip() for l in text.strip().splitlines()]
    lines = [l for l in lines if l]
    if len(lines) > 1:
        return lines
    body = " ".join(lines)
    parts = re.split(r"(?<=[.!?])\s+", body)
    return [p.strip() for p in parts if p.strip()]


def syllables(word: str) -> int:
    """Vowel-group count, minus one for a trailing silent 'e'.

    Deliberately identical to the heuristic in the user's vo3.py so the naive
    method reproduced in naive.py is the *same* naive method, not a better one.
    """
    w = word.lower().strip(".,;:!?\"'()[]")
    n = 0
    prev = False
    for c in w:
        v = c in "aeiouy"
        if v and not prev:
            n += 1
        prev = v
    if w.endswith("e") and n > 1:
        n -= 1
    return max(1, n)


def sentence_spans_by_syllables(path: str, sentences: Sequence[str],
                                noise_db: float = DEFAULT_NOISE_DB,
                                min_silence: float = DEFAULT_MIN_SILENCE
                                ) -> List[Tuple[float, float]]:
    """Assign speech runs to sentences so each sentence gets close to its share
    of speaking time, measured in syllables.

    Why not "the n-1 widest gaps": on the reference take the true S1/S2 break is
    a 0.140 s gap while a *within*-sentence breath in S3 is 0.372 s, so ranking
    by width picks the wrong boundary.  Total speech time is cut-independent, so
    a prefix-sum DP over runs finds the global optimum in O(runs^2 * sentences).
    Measured on the reference take this lands 18 of 20 boundaries exactly; see
    the table in README.md.
    """
    runs = speech_runs(path, noise_db=noise_db, min_silence=min_silence)
    n = len(sentences)
    if not runs:
        return []
    if n > len(runs):
        # Fewer audible runs than sentences: silence cannot separate them, so
        # split proportionally inside the runs we have rather than crashing.
        return _proportional_spans(runs, sentences)

    syl = [float(sum(syllables(w) for w in s.split())) for s in sentences]
    tot_syl = sum(syl) or 1.0
    dur = [b - a for a, b in runs]
    pref = [0.0]
    for d in dur:
        pref.append(pref[-1] + d)
    exp = [s / tot_syl * pref[-1] for s in syl]

    inf = float("inf")
    R = len(runs)
    dp = [[inf] * n for _ in range(R + 1)]
    bk = [[0] * n for _ in range(R + 1)]
    for j in range(1, R + 1):
        dp[j][0] = abs(pref[j] - exp[0])
        for s in range(1, n):
            for i in range(s, j):
                if dp[i][s - 1] == inf:
                    continue
                c = dp[i][s - 1] + abs(pref[j] - pref[i] - exp[s])
                if c < dp[j][s]:
                    dp[j][s] = c
                    bk[j][s] = i
    spans: List[Tuple[float, float]] = []
    j = R
    for s in range(n - 1, -1, -1):
        i = bk[j][s] if s else 0
        spans.append((runs[i][0], runs[j - 1][1]))
        j = i
    spans.reverse()
    return spans


def _proportional_spans(runs: Sequence[Tuple[float, float]],
                        sentences: Sequence[str]) -> List[Tuple[float, float]]:
    t0, t1 = runs[0][0], runs[-1][1]
    syl = [float(sum(syllables(w) for w in s.split())) for s in sentences]
    tot = sum(syl) or 1.0
    out = []
    acc = 0.0
    for s in syl:
        a = t0 + (t1 - t0) * acc / tot
        acc += s
        b = t0 + (t1 - t0) * acc / tot
        out.append((a, b))
    return out
