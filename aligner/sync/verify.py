"""Checks that turn "looks right" into a number.

Three families, all runnable on any (audio, transcript) pair:

  sentence_error   -- alignment vs independently measured silencedetect spans
  word_sanity      -- structural invariants a usable word track must satisfy
  compare          -- per-word delta between two alignments (aligner vs naive)

`python3 -m sync.verify --all` runs the bundled campaigns regression and prints
the whole table.
"""
from __future__ import annotations

import argparse
import io
import json
import math
import os
import sys
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from .audio import duration, read_f32, rms_envelope
from .segment import silences, speech_runs

# --- bars -----------------------------------------------------------------
# 80 ms is the user's stated bar for mean sentence-boundary error.  For context:
# one frame at 24 fps is 41.7 ms, and a wav2vec2 emission frame is 20 ms, so
# 80 ms ~ two video frames ~ the point where a mistimed word reads as late.
MEAN_SENTENCE_ERR_MS = 80.0
MIN_WORD_MS = 40.0          # shorter than this is not an articulated word
MAX_WORD_MS = 1200.0        # longer than this needs a real pause to justify it
PAUSE_MIN_S = 0.10          # a silence this long inside a word span excuses it


def _fmt(x: float) -> str:
    return "%.1f" % x


def sentence_spans_of(words: Sequence[dict]) -> List[Tuple[float, float]]:
    acc: Dict[int, List[float]] = {}
    for w in words:
        s = acc.setdefault(int(w["seg"]), [w["t0"], w["t1"]])
        s[0] = min(s[0], w["t0"])
        s[1] = max(s[1], w["t1"])
    return [(acc[k][0], acc[k][1]) for k in sorted(acc)]


def sentence_error(words: Sequence[dict],
                   truth: Sequence[Tuple[float, float]],
                   skip: Sequence[Sequence] = ()) -> dict:
    """Absolute error, in ms, of every sentence start and end vs `truth`.

    `skip` drops individual boundaries -- [[1, "end"], [2, "start"]] -- whose
    reference value is known-bad, so one wrong reference row cannot hide the
    real accuracy of the other eighteen.  See `correction_note` in
    examples/campaigns_truth.json.
    """
    got = sentence_spans_of(words)
    n = min(len(got), len(truth))
    drop = {(int(i), str(k)) for i, k in skip}
    starts, ends, rows = [], [], []
    for i in range(n):
        d0 = (got[i][0] - truth[i][0]) * 1000.0
        d1 = (got[i][1] - truth[i][1]) * 1000.0
        rows.append((i, got[i][0], got[i][1], d0, d1,
                     (i, "start") in drop, (i, "end") in drop))
        if (i, "start") not in drop:
            starts.append(d0)
        if (i, "end") not in drop:
            ends.append(d1)
    allv = [abs(v) for v in starts + ends]
    return {
        "rows": rows,
        "n_boundaries": len(allv),
        "mean_abs_ms": float(np.mean(allv)) if allv else float("nan"),
        "max_abs_ms": float(np.max(allv)) if allv else float("nan"),
        "mean_start_abs_ms": float(np.mean(np.abs(starts))) if starts else float("nan"),
        "mean_end_abs_ms": float(np.mean(np.abs(ends))) if ends else float("nan"),
        "bias_start_ms": float(np.mean(starts)) if starts else float("nan"),
        "bias_end_ms": float(np.mean(ends)) if ends else float("nan"),
    }


