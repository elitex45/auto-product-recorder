"""Make a music bed and a set of sound effects for a studio film. Everything is synthesized here,
so there is nothing to license.

usage: python scripts/music.py <demo dir>

Reads  <demo dir>/film.json      "frames", "pace", "voice" {beatId: start frame}, "music" {bpm, chords, bars, duck}
                                 (frames are choreography frames; the output is pace times longer)
       <demo dir>/audio/<id>.wav the voice clips, so the music can dip under them
Writes <demo dir>/music/bed.wav  the track, as long as the film, ducked under the voice
       <demo dir>/music/sfx/*.wav one-shots the film places itself (whoosh, click, pop, chime, ...)

music.bars is one word per bar (4 beats), which says what plays in that bar:
  intro  pad, soft kick, hats          main  kick, clap, hats, bass, arp, pad
  break  pad and arp only (a quiet dip) rise  break plus a riser into the next bar
  end    one long chord, sub and a hit on its first beat, then a fade
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 44100
FPS = 30
rng = np.random.default_rng(7)  # fixed seed: the same film.json always gives the same track

NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def chord_notes(name: str) -> list[int]:
    """'Am' -> MIDI notes of A minor around middle C (root, third, fifth)."""
    minor = name.endswith("m")
    root = NOTE[name[:-1] if minor else name]
    return [57 + (root - 9) % 12 + i for i in (0, 3 if minor else 4, 7)]


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def env(n, attack, decay):
    """Attack in s, then exponential decay with time constant `decay` s."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    ph = (t * f * (1 + detune)) % 1.0
    return 2 * ph - 1


# ---------- instruments (each returns a mono numpy array) ----------

def kick(soft=False):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.16)
    click = hp(rng.standard_normal(n), 2500) * env(n, 0.0005, 0.004) * 0.35
    return (body + click) * (0.55 if soft else 0.9)


def clap():
    n = int(0.3 * SR)
    noise = bp(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for d in (0.0, 0.011, 0.022):  # three quick bursts, like hands
        k = int(d * SR)
        e[k:] += env(n - k, 0.0005, 0.012 if d < 0.02 else 0.11)
    return noise * e * 0.35


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    return hp(rng.standard_normal(n), 7000) * env(n, 0.0005, 0.07 if open_ else 0.014) * 0.16


def pluck(midi, dur=0.28):
    n = int(dur * SR)
    f = hz(midi)
    tone = saw(f, n) * 0.6 + saw(f, n, 0.004) * 0.4
    return lp(tone, 2600) * env(n, 0.002, 0.09) * 0.16


def bass_note(midi, dur):
    n = int(dur * SR)
    f = hz(midi)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * t) * 0.8 + lp(saw(f, n), 500) * 0.35
    return tone * env(n, 0.004, dur * 0.6) * 0.42


def pad(notes, dur):
    n = int(dur * SR)
    x = np.zeros(n)
    for m in notes:
        for d in (-0.006, 0.0, 0.007):
            x += saw(hz(m), n, d)
    x = lp(x / (len(notes) * 3), 1400)
    t = np.arange(n) / SR
    fade = np.clip(t / 0.25, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
    return x * fade * 0.16


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    noise = rng.standard_normal(n)
    # sweep a band upward in short blocks
    out = np.zeros(n)
    block = 2048
    for i in range(0, n, block):
        c = 300 + 7000 * p[i] ** 2
        seg = bp(noise[max(0, i - 4096): i + block], c * 0.7, min(c * 1.4, SR / 2 - 100))[-min(block, n - i):]
        out[i: i + len(seg)] = seg
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * p ** 2) / SR) * 0.15
    return (out * 0.5 + tone) * p ** 1.6 * 0.6


def impact():
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.05)) / SR) * env(n, 0.001, 0.5)
    tail = lp(rng.standard_normal(n), 3000) * env(n, 0.001, 0.35) * 0.35
    return (boom + tail) * 0.9


# ---------- sound effects (one-shots the film places) ----------

def whoosh(dur=0.45):
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    block = 1024
    for i in range(0, n, block):
        p = t[i] / dur
        c = 400 + 4000 * np.sin(np.pi * p)
        seg = bp(noise[max(0, i - 2048): i + block], c * 0.6, min(c * 1.6, SR / 2 - 100))[-min(block, n - i):]
        out[i: i + len(seg)] = seg
    return out * np.sin(np.pi * t / dur) ** 2 * 0.5


def click_sfx():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2200 * t) * 0.5 + hp(rng.standard_normal(n), 3000) * 0.4) * env(n, 0.0003, 0.006) * 0.6


def pop():
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    f = 300 + 600 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.05) * 0.5


def chime():
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * hz(m) * t) * a for m, a in ((84, 0.5), (88, 0.35), (91, 0.3), (96, 0.15)))
    return x * env(n, 0.002, 0.45) * 0.35


def sparkle():
    n = int(1.2 * SR)
    x = np.zeros(n)
    for _ in range(26):
        k = int(rng.uniform(0, 0.9) * SR)
        m = int(0.08 * SR)
        f = rng.uniform(3000, 7500)
        tt = np.arange(m) / SR
        x[k: k + m] += np.sin(2 * np.pi * f * tt) * env(m, 0.0005, 0.02) * rng.uniform(0.2, 0.6)
    return x * np.linspace(1, 0.3, n) * 0.35


def swell():
    """Short reverse-cymbal swell that lands on the next beat (use 0.5 s before a hit)."""
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 4000) * (t / 0.5) ** 3 * 0.35


# ---------- arrangement ----------

