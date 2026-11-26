#!/usr/bin/env python3
"""A free local voice-over with Kokoro, checked word by word with faster-whisper.

Run it like this (uv installs the packages in a cache, nothing is added to your Python):
  uv run --with kokoro-onnx --with soundfile --with faster-whisper python voice.py say \
      --lines lines.json --out voice.wav [--voice af_heart] [--speed 1.0]
  uv run --with kokoro-onnx --with soundfile --with faster-whisper python voice.py voices
It also works after `pip install kokoro-onnx soundfile faster-whisper`.

lines.json is a list of lines with their start time: [{"t": 1.2, "text": "Meet the new app."}, ...]
Each line is placed at its time. A line never overlaps the next one: it is moved later, with a warning.
Then every line is transcribed with faster-whisper (small.en, CPU, int8). If the words heard are not the
words written (case and punctuation do not count), the script FAILS with exit code 1 and writes nothing.
On success it writes voice.wav (48 kHz) and voice.wav.words.json with the time of every word (for captions).

Models and licences (checked November 26, 2026 at the primary sources):
  - kokoro-onnx (the Python package): MIT, https://github.com/thewh1teagle/kokoro-onnx (LICENSE file;
    its README says "kokoro-onnx: MIT, kokoro model: Apache 2.0").
  - Kokoro-82M (the voice model): Apache-2.0, https://huggingface.co/hexgrad/Kokoro-82M (model card).
  - Model files, from the GitHub release "model-files-v1.0" of thewh1teagle/kokoro-onnx:
      https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
        (325532387 bytes, the full f32 model)
      https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
        (28214398 bytes, the voice styles)
    The release lists no checksums, so the sizes come from the GitHub API and the SHA-256 values below
    were computed from the first download.
  - faster-whisper: MIT, https://github.com/SYSTRAN/faster-whisper
  - Pulled in by kokoro-onnx at run time (downloaded by uv, never shipped here): phonemizer and espeakng-loader,
    which bundles espeak-ng. Both are GPL-3.0. The skill only runs them as tools; no GPL code is in this repo.
  - Systran/faster-whisper-small.en (the check model, downloaded by faster-whisper from Hugging Face): MIT,
    https://huggingface.co/Systran/faster-whisper-small.en (model card).
Files are cached once in %LOCALAPPDATA%/video-skill (Windows), ~/Library/Caches/video-skill (macOS) or
~/.cache/video-skill (Linux).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.request

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sound  # noqa: E402  (same folder: WAV writer and resampler)
for _s in (sys.stdout, sys.stderr):  # user and web text (arrows, emoji, any script) on a Windows pipe
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
FILES = {
    "kokoro-v1.0.onnx": (325532387, "7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5"),
    "voices-v1.0.bin": (28214398, "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d"),
}
WHISPER_MODEL = "small.en"
KOKORO_SR = 24000
GAP = 0.08  # smallest silence between two lines, in seconds


def die(msg: str) -> None:
    print(f"voice.py: {msg}", file=sys.stderr)
    sys.exit(1)


def warn(msg: str) -> None:
    print(f"voice.py: warning: {msg}", file=sys.stderr)


def cache_dir() -> str:
    if sys.platform.startswith("win"):
        base = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~/AppData/Local")
    elif sys.platform == "darwin":
        base = os.path.expanduser("~/Library/Caches")
    else:
        base = os.environ.get("XDG_CACHE_HOME") or os.path.expanduser("~/.cache")
    d = os.path.join(base, "video-skill")
    os.makedirs(d, exist_ok=True)
    return d


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def fetch(name: str) -> str:
    """Downloads a model file once (to a temp name, then renamed) and checks its size and hash."""
    size, digest = FILES[name]
    path = os.path.join(cache_dir(), name)
    if os.path.isfile(path) and os.path.getsize(path) == size:
        return path
    tmp = path + ".part"
    print(f"voice.py: downloading {name} ({size / 1e6:.0f} MB, once) to {cache_dir()}", file=sys.stderr)
    try:
        req = urllib.request.Request(RELEASE + name, headers={"User-Agent": "video-skill"})
        with urllib.request.urlopen(req, timeout=60) as r, open(tmp, "wb") as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
    except OSError as e:
        if os.path.exists(tmp):
            os.remove(tmp)
        die(f"could not download {RELEASE + name}: {e}")
    if os.path.getsize(tmp) != size:
        got = os.path.getsize(tmp)
        os.remove(tmp)
        die(f"{name} downloaded with {got} bytes, expected {size}; try again")
    if digest and sha256(tmp) != digest:
        os.remove(tmp)
        die(f"{name} does not match its known SHA-256; the release file may have changed")
    os.replace(tmp, path)
    return path


def voice_names() -> list:
    with np.load(fetch("voices-v1.0.bin")) as z:
        return sorted(z.files)


NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
       "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]


def say_number(n: int) -> str:
    if n < 20:
        return NUM[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + NUM[n % 10])
    if n < 1000:
        return NUM[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + say_number(n % 100))
    return str(n)


def norm_words(text: str) -> list:
    """Lower case, no punctuation, apostrophes joined, hyphens split, small numbers as words."""
    t = text.lower().replace("\u2019", "'").replace("'", "")
    t = re.sub(r"(\d),(\d)", r"\1\2", t)
    t = re.sub(r"[^a-z0-9%]+", " ", t)
    out = []
    for w in t.split():
        if w.endswith("%") and w[:-1].isdigit():
            out += say_number(int(w[:-1])).split() + ["percent"]
        elif w.isdigit() and len(w) <= 3:
            out += say_number(int(w)).split()
        elif w != "%":
            out.append(w)
    return out


def load_lines(path: str) -> list:
    try:
        with open(path, encoding="utf-8") as f:
            lines = json.load(f)
    except (OSError, ValueError) as e:
        die(f"cannot read {path}: {e}")
    if not isinstance(lines, list) or not lines:
        die(f'{path} must be a list like [{{"t": 1.2, "text": "..."}}]')
    out = []
    for i, ln in enumerate(lines):
        try:
            t = float(ln["t"])
            text = str(ln["text"]).strip()
        except (KeyError, TypeError, ValueError):
            die(f'line {i} in {path} needs "t" (seconds) and "text"')
        if not text:
            die(f"line {i} in {path} has no text")
        out.append({"t": max(0.0, t), "text": text})
    return sorted(out, key=lambda x: x["t"])


def cmd_say(a) -> int:
    lines = load_lines(a.lines)
    if not (a.voice[:1] in ("a", "b") and a.voice[1:3] in ("f_", "m_")):
        die("the word check uses an English model, so use an English voice (af_, am_, bf_ or bm_ names). "
            "Run `voice.py voices` to see them")
    names = voice_names()
    if a.voice not in names:
        die(f'unknown voice "{a.voice}". Run `voice.py voices` to see the {len(names)} names')
    try:
        from kokoro_onnx import Kokoro
        from faster_whisper import WhisperModel
    except ImportError as e:
        die(f"missing package ({e}). Run with: uv run --with kokoro-onnx --with soundfile --with faster-whisper "
            "python voice.py ...")
    tts = Kokoro(fetch("kokoro-v1.0.onnx"), fetch("voices-v1.0.bin"))
    lang = "en-us" if a.voice.startswith("a") else "en-gb"

    clips = []
    prev_end = 0.0
    for i, ln in enumerate(lines):
        audio, sr = tts.create(ln["text"], voice=a.voice, speed=a.speed, lang=lang)
        audio = np.asarray(audio, dtype=np.float64)
        if sr != KOKORO_SR:
            audio = sound.resample(audio[:, None], sr, KOKORO_SR)[:, 0]
        start = ln["t"]
        if i and start < prev_end + GAP:
            warn(f'line {i} ("{ln["text"][:40]}") would overlap the line before; moved from {start:.2f} s '
                 f"to {prev_end + GAP:.2f} s")
            start = prev_end + GAP
        dur = len(audio) / KOKORO_SR
        clips.append({"i": i, "t": round(start, 4), "dur": round(dur, 4), "text": ln["text"], "audio": audio})
        prev_end = start + dur

    print(f"voice.py: checking {len(clips)} lines with faster-whisper {WHISPER_MODEL} (CPU, int8)", file=sys.stderr)
    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8",
                         download_root=os.path.join(cache_dir(), "whisper"))
    words_out = []
    failed = []
    for c in clips:
        a16 = sound.resample(c["audio"][:, None], KOKORO_SR, 16000)[:, 0].astype(np.float32)
        segs, _ = model.transcribe(a16, language="en", beam_size=5, word_timestamps=True,
                                   condition_on_previous_text=False, vad_filter=False)
        heard = [w for s in segs for w in (s.words or [])]
        want = norm_words(c["text"])
        got = norm_words(" ".join(w.word for w in heard))
        if want != got:
            failed.append((c, " ".join(want), " ".join(got)))
            continue
        # map the whisper word times back to the words of the script (same count after normalising)
        script_words = c["text"].split()
        timed = []
        for w in heard:
            for part in norm_words(w.word):
                timed.append((part, w.start, w.end))
        k = 0
        for sw in script_words:
            n = len(norm_words(sw))
            if n == 0:
                continue
            seg = timed[k : k + n]
            k += n
            words_out.append({"line": c["i"], "word": sw, "t0": round(c["t"] + seg[0][1], 3),
                              "t1": round(c["t"] + seg[-1][2], 3)})
    if failed:
        for c, want, got in failed:
            print(f"voice.py: line {c['i']} at {c['t']:.2f} s FAILED the word check\n"
                  f"  written: {want}\n  heard:   {got}", file=sys.stderr)
        print("voice.py: nothing written. Rewrite those lines (spell out names, numbers and symbols the way "
              "they are said) or try another voice or --speed", file=sys.stderr)
        return 1

    total = max(c["t"] + c["dur"] for c in clips) + a.tail
    if a.dur:
        if a.dur < total - a.tail:
            warn(f"--dur {a.dur} is shorter than the voice ({total - a.tail:.2f} s); the voice is kept whole")
        total = max(total - a.tail, a.dur)
    out = np.zeros(sound.nsamp(total))
    for c in clips:
        x = sound.resample(c["audio"][:, None], KOKORO_SR, sound.SR)[:, 0]
        x = sound.seal(x, 3)
        i0 = sound.nsamp(c["t"]) if c["t"] > 0 else 0
        out[i0 : i0 + len(x)] += x[: len(out) - i0]
    pk = float(np.abs(out).max())
    if pk > 0.89:
        out *= 0.89 / pk
    sound.write_wav(a.out, out)
    with open(a.out + ".words.json", "w", encoding="utf-8") as f:
        json.dump({"voice": a.voice, "lines": [{k: v for k, v in c.items() if k != "audio"} for c in clips],
                   "words": words_out}, f, indent=1)
    print(json.dumps({"out": a.out, "lines": len(clips), "words": len(words_out), "dur": round(total, 3),
                      "check": "passed"}))
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="voice.py", description="Kokoro voice-over, checked with faster-whisper.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("say", help="speak lines.json into one WAV, check every word")
    s.add_argument("--lines", required=True, help='JSON list: [{"t": 1.2, "text": "..."}]')
    s.add_argument("--out", required=True)
    s.add_argument("--voice", default="af_heart")
    s.add_argument("--speed", type=float, default=1.0)
    s.add_argument("--dur", type=float, help="pad the file to this length in seconds (the film length)")
    s.add_argument("--tail", type=float, default=0.3, help="silence after the last line when --dur is not given")
    sub.add_parser("voices", help="list the voice names")
    a = ap.parse_args(argv)
    if a.cmd == "voices":
        for n in voice_names():
            print(n)
        return 0
    if not 0.5 <= a.speed <= 2.0:
        die("--speed must be between 0.5 and 2.0")
    return cmd_say(a)


if __name__ == "__main__":
    sys.exit(main())
