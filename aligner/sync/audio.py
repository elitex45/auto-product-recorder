"""ffmpeg-pipe audio helpers.

`soundfile` is deliberately NOT a dependency: it is not installed on the target
machine and pulls libsndfile.  ffmpeg is present and already decodes everything
the pipeline touches, so every read/write here is an ffmpeg subprocess with the
samples travelling over a pipe as raw little-endian float32 ("f32le").
"""
from __future__ import annotations

import json
import shutil
import subprocess
from typing import List, Sequence

import numpy as np

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"


class FfmpegError(RuntimeError):
    pass


def _run(cmd: Sequence[str], stdin: bytes | None = None) -> bytes:
    p = subprocess.run(list(cmd), input=stdin, capture_output=True)
    if p.returncode != 0:
        raise FfmpegError(
            "%s failed (%d): %s" % (cmd[0], p.returncode, p.stderr.decode("utf8", "replace")[-2000:])
        )
    return p.stdout


def read_f32(path: str, sr: int = 16000, channels: int = 1) -> np.ndarray:
    """Decode `path` to float32 samples at `sr` Hz.

    Returns a 1-D array when channels == 1, otherwise interleaved frames of
    shape (n, channels).
    """
    raw = _run([FFMPEG, "-v", "error", "-i", path,
                "-ac", str(channels), "-ar", str(sr), "-f", "f32le", "-"])
    x = np.frombuffer(raw, np.float32)
    if channels > 1:
        x = x.reshape(-1, channels)
    return np.ascontiguousarray(x)


def write_wav(path: str, x: np.ndarray, sr: int, channels_out: int = 2) -> None:
    """Write float32 mono samples out as 16-bit PCM."""
    x = np.ascontiguousarray(np.asarray(x, np.float32))
    _run([FFMPEG, "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1",
          "-i", "-", "-ac", str(channels_out), "-c:a", "pcm_s16le", path],
         stdin=x.tobytes())


def duration(path: str) -> float:
    out = _run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                "-of", "json", path])
    return float(json.loads(out)["format"]["duration"])


def atempo(x: np.ndarray, sr: int, rate: float) -> np.ndarray:
    """Time-stretch without changing pitch.

    ffmpeg's atempo filter only accepts 0.5..2.0 per instance, so anything
    outside that gets chained (0.4 -> 0.5,0.8).  rate == 1.0 is a no-op.
    """
    if abs(rate - 1.0) < 1e-9:
        return x
    stages: List[float] = []
    r = float(rate)
    while r < 0.5:
        stages.append(0.5)
        r /= 0.5
    while r > 2.0:
        stages.append(2.0)
        r /= 2.0
    stages.append(r)
    af = ",".join("atempo=%.6f" % s for s in stages)
    raw = _run([FFMPEG, "-v", "error", "-f", "f32le", "-ar", str(sr), "-ac", "1",
                "-i", "-", "-af", af, "-f", "f32le", "-"],
               stdin=np.ascontiguousarray(x, np.float32).tobytes())
    return np.frombuffer(raw, np.float32)


def rms_envelope(x: np.ndarray, sr: int, fps: int = 100) -> np.ndarray:
    """Frame-wise RMS at `fps` frames/second.

    100 fps (10 ms hop) is what the existing vo3.py naive method used, and it is
    the resolution at which "snap to the quietest sample" is meaningful: finer
    than a phoneme boundary is measured, coarser than a video frame at 24 fps.
    """
    hop = max(1, sr // fps)
    n = len(x) // hop
    if n == 0:
        return np.zeros(0, np.float32)
    fr = x[: n * hop].reshape(n, hop).astype(np.float64)
    return np.sqrt((fr * fr).mean(axis=1) + 1e-12).astype(np.float32)


def db(env: np.ndarray) -> np.ndarray:
    return 20.0 * np.log10(env + 1e-12)
