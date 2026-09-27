"""Turn a real song into a studio film's music bed: trimmed, levelled, ducked under the voice, faded.
Use it in place of scripts/music.py when the film should play an existing track.

usage: python scripts/song-bed.py <demo dir> <song file> [--start=S] [--fade-in=S]

Reads  <demo dir>/film.json       "frames", "pace", "voice" {beatId: start frame}, "music" {"duck"}
       <demo dir>/audio/<id>.wav  the voice clips, so the song can dip under them
       <song file>                any format ffmpeg reads (mp3, wav, m4a ...)
Writes <demo dir>/music/bed.wav   as long as the film

--start    seconds into the song where the film's music begins (default 0)
--fade-in  seconds of fade at the top, so the song does not start mid-hit (default 0)

The song is set to the same average level as a bed from scripts/music.py (-17 dBFS RMS) before
ducking, so a film sounds the same whichever script made its bed. The film plays the bed at 0.55
and film.mjs loudnorms the final mix to -14 LUFS.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 44100
FPS = 30
TARGET_RMS_DB = -17.0
FFMPEG = Path(__file__).resolve().parent.parent / "node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opt = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--"))
    if len(args) != 2:
        sys.exit("usage: python scripts/song-bed.py <demo dir> <song file> [--start=S] [--fade-in=S]")
    demo, song = Path(args[0]), args[1]
    start, fade_in = float(opt.get("start", 0)), float(opt.get("fade-in", 0))
    film = json.loads((demo / "film.json").read_text())
    pace = film.get("pace", 1)
    total = film["frames"] * pace / FPS
    n = int(total * SR)

    ff = str(FFMPEG) if FFMPEG.exists() else "ffmpeg"
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "song.wav"
        subprocess.run([ff, "-v", "error", "-y", "-ss", str(start), "-t", str(total + 1), "-i", song,
                        "-ar", str(SR), "-ac", "2", str(wav)], check=True)
        x, _ = sf.read(wav)
    if len(x) < n:
        x = np.concatenate([x, np.zeros((n - len(x), 2))])
    x = x[:n]
    x *= 10 ** (TARGET_RMS_DB / 20) / max(np.sqrt(np.mean(x ** 2)), 1e-9)

    # Duck under the voice, same envelope as scripts/music.py.
    duck = np.ones(n)
    for vid, frame in film.get("voice", {}).items():
        clip = demo / "audio" / f"{vid}.wav"
        if not clip.exists():
            continue
        v, vsr = sf.read(clip)
        k0 = int(frame * pace / FPS * SR)
        k1 = min(n, k0 + int(len(v) / vsr * SR))
        duck[max(0, k0 - int(0.08 * SR)): k1 + int(0.15 * SR)] = film.get("music", {}).get("duck", 0.25)
    duck = sosfilt(butter(1, 6, fs=SR, output="sos"), duck)  # ~60 ms glide in and out

    t = np.arange(n) / SR
    env = duck * np.clip((total - t) / 2.5, 0, 1) ** 1.5  # fade the last 2.5 s
    if fade_in:
        env *= np.clip(t / fade_in, 0, 1) ** 2
    x *= env[:, None]
    x *= min(1, 10 ** (-1 / 20) / max(np.abs(x).max(), 1e-9))  # never above -1 dBFS peak
    (demo / "music").mkdir(exist_ok=True)
    sf.write(demo / "music" / "bed.wav", x, SR)
    print(f"music/bed.wav: {total:.2f}s from {start}s of {Path(song).name}, fade-in {fade_in}s")


if __name__ == "__main__":
    main()
