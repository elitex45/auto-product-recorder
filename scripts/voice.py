"""Turn a demo's narration.json into one Kokoro voice clip per beat.

usage: python scripts/voice.py <demo dir>

Reads  <demo dir>/narration.json   {"<beatId>": "<what is said>", ...}
       <demo dir>/demo.json        optional "voice", "speed", "lang" (env VOICE / SPEED / LANG_CODE win)
Writes <demo dir>/audio/<beatId>.wav   (24 kHz mono)
       <demo dir>/audio/index.json     {"<beatId>": <duration ms>, ...}  read by the recorder AND the assembler

Clips whose text, voice and speed did not change are reused, so editing one
sentence only re-generates that one clip.
"""
import hashlib
import json
import os
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402

SAMPLE_RATE = 24000
PEAK = 10 ** (-1.5 / 20)  # every clip peaks at -1.5 dBFS


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/voice.py <demo dir>")
    demo = Path(sys.argv[1]).resolve()
    narration = json.loads((demo / "narration.json").read_text())
    cfg_path = demo / "demo.json"
    cfg = json.loads(cfg_path.read_text()) if cfg_path.exists() else {}
    voice = os.environ.get("VOICE") or cfg.get("voice", "af_heart")
    speed = float(os.environ.get("SPEED") or cfg.get("speed", 1.0))
    lang = os.environ.get("LANG_CODE") or cfg.get("lang", voice[0])  # a = American, b = British English

    audio = demo / "audio"
    audio.mkdir(exist_ok=True)
    cache_path = audio / ".cache.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}

    pipeline = None
    index = {}
    for beat, text in narration.items():
        key = hashlib.sha1(f"{voice}|{speed}|{PEAK}|{text}".encode()).hexdigest()
        wav = audio / f"{beat}.wav"
        if cache.get(beat, {}).get("key") == key and wav.exists():
            index[beat] = cache[beat]["ms"]
            print(f"  {beat}: unchanged ({index[beat] / 1000:.1f}s)")
            continue
        if pipeline is None:
            from kokoro import KPipeline

            print(f"loading Kokoro (voice {voice}, speed {speed}, lang {lang})")
            pipeline = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
        chunks = [np.asarray(a) for _, _, a in pipeline(text, voice=voice, speed=speed) if a is not None]
        if not chunks:
            sys.exit(f"Kokoro produced no audio for beat {beat!r}")
        samples = np.concatenate(chunks)
        samples = samples * (PEAK / max(float(np.abs(samples).max()), 1e-6))  # Kokoro is quiet; lift to a steady level
        sf.write(wav, samples, SAMPLE_RATE)
        ms = int(len(samples) * 1000 / SAMPLE_RATE)
        index[beat] = ms
        cache[beat] = {"key": key, "ms": ms}
        print(f"  {beat}: {ms / 1000:.1f}s")

    (audio / "index.json").write_text(json.dumps(index, indent=1))
    cache_path.write_text(json.dumps(cache, indent=1))
    print(f"{len(index)} clips, total {sum(index.values()) / 1000:.1f}s -> {audio / 'index.json'}")


if __name__ == "__main__":
    main()