def place(track, sound, at):
    k = int(at * SR)
    if k >= len(track):
        return
    m = min(len(sound), len(track) - k)
    track[k: k + m] += sound[:m]


def build(film: dict, demo: Path) -> np.ndarray:
    m = film["music"]
    # "pace" stretches the whole film (see studio/film.mjs); the tempo slows by the same factor,
    # so every move that sat on a beat still does.
    pace = film.get("pace", 1.0)
    beat = 60.0 / m["bpm"] * pace
    bar = beat * 4
    total = film["frames"] * pace / FPS
    n = int((total + 0.1) * SR)
    drums, bass, keys = np.zeros(n), np.zeros(n), np.zeros(n)
    chords = m["chords"]

    for b, kind in enumerate(m["bars"]):
        t0 = b * bar
        if t0 >= total:
            break
        notes = chord_notes(chords[b % len(chords)])
        root = notes[0] - 24
        if kind in ("intro", "main", "break", "rise"):
            place(keys, pad(notes + [notes[0] + 12], bar + 0.3), t0)
        if kind in ("main", "break", "rise") or (kind == "intro" and b % 2 == 1):
            arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 12]
            for s in range(16):
                place(keys, pluck(arp[s % 4] + (12 if s % 8 == 6 else 0)) * (0.55 if kind == "intro" else 1), t0 + s * beat / 4)
        if kind == "intro":
            for q in (0, 2):
                place(drums, kick(soft=True), t0 + q * beat)
            for s in range(8):
                place(drums, hat() * 0.7, t0 + s * beat / 2 + beat / 4)
        if kind == "main":
            for q in range(4):
                place(drums, kick(), t0 + q * beat)
                if q in (1, 3):
                    place(drums, clap(), t0 + q * beat)
                place(drums, hat(open_=True), t0 + q * beat + beat / 2)
            for s in range(16):
                if s % 4 != 2:
                    place(drums, hat() * (1.0 if s % 2 == 0 else 0.6), t0 + s * beat / 4)
            for e in range(8):  # eighth-note bass
                place(bass, bass_note(root + (12 if e % 4 == 3 else 0), beat / 2), t0 + e * beat / 2)
        if kind == "rise":
            place(drums, riser(bar), t0)
            for s in range(8, 16):  # a snare roll into the next bar
                place(drums, clap() * (0.3 + 0.05 * s), t0 + s * beat / 4)
        if kind == "end":
            if b == m["bars"].index("end"):
                place(drums, impact(), t0)
                end_len = total - t0
                place(keys, pad(notes + [notes[0] + 12, notes[2] + 12], end_len), t0)
                place(bass, bass_note(root, end_len) * 0.6, t0)

    # Sidechain pump: dip pads/bass right after each kick in "main" bars.
    pump = np.ones(n)
    for b, kind in enumerate(m["bars"]):
        if kind != "main":
            continue
        for q in range(4):
            k = int((b * bar + q * beat) * SR)
            L = int(beat * SR)
            seg = 1 - 0.45 * np.exp(-np.arange(L) / SR / 0.08)
            pump[k: k + L] = seg[: max(0, min(L, n - k))]
    mix = drums + (bass + keys) * pump

    # Duck everything under the voice (smooth envelope from the voice clips).
    duck = np.ones(n)
    for vid, frame in film.get("voice", {}).items():
        wav = demo / "audio" / f"{vid}.wav"
        if not wav.exists():
            continue
        v, vsr = sf.read(wav)
        k0 = int(frame * pace / FPS * SR)
        k1 = min(n, k0 + int(len(v) / vsr * SR))
        duck[max(0, k0 - int(0.08 * SR)): k1 + int(0.15 * SR)] = m.get("duck", 0.5)
    duck = lp(duck, 6, order=1)  # ~ 60 ms glide in and out
    mix = mix * duck

    # Fade the last 2.5 s, master to -1 dBFS peak, stereo with a touch of width on the keys.
    t = np.arange(n) / SR
    mix *= np.clip((total - t) / 2.5, 0, 1) ** 1.5
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix *= 10 ** (-1 / 20) / max(np.abs(mix).max(), 1e-6)
    width = lp(keys * pump * duck, 3000) * 0.08
    return np.stack([mix + width, mix - width], axis=1)[: int(total * SR)]


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/music.py <demo dir>")
    demo = Path(sys.argv[1]).resolve()
    film = json.loads((demo / "film.json").read_text())
    out = demo / "music"
    (out / "sfx").mkdir(parents=True, exist_ok=True)
    bed = build(film, demo)
    sf.write(out / "bed.wav", bed, SR)
    for name, fn in {"whoosh": whoosh, "click": click_sfx, "pop": pop, "chime": chime, "sparkle": sparkle, "swell": swell, "impact": impact}.items():
        x = fn()
        x = x * (10 ** (-3 / 20) / max(np.abs(x).max(), 1e-6))
        sf.write(out / "sfx" / f"{name}.wav", x, SR)
    # Recorded Kenney one-shots (CC0) beat the synthesized click and pop; see assets/sfx/kenney/.
    kenney = Path(__file__).resolve().parent.parent / "assets" / "sfx" / "kenney"
    for name, file in {"click": "click2", "pop": "bong_001", "land": "impactSoft_medium_001"}.items():
        x, sr = sf.read(kenney / f"{file}.ogg")
        x = x * (10 ** (-3 / 20) / max(np.abs(x).max(), 1e-6))
        sf.write(out / "sfx" / f"{name}.wav", x, sr)
    print(f"bed {len(bed) / SR:.1f}s -> {out / 'bed.wav'}; sfx -> {out / 'sfx'}")


if __name__ == "__main__":
    main()