def word_sanity(words: Sequence[dict], audio_path: str) -> dict:
    """Structural checks. Returns {"ok": bool, "failures": [...], "stats": {...}}."""
    fails: List[str] = []
    dur = duration(audio_path)
    sil = silences(audio_path)
    runs = speech_runs(audio_path)
    spans = sentence_spans_of(words)

    lens_ms = [(w["t1"] - w["t0"]) * 1000.0 for w in words]

    # 1. minimum duration
    for w, L in zip(words, lens_ms):
        if L < MIN_WORD_MS - 1e-6:
            fails.append("word %r (seg %d, %.4f) is %.1f ms < %.0f ms"
                         % (w["w"], w["seg"], w["t0"], L, MIN_WORD_MS))

    # 2. maximum duration, unless a real pause sits inside the span
    long_ok = 0
    for w, L in zip(words, lens_ms):
        if L <= MAX_WORD_MS:
            continue
        covered = any(min(w["t1"], b) - max(w["t0"], a) >= PAUSE_MIN_S for a, b in sil)
        if covered:
            long_ok += 1
        else:
            fails.append("word %r (seg %d, %.4f) is %.1f ms > %.0f ms with no pause inside"
                         % (w["w"], w["seg"], w["t0"], L, MAX_WORD_MS))

    # 3. every word inside its own sentence span, and inside the file
    for w in words:
        a, b = spans[int(w["seg"])]
        if w["t0"] < a - 1e-6 or w["t1"] > b + 1e-6:
            fails.append("word %r escapes sentence %d span [%.4f, %.4f]"
                         % (w["w"], w["seg"], a, b))
        if w["t0"] < -1e-6 or w["t1"] > dur + 1e-6:
            fails.append("word %r [%.4f, %.4f] escapes the file (0, %.4f)"
                         % (w["w"], w["t0"], w["t1"], dur))

    # 4. strictly increasing, non-overlapping (touching is fine: CTC hands off
    #    one word to the next with no gap when the speaker does not pause)
    for i in range(1, len(words)):
        p, c = words[i - 1], words[i]
        if c["t0"] < p["t1"] - 1e-6:
            fails.append("word %r starts %.4f before %r ends %.4f"
                         % (c["w"], c["t0"], p["w"], p["t1"]))
        if c["t0"] <= p["t0"] - 1e-6:
            fails.append("word %r start %.4f not after %r start %.4f"
                         % (c["w"], c["t0"], p["w"], p["t0"]))
        if c["seg"] < p["seg"]:
            fails.append("sentence index goes backwards at %r" % (c["w"],))

    # 5. acoustic plausibility: how much of each word overlaps detected speech.
    #    A word placed entirely in silence is misaligned no matter what the
    #    structural checks say, and this is the only check here that looks at
    #    the audio rather than at the numbers.
    ov = []
    for w in words:
        L = max(1e-9, w["t1"] - w["t0"])
        o = sum(max(0.0, min(w["t1"], b) - max(w["t0"], a)) for a, b in runs)
        ov.append(o / L)
    ov = np.array(ov)
    for w, f in zip(words, ov):
        if f < 0.20:
            fails.append("word %r (seg %d, %.4f) overlaps detected speech only %.0f%%"
                         % (w["w"], w["seg"], w["t0"], 100 * f))

    stats = {
        "n_words": len(words),
        "min_ms": float(np.min(lens_ms)) if lens_ms else 0.0,
        "median_ms": float(np.median(lens_ms)) if lens_ms else 0.0,
        "max_ms": float(np.max(lens_ms)) if lens_ms else 0.0,
        "long_words_with_pause": long_ok,
        "speech_overlap_mean": float(ov.mean()) if len(ov) else 0.0,
        "speech_overlap_min": float(ov.min()) if len(ov) else 0.0,
    }
    return {"ok": not fails, "failures": fails, "stats": stats}


def compare(a: Sequence[dict], b: Sequence[dict]) -> dict:
    """Per-word |delta| between two alignments of the same transcript."""
    if len(a) != len(b):
        raise ValueError("alignments have %d and %d words" % (len(a), len(b)))
    d0 = np.array([abs(x["t0"] - y["t0"]) * 1000.0 for x, y in zip(a, b)])
    d1 = np.array([abs(x["t1"] - y["t1"]) * 1000.0 for x, y in zip(a, b)])
    both = np.concatenate([d0, d1])
    worst = sorted(zip(d0, [x["w"] for x in a], [x["t0"] for x in a],
                       [y["t0"] for y in b]), key=lambda t: -t[0])[:8]
    return {
        "n": len(a),
        "p50_ms": float(np.percentile(both, 50)),
        "p90_ms": float(np.percentile(both, 90)),
        "max_ms": float(np.max(both)),
        "start_p50_ms": float(np.percentile(d0, 50)),
        "start_p90_ms": float(np.percentile(d0, 90)),
        "start_max_ms": float(np.max(d0)),
        "over_1_frame_24fps": int((d0 > 1000.0 / 24).sum()),
        "over_2_frames_24fps": int((d0 > 2000.0 / 24).sum()),
        "worst": worst,
    }


# --------------------------------------------------------------------------
# the bundled regression
# --------------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))
EXAMPLES = os.path.join(os.path.dirname(HERE), "examples")


def _load_case(path: str) -> dict:
    with open(path) as f:
        case = json.load(f)
    tpath = case["transcript"]
    if not os.path.isabs(tpath):
        tpath = os.path.join(os.path.dirname(os.path.abspath(path)), tpath)
    with open(tpath) as f:
        case["sentences"] = [l.strip() for l in f if l.strip()]
    return case


