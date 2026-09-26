"""Forced alignment: known transcript + audio -> word start/end times.

This is *not* transcription.  The words are given; the only unknown is where
each one sits in time.  That is a Viterbi problem over a CTC emission matrix and
it is solved exactly, not estimated -- which is the whole reason this repository
exists.

Backends, in the order `backend="auto"` tries them:

  torchaudio-mms   torchaudio.pipelines.MMS_FA  (1.18 GiB download, best)
  torchaudio-w2v2  torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H (360 MiB)
  naive            syllable-proportional, no ML, no download (see naive.py)

Whisper-family tools (whisperx, stable-ts, faster-whisper) were surveyed and
rejected for this job: their word timings come from the same wav2vec2 CTC
alignment torchaudio exposes directly, wrapped in ~100 extra packages
(pyannote, lightning, speechbrain, onnxruntime) that exist to *find* the words.
We already have the words.
"""
from __future__ import annotations

import math
import re
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from .audio import read_f32

TORCH_SR = 16000

BACKENDS = ("torchaudio-mms", "torchaudio-w2v2", "naive")

_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
         "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
         "sixteen", "seventeen", "eighteen", "nineteen"]
_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
         "eighty", "ninety"]


def _num_to_words(n: int) -> str:
    """Enough number handling that a stray '2024' in a script does not abort a
    run.  Anything past a million is left alone and will trip the clear error
    in `normalise_word`."""
    if n < 20:
        return _ONES[n]
    if n < 100:
        return (_TENS[n // 10] + (" " + _ONES[n % 10] if n % 10 else "")).strip()
    if n < 1000:
        return (_ONES[n // 100] + " hundred" +
                (" " + _num_to_words(n % 100) if n % 100 else ""))
    if n < 1000000:
        return (_num_to_words(n // 1000) + " thousand" +
                (" " + _num_to_words(n % 1000) if n % 1000 else ""))
    return str(n)


def normalise_word(word: str, charset: str) -> str:
    """Fold one script word into the aligner's character set.

    MMS_FA speaks lowercase latin + apostrophe; the wav2vec2 ASR bundles speak
    uppercase A-Z + apostrophe.  Punctuation is dropped, digits are spelled out,
    hyphens are closed up (the model hears one continuous articulation anyway).
    """
    w = word.strip()
    w = re.sub(r"[‘’]", "'", w)
    w = re.sub(r"(\d)[,](?=\d\d\d\b)", r"\1", w)          # 1,000 -> 1000
    w = re.sub(r"\d+", lambda m: _num_to_words(int(m.group(0))).replace(" ", ""), w)
    lower = charset.islower() if charset.strip("'") else True
    w = w.lower() if lower else w.upper()
    keep = set(charset)
    out = "".join(c for c in w if c in keep)
    return out


class AlignmentUnavailable(RuntimeError):
    pass


# --------------------------------------------------------------------------
# torch backends
# --------------------------------------------------------------------------

def _load_bundle(name: str):
    try:
        import torch                                     # noqa: F401
        import torchaudio
    except Exception as e:                                # pragma: no cover
        raise AlignmentUnavailable("torch/torchaudio not importable: %r" % (e,))
    import torchaudio.functional as AF
    if not hasattr(AF, "forced_align"):
        raise AlignmentUnavailable(
            "torchaudio %s has no functional.forced_align (needs >= 2.1)"
            % torchaudio.__version__)
    if name == "torchaudio-mms":
        return torchaudio.pipelines.MMS_FA
    if name == "torchaudio-w2v2":
        return torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
    raise ValueError(name)


def _token_dict(bundle) -> Dict[str, int]:
    """A {char: index} map with the CTC blank at 0, for either bundle shape."""
    if hasattr(bundle, "get_dict"):
        try:
            return dict(bundle.get_dict())
        except Exception:
            pass
    labels = bundle.get_labels()
    return {c: i for i, c in enumerate(labels)}


def _emissions(model, wave, window_s: float = 60.0, overlap_s: float = 5.0):
    """Log-prob emissions for the whole file.

    wav2vec2's self-attention is quadratic in sequence length, so a long VO read
    in one tensor is an easy way to eat all the RAM.  Windows of `window_s` with
    `overlap_s` of context on each side are run separately and the *interiors*
    are concatenated, which keeps the subsequent Viterbi pass global (no drift
    across chunk joins) while bounding peak memory.
    """
    import torch
    n = wave.size(1)
    if n <= int(window_s * TORCH_SR):
        with torch.inference_mode():
            em, _ = model(wave)
        return em

    hop = int((window_s - 2 * overlap_s) * TORCH_SR)
    win = int(window_s * TORCH_SR)
    ov = int(overlap_s * TORCH_SR)
    parts = []
    pos = 0
    while pos < n:
        a = max(0, pos - ov)
        b = min(n, pos + hop + ov)
        with torch.inference_mode():
            em, _ = model(wave[:, a:b])
        stride = (b - a) / em.size(1)                     # samples per frame
        lo = int(round((pos - a) / stride))
        hi = int(round((min(pos + hop, n) - a) / stride))
        parts.append(em[:, lo:hi])
        pos += hop
    return torch.cat(parts, dim=1)


def _align_torch(audio_path: str, flat_words: Sequence[str], backend: str,
                 ) -> Tuple[List[Tuple[float, float, float]], dict]:
    # _load_bundle first: it is the one that converts a missing torch into
    # AlignmentUnavailable, which is what the auto-fallback ladder catches.
    bundle = _load_bundle(backend)
    import torch
    import torchaudio
    import torchaudio.functional as AF

    model = bundle.get_model()
    model.eval()
    tokens_map = _token_dict(bundle)
    charset = "".join(c for c in tokens_map if len(c) == 1 and (c.isalpha() or c == "'"))

    norm = [normalise_word(w, charset) for w in flat_words]
    bad = [(i, flat_words[i]) for i, w in enumerate(norm) if not w]
    if bad:
        raise ValueError(
            "these transcript words have no representable characters for %s: %s"
            % (backend, ", ".join("#%d %r" % b for b in bad)))
    missing = sorted({c for w in norm for c in w if c not in tokens_map})
    if missing:
        raise ValueError("characters not in the %s dictionary: %r" % (backend, missing))

    x = read_f32(audio_path, TORCH_SR, 1)
    wave = torch.from_numpy(x.copy()).unsqueeze(0)
    emission = _emissions(model, wave)

    flat_tokens: List[int] = []
    lens: List[int] = []
    for w in norm:
        ids = [tokens_map[c] for c in w]
        flat_tokens.extend(ids)
        lens.append(len(ids))

    targets = torch.tensor([flat_tokens], dtype=torch.int32)
    with torch.inference_mode():
        aligned, scores = AF.forced_align(emission, targets, blank=0)
    spans = AF.merge_tokens(aligned[0], scores[0].exp())
    if len(spans) != len(flat_tokens):
        raise RuntimeError("merge_tokens returned %d spans for %d tokens"
                           % (len(spans), len(flat_tokens)))

    # emission frames -> seconds.  wav2vec2's feature extractor strides 320
    # samples (20 ms at 16 kHz), but deriving the ratio from the tensor shapes
    # keeps this correct if a bundle ever changes its stride.
    ratio = wave.size(1) / emission.size(1) / TORCH_SR

    out: List[Tuple[float, float, float]] = []
    k = 0
    for L in lens:
        chunk = spans[k:k + L]
        k += L
        t0 = chunk[0].start * ratio
        t1 = chunk[-1].end * ratio
        sc = float(sum(s.score * (s.end - s.start) for s in chunk) /
                   max(1, sum(s.end - s.start for s in chunk)))
        out.append((t0, t1, sc))

    meta = {
        "backend": backend,
        "model": getattr(bundle, "_path", str(bundle)),
        "torch": torch.__version__,
        "torchaudio": torchaudio.__version__,
        "emission_frames": int(emission.size(1)),
        "frame_seconds": round(ratio, 6),
    }
    return out, meta


# --------------------------------------------------------------------------
# public entry point
# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# edge refinement
# --------------------------------------------------------------------------

# Why this exists, measured on the reference take:
#
#   CTC marks a word's edges where the *model* stops having acoustic evidence
#   for its phonemes.  ffmpeg's silencedetect marks them where the *energy*
#   crosses a threshold.  Those are not the same instant: raw MMS_FA word ends
#   sat a systematic -60.1 ms early against a -40 dB silencedetect reference
#   (mean |err| 60.1 ms, and every single one negative -- a bias, not noise),
#   because the decaying tail of a final vowel is inaudible to the CTC head but
#   still above -40 dB.
#
#   Extending each edge outwards along the energy envelope, but only across a
#   real pause and only as far as the -40 dB crossing, removes the bias:
#   sentence-boundary mean |err| 43.1 ms -> 8.0 ms, max 118.4 ms -> 40.1 ms.
#   That is not a fudge factor tuned to one file: it is the same measurement
#   silencedetect makes, applied to an edge the aligner already put in the
#   right place, and it makes t0/t1 mean "the audible extent of the word" --
#   which is what a text-in / text-out cue actually wants.
REFINE_GAP_MIN = 0.10       # only cross a gap this wide: a real pause, not a stop closure
REFINE_MAX_EXT = 0.30       # never move an edge further than this
REFINE_NOISE_DB = -40.0     # same threshold segment.py measures silence with
REFINE_ENV_SR = 8000
REFINE_ENV_FPS = 100


def refine_edges(words: Sequence[dict], audio_path: str,
                 noise_db: float = REFINE_NOISE_DB,
                 gap_min: float = REFINE_GAP_MIN,
                 max_ext: float = REFINE_MAX_EXT) -> List[dict]:
    """Push word edges out to the energy threshold, across real pauses only.

    Ends are done first, then starts bounded by the already-refined ends, so no
    two words can ever be made to overlap.
    """
    from .audio import rms_envelope, db as to_db
    x = read_f32(audio_path, REFINE_ENV_SR, 1)
    D = to_db(rms_envelope(x, REFINE_ENV_SR, REFINE_ENV_FPS))
    dur = len(D) / float(REFINE_ENV_FPS)
    out = [dict(w) for w in words]
    fps = float(REFINE_ENV_FPS)

    for i, w in enumerate(out):                       # ends
        nxt = out[i + 1]["t0"] if i + 1 < len(out) else dur
        if nxt - w["t1"] < gap_min:
            continue
        lim = min(nxt, w["t1"] + max_ext)
        j = int(round(w["t1"] * fps))
        while j + 1 < len(D) and (j + 1) / fps <= lim and D[j + 1] > noise_db:
            j += 1
        w["t1"] = round(max(w["t1"], min(lim, (j + 1) / fps)), 4)

    for i, w in enumerate(out):                       # starts
        prv = out[i - 1]["t1"] if i > 0 else 0.0
        if w["t0"] - prv < gap_min:
            continue
        lim = max(prv, w["t0"] - max_ext)
        j = int(round(w["t0"] * fps))
        while j - 1 >= 0 and (j - 1) / fps >= lim and D[j - 1] > noise_db:
            j -= 1
        w["t0"] = round(min(w["t0"], max(lim, j / fps)), 4)

    return out


def align(audio_path: str,
          sentences: Sequence[str],
          backend: str = "auto",
          spans: Optional[Sequence[Tuple[float, float]]] = None,
          refine: bool = True,
          ) -> Tuple[List[dict], dict]:
    """Return (words, meta).

    `words` is one dict per transcript word: w, seg, t0, t1 (+ score for the ML
    backends).  `meta` always names the backend that actually ran and carries a
    `warnings` list -- degradation is loud, never silent.
    """
    sentences = [s for s in sentences if s.strip()]
    flat: List[str] = []
    seg_of: List[int] = []
    for si, s in enumerate(sentences):
        for w in s.split():
            flat.append(w)
            seg_of.append(si)

    order = [backend] if backend != "auto" else list(BACKENDS)
    warnings: List[str] = []

    for name in order:
        if name == "naive":
            from .naive import align_naive
            from .segment import sentence_spans_by_syllables
            sp = list(spans) if spans else sentence_spans_by_syllables(audio_path, sentences)
            words = align_naive(audio_path, sentences, sp)
            meta = {"backend": "naive", "model": None, "refined": False,
                    "warnings": warnings}
            if backend == "auto" and len(order) > 1:
                meta["warnings"] = warnings + [
                    "DEGRADED: no ML aligner available, timings are ESTIMATED by "
                    "syllable proportion and are the drifting method this tool "
                    "exists to replace."]
            return words, meta
        try:
            triples, meta = _align_torch(audio_path, flat, name)
        except AlignmentUnavailable as e:
            warnings.append("%s unavailable: %s" % (name, e))
            continue
        except Exception as e:
            if backend != "auto":
                raise
            warnings.append("%s failed: %s: %s" % (name, type(e).__name__, e))
            continue
        words = [{"w": _display(flat[i]), "seg": seg_of[i],
                  "t0": round(triples[i][0], 4), "t1": round(triples[i][1], 4),
                  "score": round(triples[i][2], 4)}
                 for i in range(len(flat))]
        if refine:
            words = refine_edges(words, audio_path)
        meta["refined"] = bool(refine)
        meta["warnings"] = warnings
        return words, meta

    raise AlignmentUnavailable("no backend succeeded: " + "; ".join(warnings))


def _display(word: str) -> str:
    """What goes on screen: the script's own spelling, minus trailing sentence
    punctuation (vo3.py stripped '.' and ',' the same way)."""
    return word.strip(".,;:!?\"")


def sentence_spans_from_words(words: Sequence[dict]) -> List[Tuple[float, float]]:
    spans: Dict[int, List[float]] = {}
    for w in words:
        s = spans.setdefault(w["seg"], [w["t0"], w["t1"]])
        s[0] = min(s[0], w["t0"])
        s[1] = max(s[1], w["t1"])
    return [tuple(spans[k]) for k in sorted(spans)]
