"""Command line.

    python3 -m sync.cli align  --audio vo.wav --transcript script.txt --fps 24 -o words.json
    python3 -m sync.cli verify --audio vo.wav --words words.json
    python3 -m sync.cli selftest          # == python3 -m sync.verify --all

Beat-lock mode re-lays each sentence onto a musical beat and emits both the
frame numbers and, optionally, the reassembled voice track.  See README.md.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import textwrap
from typing import List, Optional, Sequence, Tuple

import numpy as np

from . import __version__
from .audio import atempo, read_f32, write_wav
from .segment import split_sentences

OSR = 48000                 # output sample rate for the re-laid voice track
FADE_S = 0.010              # 10 ms hann in/out at every join so nothing clicks
CUT_PAD = 0.06              # lead-in kept before a sentence: do not clip the onset
CUT_TAIL = 0.12             # tail kept after a sentence: do not clip the decay


# --------------------------------------------------------------------------
# frames
# --------------------------------------------------------------------------

def add_frames(words: Sequence[dict], fps: float) -> List[dict]:
    """Plain timeline frames: f0 = floor(t0*fps), f1 = ceil(t1*fps)."""
    out = []
    for w in words:
        d = dict(w)
        d["f0"] = int(math.floor(w["t0"] * fps))
        d["f1"] = int(math.ceil(w["t1"] * fps))
        out.append(d)
    return out


def beat_base(beat: float, beat_seconds: float, fps: float, open_frame: int) -> int:
    """The frame a sentence's first sound lands on.  Identical to vo3.py's bf()."""
    return int(open_frame) + int(round(beat * beat_seconds * fps))


def add_frames_beatlocked(words: Sequence[dict], fps: float, beats: Sequence[float],
                          beat_seconds: float, open_frame: int,
                          rates: Sequence[float]) -> Tuple[List[dict], List[dict]]:
    """Re-lay every sentence onto its beat, preserving each word's offset within
    the sentence.  A sentence played at `rate` != 1 has its interior offsets
    divided by the same rate, so the words stay glued to the stretched audio."""
    segs = sorted({int(w["seg"]) for w in words})
    starts = {s: min(w["t0"] for w in words if w["seg"] == s) for s in segs}
    ends = {s: max(w["t1"] for w in words if w["seg"] == s) for s in segs}

    out: List[dict] = []
    for w in words:
        s = int(w["seg"])
        base = beat_base(beats[s], beat_seconds, fps, open_frame)
        r = rates[s]
        t0s = starts[s]
        d = dict(w)
        d["f0"] = base + int(math.floor((w["t0"] - t0s) / r * fps))
        d["f1"] = base + int(math.ceil((w["t1"] - t0s) / r * fps))
        out.append(d)

    plan: List[dict] = []
    for s in segs:
        base = beat_base(beats[s], beat_seconds, fps, open_frame)
        span = (ends[s] - starts[s]) / rates[s]
        plan.append({"seg": s, "beat": beats[s], "f0": base,
                     "f1": base + int(math.ceil(span * fps)),
                     "seconds": round(span, 4), "rate": rates[s],
                     "src_t0": round(starts[s], 4), "src_t1": round(ends[s], 4)})
    for i, p in enumerate(plan):
        p["gap_frames"] = (plan[i + 1]["f0"] - p["f1"]) if i + 1 < len(plan) else None
    return out, plan


# --------------------------------------------------------------------------
# audio re-lay
# --------------------------------------------------------------------------

def relay_audio(audio_path: str, plan: Sequence[dict], fps: float,
                out_path: str, last_frame: int,
                pad: float = CUT_PAD, tail: float = CUT_TAIL,
                out_sr: int = OSR, limit: bool = True) -> dict:
    """Cut each sentence out of the take and drop it at its beat.

    Same construction as vo3.py: `pad` seconds of lead-in are kept so the first
    consonant is not clipped, the placement compensates for that pad, and a
    10 ms hann is applied at both ends of every piece.  The fade is what stops
    the joins clicking -- a hard cut through a non-zero sample is a step, and a
    step is a click.
    """
    src = read_f32(audio_path, out_sr, 1)
    n_out = int(last_frame / fps * out_sr) + out_sr
    out = np.zeros(n_out, np.float32)
    fade = np.hanning(int(FADE_S * out_sr) * 2)
    h = len(fade) // 2

    for p in plan:
        a = max(0, int((p["src_t0"] - pad) * out_sr))
        b = min(len(src), int((p["src_t1"] + tail) * out_sr))
        seg = src[a:b].copy()
        if p["rate"] != 1.0:
            seg = atempo(seg, out_sr, p["rate"]).copy()
        if len(seg) > 2 * h:
            seg[:h] *= fade[:h]
            seg[-h:] *= fade[h:]
        at = int(p["f0"] / fps * out_sr) - int(pad * out_sr)
        at = max(0, at)
        n = min(len(seg), len(out) - at)
        if n > 0:
            out[at:at + n] += seg[:n]

    peak = float(np.max(np.abs(out))) if len(out) else 0.0
    # The reference take reads back at 1.0371 full-scale once it is resampled
    # 24 kHz -> 48 kHz (interpolation overshoot, present in the source read
    # itself, not introduced by the re-lay).  Writing that to 16-bit PCM would
    # clip it flat, so scale down instead -- and say by how much.
    gain = 1.0
    if limit and peak > 1.0:
        gain = 0.999 / peak
        out = out * gain
    write_wav(out_path, out, out_sr, 2)
    return {"path": out_path, "sample_rate": out_sr,
            "seconds": round(len(out) / out_sr, 4),
            "peak_before": round(peak, 4),
            "gain_applied_db": round(20.0 * math.log10(gain), 3) if gain != 1.0 else 0.0,
            "clipped": peak > 1.0 and not limit}


# --------------------------------------------------------------------------
# subcommands
# --------------------------------------------------------------------------

def _parse_floats(s: Optional[str]) -> List[float]:
    if not s:
        return []
    return [float(v) for v in s.replace(" ", "").split(",") if v != ""]


def cmd_align(a) -> int:
    from .align import align

    with open(a.transcript) as f:
        sentences = split_sentences(f.read())

    words, meta = align(a.audio, sentences, a.backend, refine=not a.no_refine)
    meta["version"] = __version__
    meta["audio"] = os.path.abspath(a.audio)
    meta["transcript"] = os.path.abspath(a.transcript)
    meta["fps"] = a.fps
    meta["n_sentences"] = len(sentences)
    meta["n_words"] = len(words)
    degraded = meta.get("backend") == "naive"
    meta["degraded"] = degraded

    beats = _parse_floats(a.beats)
    if beats:
        if len(beats) != len(sentences):
            print("error: --beats has %d entries but the transcript has %d sentences"
                  % (len(beats), len(sentences)), file=sys.stderr)
            return 2
        rates = _parse_floats(a.rates) or [1.0] * len(sentences)
        if len(rates) != len(sentences):
            print("error: --rates has %d entries but the transcript has %d sentences"
                  % (len(rates), len(sentences)), file=sys.stderr)
            return 2
        words, plan = add_frames_beatlocked(words, a.fps, beats, a.beat_seconds,
                                            a.open_frame, rates)
        meta["beat_lock"] = {"beats": beats, "beat_seconds": a.beat_seconds,
                             "open_frame": a.open_frame, "rates": rates}
        meta["plan"] = plan
    else:
        words = add_frames(words, a.fps)
        plan = []

    if degraded:
        banner = ("DEGRADED: no ML aligner was available. These timings are "
                  "ESTIMATED by syllable proportion, not measured. Expect word "
                  "starts inside a sentence to be ~200 ms out (p50, measured). "
                  "Install torch+torchaudio to fix.")
        print("\n" + "!" * 78, file=sys.stderr)
        for line in textwrap.wrap(banner, 74):
            print("! " + line, file=sys.stderr)
        print("!" * 78 + "\n", file=sys.stderr)
        meta.setdefault("warnings", []).insert(0, banner)

    payload_words = list(words)
    if a.format == "bare" and degraded:
        # A JSON array has nowhere to put metadata, and this file is a drop-in
        # for a consumer that does `[w for w in W if w["seg"] == i]`.  A sentinel
        # with seg = -1 is invisible to every such filter but impossible to miss
        # when the file is opened, so the degradation is never silent.
        payload_words = payload_words + [
            {"w": "!!DEGRADED!!", "seg": -1, "t0": 0.0, "t1": 0.0, "f0": 0, "f1": 0,
             "note": meta["warnings"][0]}]

    payload = payload_words if a.format == "bare" else {"meta": meta, "words": payload_words}
    with open(a.out, "w") as f:
        json.dump(payload, f, indent=1)
    if a.format == "bare":
        side = os.path.splitext(a.out)[0] + ".meta.json"
        with open(side, "w") as f:
            json.dump(meta, f, indent=1)

    if a.emit_audio:
        if not plan:
            print("error: --emit-audio needs --beats (there is nothing to re-lay "
                  "without a beat grid)", file=sys.stderr)
            return 2
        end_beat = a.end_beat if a.end_beat is not None else max(beats) + 4.0
        last = beat_base(end_beat, a.beat_seconds, a.fps, a.open_frame) + a.tail_frames
        info = relay_audio(a.audio, plan, a.fps, a.emit_audio, last,
                           out_sr=a.out_sr, limit=not a.no_limit)
        meta["relaid_audio"] = info

    print("backend  : %s%s" % (meta["backend"], "   *** DEGRADED ***" if degraded else ""))
    print("refined  : %s" % meta.get("refined"))
    print("words    : %d over %d sentences" % (len(words), len(sentences)))
    print("written  : %s" % a.out)
    if a.format == "bare":
        print("metadata : %s" % (os.path.splitext(a.out)[0] + ".meta.json"))
    for w in meta.get("warnings", []):
        print("warning  : %s" % w)
    if plan:
        print("\n%4s %7s %6s %6s %7s  gap to next" % ("seg", "beat", "f0", "f1", "secs"))
        for p in plan:
            g = p["gap_frames"]
            flag = "" if g is None else ("  <-- OVERLAP" if g < 0 else ("  tight" if g < 6 else ""))
            print("%4d %7.1f %6d %6d %7.3f  %s%s"
                  % (p["seg"], p["beat"], p["f0"], p["f1"], p["seconds"],
                     "-" if g is None else "%4df (%.2fs)" % (g, g / a.fps), flag))
    if a.emit_audio:
        info = meta["relaid_audio"]
        print("\naudio    : %s  %.3fs @ %d Hz  peak %.3f%s%s"
              % (info["path"], info["seconds"], info["sample_rate"],
                 info["peak_before"],
                 "  (scaled %+.2f dB to fit)" % info["gain_applied_db"]
                 if info["gain_applied_db"] else "",
                 "  *** CLIPPING ***" if info["clipped"] else ""))
    return 0


def cmd_verify(a) -> int:
    from .verify import word_sanity, sentence_error

    with open(a.words) as f:
        data = json.load(f)
    words = data["words"] if isinstance(data, dict) else data
    words = [w for w in words if int(w.get("seg", 0)) >= 0]

    r = word_sanity(words, a.audio)
    st = r["stats"]
    print("words           : %d" % st["n_words"])
    print("duration ms     : min %.1f  median %.1f  max %.1f"
          % (st["min_ms"], st["median_ms"], st["max_ms"]))
    print("long-but-paused : %d" % st["long_words_with_pause"])
    print("speech overlap  : mean %.0f%%  min %.0f%%"
          % (100 * st["speech_overlap_mean"], 100 * st["speech_overlap_min"]))
    if a.truth:
        with open(a.truth) as f:
            case = json.load(f)
        truth = [tuple(x) for x in case.get("sentence_spans_corrected",
                                            case["sentence_spans"])]
        e = sentence_error(words, truth, case.get("known_bad_reference_boundaries", []))
        print("sentence error  : mean %.1f ms  max %.1f ms  (%d boundaries)"
              % (e["mean_abs_ms"], e["max_abs_ms"], e["n_boundaries"]))
    if r["ok"]:
        print("\nRESULT: PASS")
        return 0
    print("\n%d failures:" % len(r["failures"]))
    for f_ in r["failures"]:
        print("  - " + f_)
    print("\nRESULT: FAIL")
    return 1


def cmd_selftest(a) -> int:
    from .verify import run_all
    return run_all(a.case, a.backend)


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="sync.cli", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", action="version", version=__version__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("align", help="forced-align a known transcript to audio")
    p.add_argument("--audio", required=True)
    p.add_argument("--transcript", required=True,
                   help="one sentence per line (line breaks win over '.' splitting)")
    p.add_argument("--fps", type=float, default=24.0)
    p.add_argument("-o", "--out", required=True)
    p.add_argument("--backend", default="auto",
                   choices=["auto", "torchaudio-mms", "torchaudio-w2v2", "naive"])
    p.add_argument("--no-refine", action="store_true",
                   help="skip energy-decay edge refinement (see align.refine_edges)")
    p.add_argument("--format", default="bare", choices=["bare", "object"],
                   help="bare: a JSON array, drop-in for an existing consumer, with "
                        "metadata written to a .meta.json sidecar. "
                        "object: {\"meta\": ..., \"words\": [...]} in one file.")
    p.add_argument("--beats", help="one beat number per sentence, e.g. 0,8,14,19")
    p.add_argument("--beat-seconds", type=float, default=0.5905)
    p.add_argument("--open-frame", type=int, default=0)
    p.add_argument("--rates", help="per-sentence atempo rate, one per sentence")
    p.add_argument("--emit-audio", help="write the re-laid voice track here")
    p.add_argument("--end-beat", type=float, default=None,
                   help="beat the film ends on; sets the re-laid track's length")
    p.add_argument("--tail-frames", type=int, default=12)
    p.add_argument("--out-sr", type=int, default=OSR,
                   help="sample rate of the re-laid track (default %d)" % OSR)
    p.add_argument("--no-limit", action="store_true",
                   help="do not scale the re-laid track down when it exceeds full scale")
    p.set_defaults(func=cmd_align)

    p = sub.add_parser("verify", help="check a words.json against its audio")
    p.add_argument("--audio", required=True)
    p.add_argument("--words", required=True)
    p.add_argument("--truth", help="a *_truth.json with sentence_spans to score against")
    p.set_defaults(func=cmd_verify)

    p = sub.add_parser("selftest", help="run the bundled accuracy regression")
    p.add_argument("--case", default=None)
    p.add_argument("--backend", action="append", default=[])
    p.set_defaults(func=cmd_selftest)
    return ap


def main(argv: Optional[Sequence[str]] = None) -> int:
    a = build_parser().parse_args(argv)
    return a.func(a)


if __name__ == "__main__":
    sys.exit(main())