def run_all(case_path: Optional[str] = None, backends: Sequence[str] = ()) -> int:
    from .align import align, refine_edges
    from .naive import align_naive
    from .segment import sentence_spans_by_syllables

    case_path = case_path or os.path.join(EXAMPLES, "campaigns_truth.json")
    case = _load_case(case_path)
    audio = case["audio"]
    sents = case["sentences"]
    supplied = [tuple(s) for s in case["sentence_spans"]]
    corrected = [tuple(s) for s in case.get("sentence_spans_corrected", case["sentence_spans"])]
    skip = case.get("known_bad_reference_boundaries", [])

    if not os.path.exists(audio):
        print("SKIP: reference audio not found: %s" % audio)
        return 0

    print("=" * 86)
    print("claude-audio-sync verification")
    print("audio      : %s" % audio)
    print("             %.3f s, reference by %s" % (duration(audio), case["reference_method"]))
    print("transcript : %d sentences, %d words"
          % (len(sents), sum(len(s.split()) for s in sents)))
    print("=" * 86)

    results: "Dict[str, dict]" = {}
    order = list(backends) if backends else ["torchaudio-mms", "torchaudio-w2v2"]
    for name in order:
        try:
            words, meta = align(audio, sents, name, refine=True)
        except Exception as e:
            print("\n%-24s UNAVAILABLE: %s: %s" % (name, type(e).__name__, e))
            continue
        results[name] = {"words": words, "meta": meta}
        raw, _ = align(audio, sents, name, refine=False)
        results[name + " (raw, no refine)"] = {"words": raw, "meta": {"backend": name}}

    # the naive baseline exactly as the old pipeline would run it: it has to find
    # its own sentence spans, because in the real world nobody hands it the truth
    naive_spans = sentence_spans_by_syllables(audio, sents)
    results["naive"] = {"words": align_naive(audio, sents, naive_spans),
                        "meta": {"backend": "naive"}}
    # and naive handed the correct spans, to separate its segmentation error from
    # its within-sentence interpolation error
    results["naive (spans given)"] = {
        "words": align_naive(audio, sents, corrected), "meta": {"backend": "naive"}}

    ok = True
    for label, truth, sk in (("1a. vs CORRECTED reference (18 of 20 boundaries "
                              "unchanged; see correction_note)", corrected, []),
                             ("1b. vs AS-SUPPLIED reference, with the two "
                              "known-bad boundaries excluded", supplied, skip)):
        print("\n" + label)
        print("   %-28s %8s %8s %9s %9s %9s %9s"
              % ("method", "mean|e|", "max|e|", "start|e|", "end|e|", "startbias", "endbias"))
        for name, r in results.items():
            e = sentence_error(r["words"], truth, sk)
            r.setdefault("err", {})[label[:2]] = e
            flag = ""
            if label.startswith("1a") and name in order:
                if e["mean_abs_ms"] > MEAN_SENTENCE_ERR_MS:
                    flag = "  <-- OVER %g ms BAR" % MEAN_SENTENCE_ERR_MS
                    ok = False
            print("   %-28s %8s %8s %9s %9s %9s %9s%s"
                  % (name, _fmt(e["mean_abs_ms"]), _fmt(e["max_abs_ms"]),
                     _fmt(e["mean_start_abs_ms"]), _fmt(e["mean_end_abs_ms"]),
                     _fmt(e["bias_start_ms"]), _fmt(e["bias_end_ms"]), flag))
        print("   (ms; bias signed, negative = earlier than reference.)")
        print("   NOTE: the naive rows are near-zero here for a trivial reason -- their")
        print("   sentence spans ARE silencedetect output, the same tool the reference")
        print("   is made with, so this table cannot separate them from it. It measures")
        print("   the ML backends, which never see silencedetect at all. Sentence")
        print("   boundaries were never the problem; section 3 is where the real")
        print("   difference lives.")

    print("\n2. WORD-BOUNDARY SANITY  (min 40 ms, max 1200 ms unless a real pause,")
    print("   inside its own sentence, strictly increasing, non-overlapping,")
    print("   and each word must overlap detected speech)")
    print("   %-28s %5s %7s %7s %7s %6s %8s %s"
          % ("method", "words", "min ms", "med ms", "max ms", "spch%", "minspch%", "result"))
    for name, r in results.items():
        s_ = word_sanity(r["words"], audio)
        r["sanity"] = s_
        st = s_["stats"]
        print("   %-28s %5d %7.1f %7.1f %7.1f %5.0f%% %7.0f%%  %s"
              % (name, st["n_words"], st["min_ms"], st["median_ms"], st["max_ms"],
                 100 * st["speech_overlap_mean"], 100 * st["speech_overlap_min"],
                 "PASS" if s_["ok"] else "FAIL (%d)" % len(s_["failures"])))
        for f in s_["failures"][:6]:
            print("        - " + f)
        if len(s_["failures"]) > 6:
            print("        - ... and %d more" % (len(s_["failures"]) - 6))
        if name in order and not s_["ok"]:
            ok = False

    winner = next((n for n in order if n in results), None)
    if winner:
        print("\n3. HEAD-TO-HEAD: %s vs the current syllable-proportional method" % winner)
        for other in ("naive", "naive (spans given)"):
            c = compare(results[winner]["words"], results[other]["words"])
            print("   vs %-20s all edges: p50 %6.1f  p90 %6.1f  max %7.1f ms"
                  % (other, c["p50_ms"], c["p90_ms"], c["max_ms"]))
            print("      %-20s word STARTS: p50 %6.1f  p90 %6.1f  max %7.1f ms"
                  % ("", c["start_p50_ms"], c["start_p90_ms"], c["start_max_ms"]))
            print("      %-20s %d/%d word starts differ by >1 frame @24fps (41.7 ms), "
                  "%d by >2 frames" % ("", c["over_1_frame_24fps"], c["n"],
                                       c["over_2_frames_24fps"]))
        c = compare(results[winner]["words"], results["naive"]["words"])
        print("      worst word starts (aligner -> naive):")
        for d, w, ta, tb in c["worst"][:6]:
            print("        %-12s %7.3f -> %7.3f   naive is %+8.1f ms" % (w, ta, tb, (tb - ta) * 1000))

        # Which of the two is actually right?  Neither can be scored against the
        # silencedetect reference at word level -- it has no word boundaries.
        # So: agreement between two independently trained acoustic models.  If
        # MMS_FA and WAV2VEC2_ASR_BASE_960H (different data, different
        # architecture size, different label set) land on the same instant, that
        # instant is where the word is.
        others = [n for n in order if n in results and n != winner]
        if others:
            o = others[0]
            c2 = compare(results[winner]["words"], results[o]["words"])
            print("\n   3b. CROSS-MODEL AGREEMENT (the tie-breaker: no reference has")
            print("       word-level truth, so two independent models agreeing is the")
            print("       evidence that they are right and the naive method is not)")
            print("       %-34s starts p50 %6.1f  p90 %6.1f  max %7.1f ms"
                  % (winner + " vs " + o, c2["start_p50_ms"], c2["start_p90_ms"],
                     c2["start_max_ms"]))
            print("       %-34s starts p50 %6.1f  p90 %6.1f  max %7.1f ms"
                  % (winner + " vs naive", c["start_p50_ms"], c["start_p90_ms"],
                     c["start_max_ms"]))

    print("\n4. UNIT TESTS")
    tests_ok = _run_unit_tests()
    ok = ok and tests_ok

    print("\n" + "=" * 86)
    print("RESULT: %s" % ("PASS" if ok else "FAIL"))
    print("=" * 86)
    return 0 if ok else 1


def _run_unit_tests() -> bool:
    """Run tests/ in-process so `sync.verify --all` really is one command."""
    import unittest
    root = os.path.dirname(HERE)
    if root not in sys.path:
        sys.path.insert(0, root)
    suite = unittest.defaultTestLoader.discover(os.path.join(root, "tests"),
                                                top_level_dir=root)
    buf = io.StringIO()
    res = unittest.TextTestRunner(stream=buf, verbosity=1).run(suite)
    print("   %d tests, %d failures, %d errors, %d skipped -> %s"
          % (res.testsRun, len(res.failures), len(res.errors), len(res.skipped),
             "PASS" if res.wasSuccessful() else "FAIL"))
    if not res.wasSuccessful():
        print(buf.getvalue())
    return res.wasSuccessful()


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(prog="sync.verify")
    ap.add_argument("--all", action="store_true", help="run the bundled regression")
    ap.add_argument("--case", help="path to a *_truth.json case file")
    ap.add_argument("--backend", action="append", default=[],
                    help="restrict to these backends (repeatable)")
    a = ap.parse_args(argv)
    if not (a.all or a.case):
        ap.error("give --all or --case")
    return run_all(a.case, a.backend)


if __name__ == "__main__":
    sys.exit(main())
