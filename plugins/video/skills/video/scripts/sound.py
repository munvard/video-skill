#!/usr/bin/env python3
"""Music, sound effects and the mix for a film, made in code with free local tools.

Subcommands:
  grid   --bpm B --dur S [--beats-per-bar 4]            print beat and bar times as JSON
  music  --out music.wav --dur S [--bpm B] [--key "A minor"] --mood M [--sections ...]
         [--peak T] [--seed N] [--loop]                  a produced track on a bar grid
  sfx    --meta film.meta.json --out sfx.wav [--key K] [--seed N]
                                                         every event of the film as a sound
  mix    --music music.wav --sfx sfx.wav [--voice voice.wav] --out mix.wav [--duck-db 8]
                                                         music and effects under the voice
  stats  --in file.wav [--grid file.grid.json]           numbers to check a sound you cannot hear

Needs only numpy. scipy is used for faster FFT sizes when it is installed.
Every file is 48 kHz stereo. Times are in seconds.

Parts of the instrument and effect recipes (the bell partial table, the three burst clap,
the chord voice leading cost and the keyboard typing pattern) are ported from explainroo:

  MIT License
  Copyright (c) 2026 Vincent Schmalbach

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import struct
import subprocess
import sys
import zlib

import numpy as np
for _s in (sys.stdout, sys.stderr):  # user and web text (arrows, emoji, any script) on a Windows pipe
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

try:  # scipy only makes the FFTs a little faster; numpy does the same job without it
    import scipy.fft as _fft

    _fast_len = _fft.next_fast_len
except Exception:  # noqa: BLE001
    _fft = np.fft

    def _fast_len(n: int) -> int:
        best = 1 << max(0, (n - 1).bit_length())
        p5 = 1
        while p5 < best:
            p35 = p5
            while p35 < best:
                v = p35
                while v < n:
                    v *= 2
                best = min(best, v)
                p35 *= 3
            p5 *= 5
        return best


SR = 48000
TWO_PI = 2 * math.pi


def warn(msg: str) -> None:
    print(f"sound.py: warning: {msg}", file=sys.stderr)


def die(msg: str) -> None:
    print(f"sound.py: {msg}", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# WAV files (own reader and writer, so no extra package is needed)
# ---------------------------------------------------------------------------


def write_wav(path: str, x: np.ndarray, sr: int = SR) -> None:
    """Writes 24-bit PCM. x is (n,) or (n, ch) float in -1..1. Writes to a temp name, then renames."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    ch = x.shape[1]
    q = np.clip(np.round(x * 8388607.0), -8388608, 8388607).astype("<i4")
    raw = q.reshape(-1).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    head = b"RIFF" + struct.pack("<I", 36 + len(raw)) + b"WAVE"
    head += b"fmt " + struct.pack("<IHHIIHH", 16, 1, ch, sr, sr * ch * 3, ch * 3, 24)
    head += b"data" + struct.pack("<I", len(raw))
    d = os.path.dirname(os.path.abspath(path))
    os.makedirs(d, exist_ok=True)
    tmp = path + ".part"
    with open(tmp, "wb") as f:
        f.write(head)
        f.write(raw)
        if len(raw) % 2:
            f.write(b"\0")
    os.replace(tmp, path)


def _parse_wav(data: bytes):
    if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        return None
    pos, fmt, raw = 12, None, None
    while pos + 8 <= len(data):
        cid, size = data[pos : pos + 4], struct.unpack("<I", data[pos + 4 : pos + 8])[0]
        body = data[pos + 8 : pos + 8 + size]
        if cid == b"fmt ":
            fmt = body
        elif cid == b"data":
            raw = body
            break
        pos += 8 + size + (size & 1)
    if fmt is None or raw is None:
        return None
    tag, ch, sr = struct.unpack("<HHI", fmt[:8])
    bits = struct.unpack("<H", fmt[14:16])[0]
    if tag == 0xFFFE and len(fmt) >= 26:
        tag = struct.unpack("<H", fmt[24:26])[0]
    width = bits // 8
    n = len(raw) // (width * ch)
    raw = raw[: n * width * ch]
    if tag == 3 and bits == 32:
        x = np.frombuffer(raw, "<f4").astype(np.float64)
    elif tag == 3 and bits == 64:
        x = np.frombuffer(raw, "<f8").astype(np.float64)
    elif tag == 1 and bits == 16:
        x = np.frombuffer(raw, "<i2") / 32768.0
    elif tag == 1 and bits == 24:
        b = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(np.int32)
        v = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        x = np.where(v >= 1 << 23, v - (1 << 24), v) / 8388608.0
    elif tag == 1 and bits == 32:
        x = np.frombuffer(raw, "<i4") / 2147483648.0
    elif tag == 1 and bits == 8:
        x = (np.frombuffer(raw, np.uint8).astype(np.float64) - 128) / 128.0
    else:
        return None
    return x.reshape(-1, ch), sr


def read_audio(path: str) -> np.ndarray:
    """Any audio file as (n, 2) float at 48 kHz. WAV is read directly; other formats go through ffmpeg."""
    if not os.path.isfile(path):
        die(f"file not found: {path}")
    with open(path, "rb") as f:
        data = f.read()
    got = _parse_wav(data)
    if got is None:
        if not shutil.which("ffmpeg"):
            die(f"{path} is not a WAV file this script can read, and ffmpeg is not installed to decode it")
        p = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
            capture_output=True,
        )
        if p.returncode != 0:
            die(f"ffmpeg could not decode {path}: {p.stderr.decode(errors='replace')[-300:]}")
        x, sr = np.frombuffer(p.stdout, "<f4").astype(np.float64).reshape(-1, 2), SR
    else:
        x, sr = got
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    elif x.shape[1] > 2:
        x = x[:, :2]
    if sr != SR:
        x = resample(x, sr, SR)
    return x


def resample(x: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    """Band-limited resampling with one FFT (fine for files of a few minutes)."""
    if sr_in == sr_out or len(x) == 0:
        return x
    n_out = int(round(len(x) * sr_out / sr_in))
    pad = int(0.05 * sr_in)
    xp = np.concatenate([x, np.zeros((pad,) + x.shape[1:])])
    n_in = len(xp)
    m_out = int(round(n_in * sr_out / sr_in))
    X = _fft.rfft(xp, axis=0)
    k = min(X.shape[0], m_out // 2 + 1)
    Y = np.zeros((m_out // 2 + 1,) + X.shape[1:], dtype=complex)
    Y[:k] = X[:k]
    y = _fft.irfft(Y, m_out, axis=0) * (m_out / n_in)
    return y[:n_out]


# ---------------------------------------------------------------------------
# Filters: zero-phase FFT filters (no phase shift, so drums stay on the grid)
# ---------------------------------------------------------------------------


def _mag(kind: str, f: np.ndarray, fc: float, q: float) -> np.ndarray:
    r = np.maximum(f, 1e-6) / max(fc, 1e-3)
    den = np.sqrt((1 - r * r) ** 2 + (r / q) ** 2)
    if kind == "lp":
        return 1 / den
    if kind == "hp":
        return r * r / den
    if kind == "bp":
        return (r / q) / den
    raise ValueError(kind)


def filt(x: np.ndarray, kind: str, fc: float, q: float = 0.707, order: int = 1) -> np.ndarray:
    """Low pass ('lp'), high pass ('hp') or band pass ('bp'). order 2 doubles the slope."""
    n = len(x)
    if n == 0:
        return x
    N = _fast_len(n + min(SR, 2048 + n // 8))
    f = np.fft.rfftfreq(N, 1 / SR)
    H = _mag(kind, f, fc, q) ** order
    if x.ndim == 2:
        H = H[:, None]
    return _fft.irfft(_fft.rfft(x, N, axis=0) * H, N, axis=0)[:n]


def sweep(x: np.ndarray, fc, kind: str = "lp", q: float = 0.707, order: int = 1) -> np.ndarray:
    """A filter whose cutoff moves over time (fc is an array as long as x).
    It blends copies filtered at third-octave steps, which sounds the same as a moving filter."""
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), (len(x),))
    lo, hi = float(fc.min()), float(fc.max())
    if hi / max(lo, 1e-6) < 1.06:
        return filt(x, kind, (lo + hi) / 2, q, order)
    k = int(math.ceil(math.log2(hi / lo) * 3)) + 1
    pos = np.log(fc / lo) / math.log(hi / lo) * (k - 1)
    out = np.zeros_like(x)
    for i in range(k):
        w = np.maximum(0.0, 1 - np.abs(pos - i))
        if not w.any():
            continue
        if x.ndim == 2:
            w = w[:, None]
        out += filt(x, kind, lo * (hi / lo) ** (i / (k - 1)), q, order) * w
    return out


# ---------------------------------------------------------------------------
# Oscillators and envelopes
# ---------------------------------------------------------------------------


def mtof(m) -> np.ndarray:
    return 440.0 * 2 ** ((np.asarray(m, dtype=np.float64) - 69) / 12)


def tvec(n: int) -> np.ndarray:
    return np.arange(n) / SR


def phase_of(freq, n: int, ph0: float = 0.0) -> np.ndarray:
    inc = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,)) / SR
    return ph0 + np.concatenate([[0.0], np.cumsum(inc)[:-1]])


def sine(freq, n: int, ph0: float = 0.0) -> np.ndarray:
    return np.sin(TWO_PI * phase_of(freq, n, ph0))


def saw(freq, n: int, ph0: float = 0.0) -> np.ndarray:
    """Band-limited saw (polyBLEP), so high notes do not alias."""
    inc = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,)) / SR
    ph = phase_of(freq, n, ph0) % 1.0
    y = 2 * ph - 1
    dt = np.maximum(inc, 1e-9)
    a = ph < dt
    t = ph[a] / dt[a]
    y[a] -= t + t - t * t - 1
    b = ph > 1 - dt
    t = (ph[b] - 1) / dt[b]
    y[b] -= t * t + t + t + 1
    return y


def perc(n: int, attack: float, tau: float) -> np.ndarray:
    """Fast rise, exponential fall, sealed to zero at the end."""
    t = tvec(n)
    e = np.where(t < attack, t / max(attack, 1e-6), np.exp(-(t - attack) / max(tau, 1e-6)))
    return seal(e)


def adsr(n: int, a: float, d: float, s: float, hold: float, r: float) -> np.ndarray:
    """Attack, decay to sustain s, hold until `hold` seconds, then release."""
    t = tvec(n)
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    at_hold = s + (1 - s) * math.exp(-max(0.0, hold - a) / max(d, 1e-6)) if hold > a else hold / max(a, 1e-6)
    e = np.where(t < hold, e, at_hold * np.exp(-(t - hold) / max(r, 1e-6)))
    return seal(e)


def seal(x: np.ndarray, ms: float = 4.0) -> np.ndarray:
    """Fades the last few ms to exactly zero, so a note never ends with a click."""
    m = min(len(x), int(SR * ms / 1000))
    if m > 1:
        ramp = np.linspace(1, 0, m)
        if x.ndim == 2:
            ramp = ramp[:, None]
        x = x.copy()
        x[-m:] *= ramp
    return x


def nsamp(sec: float) -> int:
    return max(1, int(round(sec * SR)))


def pan2(x: np.ndarray, pan: float) -> np.ndarray:
    """Equal power pan of a mono signal to stereo (pan -1 left, 0 centre, 1 right)."""
    a = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
    return np.stack([x * math.cos(a), x * math.sin(a)], axis=1) * math.sqrt(2)


def place(buf: np.ndarray, x: np.ndarray, t: float, gain: float = 1.0, pan: float = 0.0, wrap: bool = False) -> None:
    """Adds x to the stereo buffer at time t (sample exact)."""
    if x.ndim == 1:
        x = pan2(x, pan)
    i = int(round(t * SR))
    n = len(buf)
    if wrap:
        idx = (np.arange(len(x)) + i) % n
        np.add.at(buf, idx, x * gain)
        return
    if i >= n or i + len(x) <= 0:
        return
    s = max(0, -i)
    e = min(len(x), n - i)
    buf[i + s : i + e] += x[s:e] * gain


def noise(n: int, rng: np.random.Generator) -> np.ndarray:
    return rng.standard_normal(n)


def pink(n: int, rng: np.random.Generator) -> np.ndarray:
    N = _fast_len(n)
    X = _fft.rfft(rng.standard_normal(N))
    f = np.fft.rfftfreq(N, 1 / SR)
    X /= np.sqrt(np.maximum(f, 20.0))
    y = _fft.irfft(X, N)[:n]
    return y / (np.std(y) + 1e-12)


# ---------------------------------------------------------------------------
# Measuring: loudness (ITU-R BS.1770), true peak, spectrum
# ---------------------------------------------------------------------------


def _kweight_mag(N: int) -> np.ndarray:
    w = TWO_PI * np.fft.rfftfreq(N, 1 / SR) / SR
    z = np.exp(-1j * w)

    def h(b, a):
        return (b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)

    h1 = h((1.53512485958697, -2.69169618940638, 1.19839281085285), (1.0, -1.69065929318241, 0.73248077421585))
    h2 = h((1.0, -2.0, 1.0), (1.0, -1.99004745483398, 0.99007225036621))
    return np.abs(h1 * h2)


def block_loudness(x: np.ndarray, block: float = 0.4, hop: float = 0.1):
    """Momentary loudness of each 400 ms block (LUFS), K weighted."""
    if x.ndim == 1:
        x = x[:, None]
    n = len(x)
    N = _fast_len(n + 4096)
    y = _fft.irfft(_fft.rfft(x, N, axis=0) * _kweight_mag(N)[:, None], N, axis=0)[:n]
    p = np.concatenate([[0.0], np.cumsum(np.sum(y * y, axis=1))])
    bl, hp_ = int(block * SR), int(hop * SR)
    if n < bl:
        e = np.array([p[-1] / max(n, 1)])
        return -0.691 + 10 * np.log10(np.maximum(e, 1e-20)), e
    starts = np.arange(0, n - bl + 1, hp_)
    e = (p[starts + bl] - p[starts]) / bl
    return -0.691 + 10 * np.log10(np.maximum(e, 1e-20)), e


def lufs(x: np.ndarray) -> float:
    """Integrated loudness with the two gates of BS.1770."""
    lk, e = block_loudness(x)
    keep = lk > -70
    if not keep.any():
        return -120.0
    rel = -0.691 + 10 * math.log10(e[keep].mean()) - 10
    keep &= lk > rel
    if not keep.any():
        return -120.0
    return -0.691 + 10 * math.log10(e[keep].mean())


def true_peak_db(x: np.ndarray) -> float:
    """Peak after 4x oversampling (catches peaks between samples)."""
    if x.ndim == 1:
        x = x[:, None]
    best = 0.0
    seg = SR * 10
    for s in range(0, len(x), seg):
        part = x[max(0, s - 64) : s + seg + 64]
        best = max(best, float(np.abs(resample(part, SR, SR * 4)).max()))
    return 20 * math.log10(max(best, 1e-12))


def peak_db(x: np.ndarray) -> float:
    return 20 * math.log10(max(float(np.abs(x).max()) if len(x) else 0.0, 1e-12))


def band_db(x: np.ndarray) -> dict:
    """Energy in the low (<250 Hz), mid (250 Hz to 4 kHz) and high (>4 kHz) bands, in dB."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    P = np.abs(_fft.rfft(m)) ** 2
    f = np.fft.rfftfreq(len(m), 1 / SR)
    tot = P.sum() + 1e-20
    out = {}
    for name, a, b in (("low", 20, 250), ("mid", 250, 4000), ("high", 4000, 20000)):
        out[name] = round(10 * math.log10(P[(f >= a) & (f < b)].sum() / tot + 1e-12), 1)
    return out


def click_count(x: np.ndarray) -> int:
    """Counts sample jumps that stand far above the local high-frequency level (a click or a cut)."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    d2 = np.abs(np.diff(m, 2))
    if len(d2) < 960:
        return 0
    win = 480
    k = np.ones(win) / win
    loc = np.sqrt(np.convolve(d2 * d2, k, mode="same")) + 1e-6
    return int(np.sum((d2 > 12 * loc) & (d2 > 0.02)))


def stats_of(x: np.ndarray) -> dict:
    rms = math.sqrt(float(np.mean(x * x))) if len(x) else 0.0
    pk = float(np.abs(x).max()) if len(x) else 0.0
    return {
        "lufs": round(lufs(x), 2),
        "peak_db": round(peak_db(x), 2),
        "true_peak_db": round(true_peak_db(x), 2),
        "crest_db": round(20 * math.log10(max(pk, 1e-12) / max(rms, 1e-12)), 1),
        "dc": round(float(np.abs(x.mean(axis=0)).max()), 6),
        "clicks": click_count(x),
        "bands": band_db(x),
    }


# ---------------------------------------------------------------------------
# Dynamics: bus compressor and a look-ahead limiter (both frame based, fast)
# ---------------------------------------------------------------------------

FRAME = 48  # 1 ms


def _frames(x: np.ndarray, fn) -> np.ndarray:
    m = np.abs(x).max(axis=1) if x.ndim == 2 else np.abs(x)
    nf = int(math.ceil(len(m) / FRAME))
    m = np.concatenate([m, np.zeros(nf * FRAME - len(m))]).reshape(nf, FRAME)
    return fn(m)


def _smooth(g: np.ndarray, att: float, rel: float) -> np.ndarray:
    """One pole smoothing of a per-frame gain: falls with `att`, rises with `rel` (seconds)."""
    a = math.exp(-FRAME / SR / max(att, 1e-4))
    r = math.exp(-FRAME / SR / max(rel, 1e-4))
    out = np.empty_like(g)
    s = 1.0
    for i, v in enumerate(g.tolist()):
        s = a * s + (1 - a) * v if v < s else r * s + (1 - r) * v
        out[i] = s
    return out


def _to_samples(g: np.ndarray, n: int) -> np.ndarray:
    centres = np.arange(len(g)) * FRAME + FRAME / 2
    return np.interp(np.arange(n), centres, g)


def compress(x: np.ndarray, thr_db: float = -16, ratio: float = 2.0, att: float = 0.012, rel: float = 0.18) -> np.ndarray:
    """A gentle glue compressor on the whole mix."""
    rms = _frames(x, lambda m: np.sqrt(np.mean(m * m, axis=1)))
    lvl = 20 * np.log10(np.maximum(rms, 1e-9))
    gr = np.where(lvl > thr_db, (lvl - thr_db) * (1 - 1 / ratio), 0.0)
    g = _smooth(10 ** (-gr / 20), att, rel)
    g = _to_samples(g, len(x))
    return x * (g[:, None] if x.ndim == 2 else g)


def limit(x: np.ndarray, ceil_db: float = -1.0, look: float = 0.004, rel: float = 0.08) -> np.ndarray:
    """Look-ahead peak limiter. The gain starts to fall before a peak, so nothing clips."""
    c = 10 ** (ceil_db / 20)
    pk = _frames(x, lambda m: m.max(axis=1))
    need = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    la = max(1, int(look * SR / FRAME))
    padded = np.concatenate([need, np.ones(la + 1)])
    win = np.lib.stride_tricks.sliding_window_view(padded, la + 2)[: len(need)]
    need = np.minimum(need, win.min(axis=1))
    prev = np.concatenate([[1.0], need[:-1]])
    need = np.minimum(need, prev)
    g = _smooth(need, 0.0005, rel)
    g = np.minimum(g, need)
    g = _to_samples(g, len(x))
    y = x * (g[:, None] if x.ndim == 2 else g)
    p = float(np.abs(y).max()) if len(y) else 0.0
    if p > c:
        y *= c / p
    return y


def soft_clip(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    return np.tanh(x * drive) / math.tanh(drive)


def dc_block(x: np.ndarray) -> np.ndarray:
    return filt(x, "hp", 25.0, 0.6) if len(x) > 0 else x


# ---------------------------------------------------------------------------
# Music theory
# ---------------------------------------------------------------------------

NOTE = {"C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3, "E": 4, "F": 5, "F#": 6, "GB": 6, "G": 7,
        "G#": 8, "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11}
MAJOR = [0, 2, 4, 5, 7, 9, 11]
MINOR = [0, 2, 3, 5, 7, 8, 10]


def parse_key(key: str):
    """'A minor', 'Am', 'F# major', 'Bb' -> (root pitch class, scale)."""
    s = (key or "A minor").strip()
    low = s.lower()
    minor = low.endswith("minor") or low.endswith("min") or (low.endswith("m") and not low.endswith("maj"))
    name = s.split()[0] if " " in s else s
    for suffix in ("minor", "major", "min", "maj", "m"):
        if name.lower().endswith(suffix) and len(name) > len(suffix):
            name = name[: -len(suffix)]
            break
    root = NOTE.get(name.strip().upper())
    if root is None:
        die(f'unknown key "{key}". Use a note and a mode, for example "A minor" or "F# major"')
    return root, (MINOR if minor else MAJOR)


class Key:
    def __init__(self, key: str):
        self.root, self.scale = parse_key(key)
        self.minor = self.scale is MINOR

    def degree(self, d: int, octave_midi: int = 60) -> int:
        """MIDI note of scale degree d (0 = tonic) counted from the tonic near octave_midi."""
        base = octave_midi - ((octave_midi - self.root) % 12)
        return base + 12 * (d // 7) + self.scale[d % 7]

    def chord_pcs(self, d: int, seventh: bool = False) -> list:
        degs = [0, 2, 4] + ([6] if seventh else [])
        return [(self.root + self.scale[(d + k) % 7]) % 12 for k in degs]

    def in_scale(self, m: int) -> bool:
        return (m - self.root) % 12 in self.scale

    def nearest_in_scale(self, m: float) -> int:
        m = int(round(m))
        for off in (0, -1, 1, -2, 2):
            if self.in_scale(m + off):
                return m + off
        return m


def nearest_pc(pc: int, near: float) -> int:
    near = int(round(near))
    base = near - ((near - pc) % 12)
    return base if near - base <= 6 else base + 12


def voice_chord(pcs: list, prev, low: int = 52, high: int = 76, voices: int = 4) -> list:
    """Chord tones in [low, high] that cover the chord and move as little as possible."""
    cands = [m for m in range(low, high + 1) if m % 12 in pcs]
    n = min(voices, len(cands))
    best, best_cost = None, 1e9
    centre = (low + high) / 2

    def walk(start, combo):
        nonlocal best, best_cost
        if len(combo) == n:
            cov = {m % 12 for m in combo}
            cost = sum(6 for p in pcs[1:] if p not in cov) + (0 if pcs[0] in cov else 1.5)
            for a, b in zip(combo, combo[1:]):
                gap = b - a
                cost += 5 if gap < 2 else 0
                cost += gap - 9 if gap > 9 else 0
                cost += 3 if a < 57 and gap < 4 else 0
            if prev and len(prev) == n:
                cost += 0.7 * sum(abs(a - b) for a, b in zip(combo, prev))
            else:
                cost += 0.5 * abs(sum(combo) / n - centre)
            if cost < best_cost:
                best, best_cost = list(combo), cost
            return
        for i in range(start, len(cands)):
            walk(i + 1, combo + [cands[i]])

    walk(0, [])
    return best or []


# ---------------------------------------------------------------------------
# The grid
# ---------------------------------------------------------------------------


def make_grid(bpm: float, dur: float, bpb: int = 4) -> dict:
    beat = 60.0 / bpm
    nb = int(math.floor(dur / beat + 1e-9)) + 1
    beats = [round(i * beat, 6) for i in range(nb) if i * beat <= dur + 1e-9]
    bars = [b for i, b in enumerate(beats) if i % bpb == 0]
    return {"bpm": bpm, "beats_per_bar": bpb, "beat": round(beat, 6), "bar": round(beat * bpb, 6),
            "dur": dur, "beats": beats, "bars": bars}


# ---------------------------------------------------------------------------
# Instruments (each returns a mono or stereo note buffer that starts at its onset)
# ---------------------------------------------------------------------------


def i_kick(kind: str, vel: float, rng) -> np.ndarray:
    if kind == "808":
        n = nsamp(0.9)
        f = 42 + 110 * np.exp(-tvec(n) / 0.03)
        body = sine(f, n) * perc(n, 0.002, 0.32)
        body = soft_clip(body * 1.6, 1.0)
    elif kind == "soft":
        n = nsamp(0.35)
        f = 50 + 90 * np.exp(-tvec(n) / 0.025)
        body = sine(f, n) * perc(n, 0.003, 0.09)
    else:  # punch
        n = nsamp(0.45)
        f = 48 + 130 * np.exp(-tvec(n) / 0.022)
        body = soft_clip(sine(f, n) * perc(n, 0.0015, 0.12) * 1.4, 1.2)
    m = nsamp(0.012)
    click = np.zeros(n)
    click[:m] = filt(noise(m, rng), "bp", 3500, 0.8) * perc(m, 0.0005, 0.0025) * 0.25
    return seal(body + click) * vel


def i_snare(kind: str, vel: float, rng) -> np.ndarray:
    if kind == "clap":
        n = nsamp(0.4)
        env = np.zeros(n)
        t = tvec(n)
        for k in range(3):
            t0 = k * 0.0105
            env += np.where(t >= t0, np.exp(-(t - t0) / 0.0028), 0) * (0.7 + 0.1 * k) * (t < t0 + 0.0105)
        t0 = 0.0315
        env += np.where(t >= t0, np.exp(-(t - t0) / 0.06), 0)
        env[: nsamp(0.0006)] *= np.linspace(0, 1, nsamp(0.0006))
        x = filt(noise(n, rng), "bp", 1400, 0.9) * env
        return seal(x / (np.abs(x).max() + 1e-9)) * vel
    if kind == "rim":
        n = nsamp(0.12)
        x = sine(820, n) * perc(n, 0.0005, 0.012) + filt(noise(n, rng), "bp", 2500, 1.5) * perc(n, 0.0005, 0.008)
        return seal(x / (np.abs(x).max() + 1e-9)) * vel
    n = nsamp(0.35)
    tone = sine(185 + 40 * np.exp(-tvec(n) / 0.01), n) * perc(n, 0.001, 0.05)
    nz = filt(filt(noise(n, rng), "hp", 900, 0.7), "lp", 9000, 0.7) * perc(n, 0.001, 0.11)
    x = 0.55 * tone + nz
    return seal(x / (np.abs(x).max() + 1e-9)) * vel


def i_hat(open_: bool, vel: float, rng) -> np.ndarray:
    tau = 0.11 if open_ else 0.018
    n = nsamp(tau * 7 + 0.01)
    x = filt(filt(noise(n, rng), "hp", 7200, 0.8, 2), "lp", 15000, 0.7) * perc(n, 0.0006, tau)
    return seal(x / (np.abs(x).max() + 1e-9)) * vel


def i_crash(vel: float, rng, length: float = 1.8) -> np.ndarray:
    n = nsamp(length)
    x = filt(noise(n, rng), "hp", 3500, 0.7) * perc(n, 0.002, length / 5)
    x = x / (np.abs(x).max() + 1e-9)
    return seal(np.stack([x, np.roll(x, 37)], axis=1)) * vel


def i_bass(kind: str, midi: int, dur: float, vel: float, cutoff: float, rng) -> np.ndarray:
    f = float(mtof(midi))
    n = nsamp(dur + 0.08)
    if kind == "sub":
        x = sine(f, n) + 0.25 * sine(2 * f, n)
        env = adsr(n, 0.006, 0.4, 0.8, dur, 0.04)
        return seal(soft_clip(x * env * 1.2, 1.1)) * vel
    if kind == "pluck":
        x = ks_pluck(f, dur + 0.08, 0.35, rng) * adsr(n, 0.002, 0.25, 0.6, dur, 0.03)
        return seal(filt(x, "lp", cutoff, 0.8)) * vel
    # saw bass with a filter envelope plus a sine sub
    raw = 0.6 * saw(f, n) + 0.6 * sine(f, n)
    t = tvec(n)
    fc = np.clip(f * 1.5 + cutoff * np.exp(-t / 0.12), 40, 16000)
    x = sweep(raw, fc, "lp", 1.1)
    env = adsr(n, 0.004, 0.2, 0.75, dur, 0.035)
    return seal(soft_clip(x * env, 1.2)) * vel


def ks_pluck(f: float, dur: float, bright: float, rng) -> np.ndarray:
    """Karplus-Strong plucked string, computed one period at a time (fast in numpy)."""
    n = nsamp(dur)
    p_float = SR / f - 0.5
    p = max(2, int(p_float))
    rate = (p + 0.5) / (SR / f)  # read speed that corrects the integer delay to the exact pitch
    n_gen = int(math.ceil(n * rate)) + 4
    y = np.zeros(n_gen + 1)
    burst = noise(p, rng)
    smooth = np.convolve(burst, np.ones(4) / 4, mode="same")
    y[1 : p + 1] = bright * burst + (1 - bright) * smooth
    t60 = max(0.3, min(4.0, 1.6 * (220 / f) ** 0.4))
    g = 10 ** (-3 * (p / SR) / t60)
    k = 1
    while k * p < n_gen:
        s = 1 + k * p
        e = min(1 + (k + 1) * p, n_gen + 1)
        y[s:e] = g * 0.5 * (y[s - p : e - p] + y[s - p - 1 : e - p - 1])
        k += 1
    y = y[1:]
    out = np.interp(np.arange(n) * rate, np.arange(len(y)), y)
    out = out - np.mean(out)
    out *= np.minimum(1.0, tvec(n) / 0.0015)
    return seal(out / (np.abs(out).max() + 1e-9))


def i_pad(midi: int, dur: float, vel: float, attack: float, release: float, rng) -> np.ndarray:
    """Detuned saws, a different detune in each ear for width."""
    f = float(mtof(midi))
    n = nsamp(dur + release * 3)
    env = adsr(n, attack, 1.0, 1.0, dur, release)
    vib = 1 + 0.0015 * np.sin(TWO_PI * rng.uniform(4.5, 5.5) * tvec(n) + rng.uniform(0, 6))
    cents = [(-11, 4), (9, -5)]
    ch = []
    for a, b in cents:
        x = saw(f * vib * 2 ** (a / 1200), n, rng.uniform()) + saw(f * vib * 2 ** (b / 1200), n, rng.uniform())
        x += 0.7 * saw(f * vib, n, 0.3)
        ch.append(x * env)
    return np.stack(ch, axis=1) * vel / 3


def i_epiano(midi: int, dur: float, vel: float) -> np.ndarray:
    """Two operator FM electric piano: bark on the attack, soft tine."""
    f = float(mtof(midi))
    n = nsamp(dur + 0.6)
    t = tvec(n)
    idx = (0.6 + 1.4 * vel) * np.exp(-t / 0.18) + 0.15
    mod = np.sin(TWO_PI * f * t)
    x = np.sin(TWO_PI * f * t + idx * mod)
    x += 0.1 * np.sin(TWO_PI * f * 4 * t) * np.exp(-t / 0.04)
    decay = 1.5 * (261.6 / f) ** 0.35
    env = adsr(n, 0.004, decay * 0.45, 0.25, dur, 0.15)
    return seal(x * env) * vel


BELL = [(1, 1, 1), (2, 0.4, 0.6), (2.76, 0.26, 0.42), (5.4, 0.1, 0.22), (8.93, 0.04, 0.12)]


def i_bell(midi: int, vel: float, decay: float = 1.8, partials=BELL) -> np.ndarray:
    f = float(mtof(midi))
    parts = [p for p in partials if f * p[0] < 16000]
    n = nsamp(max(decay * p[2] for p in parts) * 1.6 + 0.05)
    x = np.zeros(n)
    t = tvec(n)
    for ratio, amp, df in parts:
        x += amp * np.sin(TWO_PI * f * ratio * t) * np.exp(-t / (decay * df / 4.6))
    x *= np.minimum(1.0, t / 0.002)
    return seal(x / sum(p[1] for p in parts)) * vel


def i_fm_lead(midi: int, dur: float, vel: float, ratio: float = 2.0, index: float = 2.5) -> np.ndarray:
    f = float(mtof(midi))
    n = nsamp(dur + 0.3)
    t = tvec(n)
    idx = index * (0.35 + 0.65 * np.exp(-t / 0.15))
    x = np.sin(TWO_PI * f * t + idx * np.sin(TWO_PI * f * ratio * t))
    return seal(x * adsr(n, 0.005, 0.3, 0.5, dur, 0.12)) * vel


def i_saw_lead(midi: int, dur: float, vel: float, cutoff: float) -> np.ndarray:
    f = float(mtof(midi))
    n = nsamp(dur + 0.25)
    t = tvec(n)
    vib = 1 + 0.004 * np.sin(TWO_PI * 5.2 * t) * np.minimum(1, t / 0.3)
    x = saw(f * vib * 2 ** (-6 / 1200), n) + saw(f * vib * 2 ** (6 / 1200), n, 0.4)
    x = filt(x, "lp", cutoff, 0.9)
    return seal(x * adsr(n, 0.01, 0.4, 0.7, dur, 0.1)) * vel / 2


def i_marimba(midi: int, vel: float) -> np.ndarray:
    f = float(mtof(midi))
    tau = 0.16 * (261.6 / f) ** 0.5
    n = nsamp(tau * 7 + 0.02)
    t = tvec(n)
    x = np.zeros(n)
    for ratio, amp, k in ((1, 1, 1), (3.93, 0.3, 0.2), (9.1, 0.05, 0.08)):
        if f * ratio < 15000:
            x += amp * np.sin(TWO_PI * f * ratio * t) * np.exp(-t / (tau * k))
    x *= np.minimum(1.0, t / 0.0015)
    return seal(x) * vel


def i_riser(length: float, tonic_midi: int, vel: float, rng) -> np.ndarray:
    """Noise and two gliding saws that build for `length` seconds and stop at the end."""
    n = nsamp(length)
    t = tvec(n)
    p = t / length
    amp = (np.exp(4 * p) - 1) / (math.exp(4) - 1)
    nz = sweep(pink(n, rng), 300 * (7000 / 300) ** p, "bp", 1.6)
    f = mtof(tonic_midi - 12) * 2 ** (2 * p)
    tone = saw(f * 2 ** (-9 / 1200), n) + saw(f * 2 ** (9 / 1200), n, 0.5)
    tone = sweep(tone, 400 * (6000 / 400) ** p, "lp", 1.2)
    x = (nz / (np.abs(nz).max() + 1e-9) + 0.35 * tone / (np.abs(tone).max() + 1e-9)) * amp
    x = seal(x, 15)
    return np.stack([x, np.roll(x, 24)], axis=1) * vel


def i_impact(vel: float, rng) -> np.ndarray:
    n = nsamp(1.6)
    t = tvec(n)
    boom = sine(30 + 60 * np.exp(-t / 0.08), n) * perc(n, 0.002, 0.45)
    hit = filt(noise(n, rng), "lp", 900, 0.7) * perc(n, 0.001, 0.12)
    crash = filt(noise(n, rng), "hp", 2500, 0.7) * perc(n, 0.002, 0.35) * 0.4
    x = soft_clip(boom * 1.3 + hit * 0.5 + crash, 1.1)
    x = seal(x / (np.abs(x).max() + 1e-9))
    return np.stack([x, np.roll(x, 29)], axis=1) * vel


# ---------------------------------------------------------------------------
# Moods
# ---------------------------------------------------------------------------

# progressions are scale degrees (0 = tonic); "maj" for major keys, "min" for minor keys.
MOODS = {
    "bright-pop": dict(bpm=118, maj=[0, 4, 5, 3], min=[5, 3, 0, 4], swing=0.5, kick="punch", snare="clap",
                       bass="saw", bass_rhythm="eighths", lead="pluck", pad_cut=(700, 5200), reverb=1.4,
                       side=0.45, seventh=False, master_lp=17000, gains=dict(lead=-21, pad=-24)),
    "deep-pulse": dict(bpm=122, maj=[0, 5, 3, 4], min=[0, 5, 2, 6], swing=0.5, kick="808", snare="clap",
                       bass="saw", bass_rhythm="pulse", lead="fm", pad_cut=(350, 2600), reverb=2.2,
                       side=0.6, seventh=False, master_lp=15000, gains=dict(bass=-18, lead=-24)),
    "warm-lofi": dict(bpm=84, maj=[0, 5, 1, 4], min=[0, 3, 6, 5], swing=0.6, kick="soft", snare="rim",
                      bass="sub", bass_rhythm="lofi", lead="pluck", chords="epiano", pad_cut=(500, 2200),
                      reverb=1.8, side=0.25, seventh=True, master_lp=7500, gains=dict(lead=-24, chords=-20)),
    "epic-build": dict(bpm=100, maj=[0, 4, 5, 3], min=[0, 5, 2, 6], swing=0.5, kick="punch", snare="snare",
                       bass="saw", bass_rhythm="sustain", lead="saw", pad_cut=(400, 6500), reverb=3.0,
                       side=0.35, seventh=False, master_lp=18000, gains=dict(pad=-20, lead=-22)),
    "minimal-tech": dict(bpm=124, maj=[0, 0, 5, 4], min=[0, 0, 6, 5], swing=0.5, kick="punch", snare="clap",
                         bass="saw", bass_rhythm="offbeat", lead="fm", pad_cut=(450, 3000), reverb=1.6,
                         side=0.5, seventh=False, master_lp=17000, gains=dict(pad=-28, lead=-24, hats=-26)),
    "playful-pluck": dict(bpm=112, maj=[0, 3, 4, 0], min=[0, 3, 4, 0], swing=0.56, kick="soft", snare="clap",
                          bass="pluck", bass_rhythm="bounce", lead="marimba", pad_cut=(800, 3000),
                          reverb=1.3, side=0.2, seventh=False, master_lp=16000, gains=dict(lead=-20, pad=-28)),
    "calm-ambient": dict(bpm=72, maj=[0, 3, 5, 4], min=[0, 5, 3, 6], swing=0.5, kick="soft", snare="rim",
                         bass="sub", bass_rhythm="long", lead="bell", pad_cut=(450, 2400), reverb=3.6,
                         side=0.0, seventh=True, master_lp=12000, gains=dict(pad=-20, lead=-24, hats=-34)),
}

ENERGY = {"intro": 0.3, "verse": 0.65, "main": 0.75, "build": 0.6, "drop": 1.0, "peak": 1.0, "chorus": 0.9,
          "break": 0.35, "bridge": 0.5, "outro": 0.45, "loop": 0.8}

BASE_GAINS = dict(kick=-17, snare=-22, hats=-29, bass=-20, pad=-25, chords=-23, lead=-23, fx=-24)


def parse_sections(spec: str):
    out = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        name, _, bars = part.partition(":")
        try:
            nb = int(bars)
        except ValueError:
            die(f'bad section "{part}": write it as name:bars, for example "drop:8"')
        if nb < 1:
            die(f'section "{part}" needs at least 1 bar')
        name = name.strip().lower()
        if name not in ENERGY:
            warn(f'unknown section name "{name}", it gets a medium energy. Known: {", ".join(ENERGY)}')
        out.append([name, nb])
    if not out:
        die("--sections is empty")
    return out


def fit_sections(secs, nbars: int, peak_bar):
    """Scales the sections to nbars bars; with a peak bar, the drop starts there."""
    secs = [list(s) for s in secs]
    if peak_bar is not None:
        di = next((i for i, s in enumerate(secs) if s[0] in ("drop", "peak", "chorus")), None)
        if di is None:
            di = max(range(len(secs)), key=lambda i: ENERGY.get(secs[i][0], 0.7))
        peak_bar = max(0, min(nbars - 1, peak_bar))
        lead_in = secs[:di]
        if not lead_in and peak_bar > 0:  # nothing planned before the drop: build up to it
            lead_in = [["intro", peak_bar // 2], ["build", peak_bar - peak_bar // 2]] if peak_bar >= 3 else [["build", peak_bar]]
        before = _scale(lead_in, peak_bar)
        after = _scale(secs[di:], nbars - peak_bar)
        return before + after
    return _scale(secs, nbars)


def _scale(secs, total: int):
    if total <= 0 or not secs:
        return []
    have = sum(s[1] for s in secs)
    if have == total:
        return secs
    out = [[s[0], max(1, int(round(s[1] * total / have)))] for s in secs]
    while len(out) > total:  # more sections than bars: drop the lowest energy ones
        out.pop(min(range(len(out)), key=lambda i: ENERGY.get(out[i][0], 0.7)))
    diff = total - sum(s[1] for s in out)
    order = sorted(range(len(out)), key=lambda i: -out[i][1])
    k = 0
    while diff != 0:
        i = order[k % len(order)]
        if diff > 0:
            out[i][1] += 1
            diff -= 1
        elif out[i][1] > 1:
            out[i][1] -= 1
            diff += 1
        k += 1
    return out


def default_sections(nbars: int, loop: bool):
    if loop:
        return [["loop", nbars]]
    if nbars <= 3:
        return [["main", nbars]]
    if nbars <= 6:
        return [["intro", 1], ["build", 1], ["drop", nbars - 2]]
    intro = max(1, nbars // 6)
    build = max(1, nbars // 6)
    outro = max(1, nbars // 6)
    return [["intro", intro], ["build", build], ["drop", nbars - intro - build - outro], ["outro", outro]]


def render_music(dur: float, bpm=None, key: str = "A minor", mood: str = "bright-pop", sections=None,
                 peak=None, seed: int = 1, loop: bool = False, stems: bool = False):
    """Returns (stereo audio, grid dict) and, with stems=True, also the separate stems."""
    if mood not in MOODS:
        die(f'unknown mood "{mood}". Use one of: {", ".join(MOODS)}')
    M = MOODS[mood]
    bpm = float(bpm or M["bpm"])
    if not 40 <= bpm <= 220:
        die("--bpm must be between 40 and 220")
    if dur <= 0.5:
        die("--dur must be longer than 0.5 seconds")
    k = Key(key)
    rng = np.random.default_rng(zlib.crc32(f"{mood}:{seed}".encode()))
    beat = 60.0 / bpm
    bar = 4 * beat
    N = nsamp(dur)

    if loop:
        nbars = max(1, int(round(dur / bar)))
        if abs(nbars * bar - dur) > 0.001:
            warn(f"--dur {dur} is not a whole number of bars ({bar:.3f} s each); the loop seam will be off the beat. "
                 f"Use --dur {nbars * bar:.3f} for a perfect loop")
    else:
        ring = min(2.5, max(0.8, 0.12 * dur))
        nbars = max(1, int(math.floor((dur - ring) / bar + 1e-9)))
    peak_bar = int(round(peak / bar)) if peak is not None else None
    secs = parse_sections(sections) if sections else default_sections(nbars, loop)
    secs = fit_sections(secs, nbars, peak_bar)

    # per bar plan
    bars = []
    for si, (name, nb) in enumerate(secs):
        for j in range(nb):
            bars.append(dict(i=len(bars), sec=si, name=name, j=j, nb=nb, e=ENERGY.get(name, 0.7)))
    sec_starts = []
    acc = 0
    for name, nb in secs:
        sec_starts.append(dict(name=name, bar=acc, t=round(acc * bar, 6), bars=nb))
        acc += nb
    drop_sec = max(range(len(secs)), key=lambda i: (ENERGY.get(secs[i][0], 0.7), -i))
    peak_t = sec_starts[drop_sec]["t"]

    prog = M["min"] if k.minor else M["maj"]
    tail = 4.0
    L = N + nsamp(tail)
    S = {name: np.zeros((L, 2)) for name in ("kick", "snare", "hats", "bass", "pad", "chords", "lead", "fx")}
    kick_times = []

    # filter curve: opens from the start toward the peak, stays open after it, closes a little in the outro
    lo_c, hi_c = M["pad_cut"]
    pts_t, pts_f = [0.0], [lo_c]
    for b in bars:
        t0 = b["i"] * bar
        if t0 < peak_t:
            frac = (t0 + bar) / max(peak_t, bar)
            pts_t.append(t0 + bar)
            pts_f.append(lo_c * (hi_c / lo_c) ** (frac * (0.4 + 0.6 * b["e"])))
        else:
            pts_t.append(t0 + bar)
            pts_f.append(lo_c * (hi_c / lo_c) ** (0.55 + 0.45 * b["e"]))
    cut_curve = np.interp(np.arange(L) / SR, pts_t, pts_f)

    # chords and voice leading
    prev_v = None
    chords = []
    for b in bars:
        deg = prog[b["i"] % len(prog)] if mood != "calm-ambient" else prog[(b["i"] // 2) % len(prog)]
        pcs = k.chord_pcs(deg, M["seventh"])
        prev_v = voice_chord(pcs, prev_v, 52, 76, 4)
        chords.append(dict(deg=deg, pcs=pcs, voicing=prev_v, root=pcs[0]))
    final_pcs = k.chord_pcs(0, M["seventh"])
    final_voicing = voice_chord(final_pcs, prev_v, 52, 76, 4)

    def bass_note(pc):
        return 28 + ((pc - 4) % 12)  # E1 .. D#2

    # motif: 2 bars of (beat position, length in beats, scale step); repeats and follows the chords
    lead_low = 64 if M["lead"] != "bell" else 72
    rhythms = [
        [(0, 1), (1, 0.5), (1.5, 1), (2.5, 0.5), (3, 1), (4, 1.5), (5.5, 0.5), (6, 2)],
        [(0, 0.5), (0.5, 0.5), (1, 1), (2, 1), (3.5, 0.5), (4, 1), (5, 0.5), (5.5, 0.5), (6, 1.5)],
        [(0, 1.5), (1.5, 1.5), (3, 1), (4, 0.5), (4.5, 0.5), (5, 1), (6, 2)],
    ]
    rhythm = rhythms[int(rng.integers(len(rhythms)))]
    steps = [0]
    for _ in range(len(rhythm) - 1):
        steps.append(int(np.clip(steps[-1] + rng.choice([-2, -1, 1, 2, 3, -3]), -3, 7)))

    def hum(t, amt=0.004):
        return max(0.0, t + float(rng.uniform(-amt, amt)))

    swing = M["swing"]

    for b, ch in zip(bars, chords):
        t0 = b["i"] * bar
        e = b["e"]
        last_bar_of_sec = b["j"] == b["nb"] - 1
        nxt = bars[b["i"] + 1] if b["i"] + 1 < len(bars) else None
        into_drop = nxt is not None and nxt["sec"] != b["sec"] and nxt["e"] > e + 0.15
        gap = into_drop and e >= 0.45  # drums drop out on the last beat before a lift

        # --- drums ---
        drums_on = e >= 0.45 or (e >= 0.3 and mood in ("minimal-tech", "deep-pulse"))
        if mood == "calm-ambient":
            drums_on = e >= 0.9
        if drums_on:
            if mood == "epic-build" and e < 0.9:
                kpos = [0, 2.5]
            elif M["kick"] == "soft" and mood != "calm-ambient":
                kpos = [0, 2.5] if mood == "warm-lofi" else [0, 2]
            elif mood == "calm-ambient":
                kpos = [0, 2.5]
            else:
                kpos = [0, 1, 2, 3]
            for x in kpos:
                if gap and x >= 3:
                    continue
                tk = t0 + x * beat
                place(S["kick"], i_kick(M["kick"], 0.95 if x == 0 else 0.85, rng), tk)
                kick_times.append(tk)
            if e >= 0.55 or mood == "minimal-tech":
                for x in (1, 3):
                    if gap and x >= 3:
                        continue
                    place(S["snare"], i_snare(M["snare"], 0.9, rng), t0 + x * beat, pan=-0.04)
            if mood == "epic-build" and e >= 0.9:
                for x in (0.75, 2.25):
                    place(S["kick"], i_kick("punch", 0.55, rng), t0 + x * beat)
            # build: a snare roll that speeds up into the next section
            if b["name"] == "build" and last_bar_of_sec:
                for r in range(12):
                    pos = 2 + 2 * (1 - (1 - r / 12) ** 1.6)
                    place(S["snare"], i_snare(M["snare"], 0.25 + 0.5 * r / 12, rng), t0 + pos * beat, pan=0.05)
        hats_on = e >= 0.3 and not (mood == "calm-ambient" and e < 0.9)
        if hats_on:
            sixteenths = e >= 0.9 and mood not in ("warm-lofi", "calm-ambient", "epic-build")
            n_sub = 16 if sixteenths else 8
            for s in range(n_sub):
                pos = s * 4 / n_sub
                if (gap and pos >= 3) or (mood == "minimal-tech" and s % (n_sub // 4) == 0):
                    continue
                if n_sub == 8 and s % 2 == 1:
                    pos = (s - 1) * 0.5 + 2 * swing * 0.5
                if n_sub == 16 and s % 2 == 1:
                    pos = (s - 1) * 0.25 + 2 * swing * 0.25
                open_ = mood in ("minimal-tech", "deep-pulse") and n_sub == 8 and s % 2 == 1
                accent = 0.8 if s % (n_sub // 4) == (n_sub // 8) else 0.5
                place(S["hats"], i_hat(open_, accent * float(rng.uniform(0.85, 1.0)), rng),
                      hum(t0 + pos * beat, 0.0015), pan=0.25)
        if b["j"] == 0 and b["sec"] > 0 and e >= 0.6:
            place(S["fx"], i_crash(0.6, rng), t0)

        # --- risers and impacts at section changes ---
        if into_drop:
            length = bar if bar <= 3 else 2.4
            place(S["fx"], i_riser(length, k.degree(0, 60), 0.9, rng), t0 + bar - length)
        if b["j"] == 0 and b["sec"] > 0 and b["sec"] == drop_sec:
            place(S["fx"], i_impact(1.0, rng), t0)

        # --- bass ---
        bn = bass_note(ch["root"])
        cut = float(cut_curve[int(t0 * SR)]) * 0.5
        br = M["bass_rhythm"]
        if e >= 0.4 or (mood == "calm-ambient" and e >= 0.3):
            if br == "eighths":
                for s in range(8):
                    if gap and s >= 6:
                        continue
                    m = bn + 12 if s in (3, 7) and rng.random() < 0.5 else bn
                    place(S["bass"], i_bass("saw", m, beat * 0.42, 0.9 if s % 2 == 0 else 0.7, cut, rng),
                          hum(t0 + s * 0.5 * beat, 0.002))
            elif br == "pulse":
                for s in range(16):
                    if s % 4 == 0 or (gap and s >= 12):
                        continue
                    place(S["bass"], i_bass("saw", bn, beat * 0.2, 0.8, cut * (0.6 + 0.4 * e), rng),
                          t0 + s * 0.25 * beat)
            elif br == "offbeat":
                for x in (0.5, 1.5, 2.5, 3.5):
                    if gap and x >= 3:
                        continue
                    place(S["bass"], i_bass("saw", bn, beat * 0.3, 0.85, cut, rng), t0 + x * beat)
            elif br == "sustain":
                place(S["bass"], i_bass("saw", bn, bar * 0.96 if not gap else bar * 0.7, 0.85, cut * 0.5, rng), t0)
            elif br == "bounce":
                fifth = nearest_pc(ch["pcs"][2], bn + 7)
                for x, m in ((0, bn), (1.5, bn), (2, fifth), (3, bn + 12)):
                    if gap and x >= 3:
                        continue
                    place(S["bass"], i_bass("pluck", m + 12, beat * 0.45, 0.9, 1800, rng),
                          t0 + x * beat + (2 * swing - 1) * 0.5 * beat * (x % 1 != 0))
            elif br == "lofi":
                place(S["bass"], i_bass("sub", bn + 12, beat * 1.6, 0.9, 0, rng), hum(t0, 0.006))
                place(S["bass"], i_bass("sub", bn + 12, beat * 1.2, 0.75, 0, rng),
                      hum(t0 + (2 + 2 * swing - 1) * beat, 0.006))
            else:  # long
                place(S["bass"], i_bass("sub", bn + 12, bar * 0.98, 0.8, 0, rng), t0)

        # --- pads and chords ---
        attack = {"calm-ambient": 1.2, "epic-build": 0.5, "warm-lofi": 0.3}.get(mood, 0.08 if e >= 0.9 else 0.25)
        pad_len = bar
        for m in ch["voicing"]:
            place(S["pad"], i_pad(m, pad_len * 0.98, 0.45 + 0.55 * e, attack, 0.5, rng), t0)
        if M.get("chords") == "epiano":
            for x, ln, v in ((0, 1.4, 0.8), (1.5 + (2 * swing - 1) * 0.5, 0.9, 0.55), (2.5, 1.3, 0.65)):
                for kk, m in enumerate(ch["voicing"]):
                    place(S["chords"], i_epiano(m, ln * beat, v), hum(t0 + x * beat + kk * 0.012, 0.004),
                          pan=-0.15 + 0.1 * kk)
        if mood == "bright-pop" and e >= 0.6:  # plucked chord stabs on the off beats
            for x in (0.5, 1.5, 2.5, 3.5):
                if gap and x >= 3:
                    continue
                for kk, m in enumerate(ch["voicing"][1:]):
                    place(S["chords"], ks_pluck(float(mtof(m + 12)), 0.35, 0.7, rng) * 0.5,
                          t0 + x * beat + kk * 0.006, pan=0.35 * (1 if kk % 2 else -1))
        if mood == "minimal-tech" and e >= 0.45:  # short chord stab
            for x in (1.5,) if b["i"] % 2 == 0 else (0.75, 2.75):
                for m in ch["voicing"]:
                    place(S["chords"], i_fm_lead(m, beat * 0.2, 0.5, 1.0, 1.2), t0 + x * beat)

        # --- lead motif ---
        lead_on = e >= 0.6 or (mood in ("calm-ambient", "warm-lofi") and e >= 0.3)
        if lead_on and (b["name"] != "build" or mood in ("calm-ambient", "warm-lofi")):
            half = b["i"] % 2
            octave = 12 if b["sec"] == drop_sec and mood != "calm-ambient" else 0
            for (pos, ln), st in zip(rhythm, steps):
                if not (half * 4 <= pos < half * 4 + 4):
                    continue
                p = pos - half * 4
                if gap and p >= 3:
                    continue
                m = k.degree(st, lead_low)
                if p % 1 == 0 and p % 2 == 0:  # strong beat: move to the nearest chord tone
                    m = min((nearest_pc(pc, m) for pc in ch["pcs"][:3]), key=lambda c: abs(c - m))
                m += octave
                tt = hum(t0 + p * beat, 0.003)
                if p % 1 != 0:
                    tt += (2 * swing - 1) * 0.5 * beat
                lead = M["lead"]
                if lead == "pluck":
                    x = ks_pluck(float(mtof(m)), ln * beat + 0.4, 0.55, rng)
                elif lead == "fm":
                    x = i_fm_lead(m, ln * beat * 0.8, 0.85, 2.0, 2.0)
                elif lead == "saw":
                    x = i_saw_lead(m, ln * beat * 0.9, 0.9, float(cut_curve[int(t0 * SR)]) * 1.2)
                elif lead == "marimba":
                    x = i_marimba(m + 12, 0.9)
                else:
                    x = i_bell(m + 12, 0.8, 2.6)
                place(S["lead"], x, tt, pan=float(rng.uniform(-0.25, 0.25)))

    # --- ending: a final chord on the bar line that rings out ---
    end_t = nbars * bar
    if not loop:
        remain = dur - end_t
        fv = final_voicing
        for m in fv:
            place(S["pad"], i_pad(m, max(0.3, remain - 0.9), 1.0, 0.03, 0.4, rng), end_t)
        bn = bass_note(final_pcs[0])
        place(S["bass"], i_bass("sub", bn + 12, max(0.3, remain * 0.6), 0.9, 0, rng), end_t)
        place(S["kick"], i_kick(M["kick"], 1.0, rng), end_t)
        kick_times.append(end_t)
        place(S["fx"], i_crash(0.7, rng, min(2.5, remain)), end_t)
        place(S["lead"], i_bell(k.degree(0, 72) + 12, 0.7, min(3.0, remain + 0.5)), end_t + 0.02)
    else:  # a short fill so the last bar leads back to the first
        t0 = (nbars - 1) * bar
        for r in range(4):
            place(S["snare"], i_snare(M["snare"], 0.3 + 0.12 * r, rng), t0 + (3 + r * 0.25) * beat, pan=0.05)

    # --- stem processing ---
    # moving low pass on the pads (and a little on the chords)
    S["pad"] = sweep(S["pad"], cut_curve, "lp", 0.9)
    S["chords"] = sweep(S["chords"], np.minimum(16000, cut_curve * 2.2), "lp", 0.7)
    S["bass"] = filt(S["bass"], "hp", 30, 0.7)
    for name in ("pad", "chords", "lead", "fx"):
        S[name] = filt(S[name], "hp", 150 if name != "fx" else 40, 0.7)

    # sidechain duck from the kick
    if M["side"] > 0 and kick_times:
        kt = np.array(sorted(kick_times))
        tt = np.arange(L) / SR
        idx = np.searchsorted(kt, tt, side="right") - 1
        dt = np.where(idx >= 0, tt - kt[np.maximum(idx, 0)], 10.0)
        depth = M["side"] * np.minimum(1.0, dt / 0.006) * np.exp(-dt / (beat * 0.28))
        g = 1 - depth
        g = np.convolve(g, np.ones(96) / 96, mode="same")
        for name in ("bass", "pad", "chords", "lead"):
            S[name] *= g[:, None]

    # level each stem (gated loudness), then sum
    gains = dict(BASE_GAINS)
    gains.update(M.get("gains", {}))
    for name, x in S.items():
        if not np.any(x):
            continue
        lv = lufs(x)
        if lv > -100:
            S[name] = x * 10 ** ((gains[name] - lv) / 20)

    # reverb send: pad, chords, lead, snare and fx share one room
    rv = M["reverb"]
    send = S["pad"] * 0.35 + S["chords"] * 0.3 + S["lead"] * 0.45 + S["snare"] * 0.25 + S["fx"] * 0.3
    wet = reverb(send, rv, rng)
    # echo on the lead (dotted eighth, ping pong)
    lead_echo = np.zeros_like(S["lead"])
    d = nsamp(beat * 0.75)
    for r, (gl, gr) in enumerate(((0.32, 0.0), (0.0, 0.22), (0.15, 0.0))):
        sh = d * (r + 1)
        if sh < L:
            lead_echo[sh:, 0] += S["lead"][: L - sh].mean(axis=1) * gl
            lead_echo[sh:, 1] += S["lead"][: L - sh].mean(axis=1) * gr
    lead_echo = filt(lead_echo, "lp", 4500, 0.7)

    mix = sum(S.values()) + wet + lead_echo
    if M["master_lp"] < 17000:
        mix = filt(mix, "lp", M["master_lp"], 0.6)
        if mood == "warm-lofi":
            mix = soft_clip(mix * 1.5, 1.0) / 1.5

    # fold or cut the tail
    if loop:
        out = mix[:N].copy()
        rest = mix[N:]
        for s in range(0, len(rest), N):
            seg = rest[s : s + N]
            out[: len(seg)] += seg
    else:
        out = mix[:N].copy()
        fade_n = min(N, nsamp(min(0.6, max(0.05, (dur - end_t) * 0.5))))
        out[-fade_n:] *= (np.cos(np.linspace(0, math.pi / 2, fade_n)) ** 2)[:, None]

    out = dc_block(out)
    out = compress(out, thr_db=lufs(out) + 2, ratio=2.5)
    target = -14.0
    lv = lufs(out)
    if lv > -100:
        out *= 10 ** ((target - lv) / 20)
    out = limit(out, -1.0)
    if not loop:
        out[-1] = 0.0
    grid = make_grid(bpm, dur)
    grid.update(key=f"{NAMES[k.root]} {'minor' if k.minor else 'major'}", mood=mood, seed=seed, loop=loop,
                sections=sec_starts, peak=round(peak_t, 6), music_bars=nbars,
                end_hit=None if loop else round(end_t, 6))
    if stems:
        return out, grid, {kk: v[:N] for kk, v in S.items()}, sorted(kick_times)
    return out, grid


NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def reverb(x: np.ndarray, seconds: float, rng) -> np.ndarray:
    """A plain room: decaying noise as the impulse, different in each ear for width."""
    n_ir = nsamp(seconds * 1.1)
    t = tvec(n_ir)
    pre = nsamp(0.018)
    ir = []
    for _ in range(2):
        nz = noise(n_ir, rng) * np.exp(-6.9 * t / seconds)
        nz = filt(nz, "lp", 5500, 0.6)
        nz[:pre] = 0
        ir.append(nz / math.sqrt(np.sum(nz * nz) + 1e-12))
    m = x.mean(axis=1)
    N = _fast_len(len(m) + n_ir)
    M = _fft.rfft(m, N)
    out = np.stack([_fft.irfft(M * _fft.rfft(h, N), N)[: len(m)] for h in ir], axis=1)
    return filt(out, "hp", 200, 0.7)


# ---------------------------------------------------------------------------
# Sound effects for the film's events
# ---------------------------------------------------------------------------

# (peak level in dBFS at gain 1, where the event time sits: "start", "peak" or "end")
SFX_LEVEL = {"whoosh": (-12, "peak"), "swish": (-14, "peak"), "hit": (-9, "start"), "impact": (-6, "start"),
             "click": (-18, "start"), "tick": (-20, "start"), "pop": (-15, "start"), "riser": (-12, "end"),
             "drop": (-12, "start"), "shimmer": (-18, "start"), "thud": (-10, "start"), "type": (-18, "start"),
             "glass": (-15, "start"), "bell": (-15, "start")}


def _sweep_noise(rng, dur: float, f_from: float, f_peak: float, f_to: float, q: float, peak_at: float,
                 pan_from: float, pan_to: float):
    n = nsamp(dur)
    t = tvec(n) / dur
    fc = np.where(t < 0.7, f_from * (f_peak / f_from) ** np.minimum(1, t / 0.7),
                  f_peak * (f_to / f_peak) ** ((t - 0.7) / 0.3))
    x = sweep(pink(n, rng), fc, "bp", q)
    env = np.where(t < peak_at, (t / peak_at) ** 2, np.exp(-(t - peak_at) / 0.12))
    x = seal(x * env)
    pan = pan_from + (pan_to - pan_from) * t
    a = (np.clip(pan, -1, 1) + 1) * math.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * math.sqrt(2), int(peak_at * n)


def sfx_one(kind: str, rng, tonic: int, key: Key):
    """Returns (stereo buffer, anchor sample index = where the event time falls)."""
    j = lambda a=0.06: float(rng.uniform(1 - a, 1 + a))  # noqa: E731
    pent = [0, 2, 4, 7, 9] if not key.minor else [0, 3, 5, 7, 10]

    def penta(step, base):
        return base + 12 * (step // 5) + pent[step % 5]

    if kind == "whoosh":
        d = 0.5 * j(0.1)
        x, a = _sweep_noise(rng, d, 350 * j(), 2600 * j(), 1200, 1.1, 0.6, -0.6, 0.6)
        return x, a
    if kind == "swish":
        d = 0.26 * j(0.1)
        x, a = _sweep_noise(rng, d, 1500 * j(), 6500 * j(), 3500, 1.3, 0.55, 0.4, -0.4)
        return x, a
    if kind in ("hit", "soft-hit"):
        n = nsamp(0.5)
        t = tvec(n)
        body = sine((110 * j()) * (0.5 + 0.5 * np.exp(-t / 0.03)), n) * perc(n, 0.001, 0.08)
        snap = filt(noise(n, rng), "bp", 2200 * j(), 0.9) * perc(n, 0.0007, 0.02)
        x = body + (0.7 if kind == "hit" else 0.25) * snap / (np.abs(snap).max() + 1e-9)
        room = reverb(pan2(x, 0), 0.6, rng) * 0.15
        return seal(pan2(x, 0) + room), 0
    if kind == "impact":
        return i_impact(1.0, rng) + reverb(i_impact(0.5, rng), 1.8, rng) * 0.25, 0
    if kind == "click":
        n = nsamp(0.03)
        x = filt(noise(n, rng), "bp", 3500 * j(), 1.0) * perc(n, 0.0003, 0.003)
        x = x / (np.abs(x).max() + 1e-9) + 0.5 * sine(1800 * j(), n) * perc(n, 0.0005, 0.004)
        return seal(x), 0
    if kind == "tick":
        n = nsamp(0.04)
        f = float(mtof(penta(int(rng.integers(0, 3)), tonic + 36)))
        x = 0.6 * sine(f, n) * perc(n, 0.0004, 0.005)
        x += 0.5 * filt(noise(n, rng), "hp", 3500, 0.8) * perc(n, 0.0003, 0.0018)
        return seal(x), 0
    if kind == "pop":
        n = nsamp(0.14)
        f0 = float(mtof(penta(int(rng.integers(0, 5)), tonic + 12)))
        x = sine(f0 * (1 + np.minimum(1, tvec(n) / 0.045)), n) * perc(n, 0.002, 0.03)
        x += 0.2 * filt(noise(n, rng), "hp", 2500, 0.8) * perc(n, 0.0005, 0.004)
        return seal(x), 0
    if kind == "riser":
        d = 1.6 * j(0.05)
        x = i_riser(d, tonic, 1.0, rng)
        return x, len(x)
    if kind == "drop":
        n = nsamp(1.0)
        t = tvec(n)
        f = mtof(tonic + 24) * 2 ** (-4 * np.minimum(1, t / 0.8))
        x = (saw(f, n) * 0.4 + sine(f, n)) * np.exp(-t / 0.35) * np.minimum(1, t / 0.004)
        x = sweep(x, 6000 * (300 / 6000) ** np.minimum(1, t / 0.8), "lp", 1.0)
        x += 0.8 * sine(45 + 40 * np.exp(-t / 0.05), n) * perc(n, 0.002, 0.25)
        return seal(np.stack([x, np.roll(x, 20)], axis=1)), 0
    if kind == "shimmer":
        out = np.zeros((nsamp(1.4), 2))
        at = 0.0
        for kk in range(6):
            m = penta(int(rng.integers(0, 7)), tonic + 24)
            place(out, i_bell(m, 0.85 ** kk, float(rng.uniform(0.5, 0.9)),
                              ((1, 1, 1), (2.76, 0.2, 0.4), (5.4, 0.1, 0.2))), at, pan=float(rng.uniform(-0.7, 0.7)))
            at += float(rng.uniform(0.035, 0.07))
        out = out + reverb(out, 1.2, rng) * 0.4
        return seal(out), 0
    if kind == "thud":
        n = nsamp(0.6)
        t = tvec(n)
        x = sine(42 + 70 * np.exp(-t / 0.05) * j(), n) * perc(n, 0.002, 0.09)
        nz = filt(noise(n, rng), "lp", 400, 0.7) * perc(n, 0.001, 0.03)
        x += 0.3 * nz / (np.abs(nz).max() + 1e-9)
        return seal(x), 0
    if kind == "type":
        out = np.zeros((nsamp(0.9), 2))
        at, cnt = 0.0, 0
        while at < 0.75:
            space = cnt > 0 and cnt % 6 == 5
            v = float(rng.uniform(0.6, 1.0))
            n = nsamp(0.05)
            x = filt(noise(n, rng), "bp", 1800 if space else float(rng.uniform(2300, 3900)), 1.4) * perc(n, 0.0005, 0.006)
            x = x / (np.abs(x).max() + 1e-9) + 0.45 * sine(140 if space else float(rng.uniform(170, 215)), n) * perc(n, 0.001, 0.012)
            place(out, seal(x) * v, at, pan=float(rng.uniform(-0.2, 0.2)))
            at += float(rng.uniform(0.045, 0.11))
            cnt += 1
        return seal(out), 0
    if kind == "glass":
        n = nsamp(0.9)
        t = tvec(n)
        f = float(mtof(penta(int(rng.integers(0, 5)), tonic + 36)))
        x = np.zeros(n)
        for ratio, amp, tau in ((1, 1, 0.35), (2.32, 0.5, 0.2), (4.25, 0.3, 0.12), (6.63, 0.15, 0.07)):
            if f * ratio < 18000:
                x += amp * np.sin(TWO_PI * f * ratio * j(0.01) * t) * np.exp(-t / tau)
        x *= np.minimum(1, t / 0.0008)
        x += 0.3 * filt(noise(n, rng), "hp", 5000, 0.8) * perc(n, 0.0003, 0.003)
        x = seal(x)
        return pan2(x, 0) + reverb(pan2(x, 0), 0.8, rng) * 0.2, 0
    if kind == "bell":
        x = i_bell(tonic + 24, 1.0, 2.0 * j(0.08))
        return pan2(x, 0) + reverb(pan2(x, 0), 1.4, rng) * 0.2, 0
    raise KeyError(kind)


def render_sfx(meta: dict, key: str = "A minor", seed: int = 1):
    try:
        dur = float(meta["dur"])
    except (KeyError, TypeError, ValueError):
        die('the meta file needs "dur" (the film length in seconds)')
    k = Key(key)
    tonic = k.degree(0, 60)
    N = nsamp(dur)
    out = np.zeros((N + nsamp(3), 2))
    placed = []
    for i, ev in enumerate(meta.get("events") or []):
        try:
            t = float(ev["t"])
        except (KeyError, TypeError, ValueError):
            warn(f"event {i} has no time t, skipped")
            continue
        kind = str(ev.get("type", "hit")).lower()
        if kind not in SFX_LEVEL:
            warn(f'event {i} at {t:.2f} s has unknown type "{kind}", it plays a soft hit')
            kind_play, level_kind = "soft-hit", "hit"
        else:
            kind_play = level_kind = kind
        gain = min(1.0, max(0.0, float(ev.get("gain", 1.0))))
        pan = min(1.0, max(-1.0, float(ev.get("pan", 0.0))))
        rng = np.random.default_rng(zlib.crc32(f"{seed}:{i}:{kind}:{t:.4f}".encode()))
        x, anchor = sfx_one(kind_play, rng, tonic, k)
        if x.ndim == 1:
            x = pan2(x, 0)
        x = x / (np.abs(x).max() + 1e-12) * 10 ** (SFX_LEVEL[level_kind][0] / 20) * gain
        if pan:
            mono = x.mean(axis=1)
            x = 0.5 * x + 0.5 * pan2(mono, pan)
        start = t - anchor / SR
        if start < 0:
            x = x[nsamp(-start) :]
            start = 0.0
        place(out, x, start)
        placed.append(dict(t=t, type=kind, start=round(start, 4)))
    out = out[:N]
    if N > 2:
        fade = min(N, nsamp(0.02))
        out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    if np.abs(out).max() > 10 ** (-1 / 20):
        out = limit(out, -1.0)
    return out, placed


# ---------------------------------------------------------------------------
# Mix: music and effects under the voice
# ---------------------------------------------------------------------------


def _activity(x: np.ndarray, win: float = 0.02) -> np.ndarray:
    """Per 10 ms frame level in dB."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    hop = nsamp(0.01)
    nf = int(math.ceil(len(m) / hop))
    m = np.concatenate([m, np.zeros(nf * hop - len(m))])
    p = np.concatenate([[0.0], np.cumsum(m * m)])
    w = nsamp(win)
    s = np.clip(np.arange(nf) * hop + hop // 2 - w // 2, 0, len(m))  # window centred on the frame
    e = (p[np.minimum(s + w, len(m))] - p[s]) / w
    return 10 * np.log10(np.maximum(e, 1e-12))


def _frames_to_samples(g: np.ndarray, n: int) -> np.ndarray:
    hop = nsamp(0.01)
    return np.interp(np.arange(n), np.arange(len(g)) * hop + hop / 2, g)


def _smooth_frames(g: np.ndarray, down: float, up: float) -> np.ndarray:
    a = math.exp(-0.01 / down)
    r = math.exp(-0.01 / up)
    out = np.empty_like(g)
    s = g[0] if len(g) else 1.0
    for i, v in enumerate(g.tolist()):
        s = a * s + (1 - a) * v if v < s else r * s + (1 - r) * v
        out[i] = s
    return out


BED_UNDER_DB = 6.0  # music plus effects, under the voice


def render_mix(music, sfx, voice, duck_db: float = 8.0, sfx_under_db: float = 9.0):
    parts = [p for p in (music, sfx, voice) if p is not None]
    if not parts:
        die("give at least one of --music, --sfx, --voice")
    n = max(len(p) for p in parts)

    def fit(p):
        if p is None:
            return np.zeros((n, 2))
        return np.concatenate([p, np.zeros((n - len(p), 2))]) if len(p) < n else p

    music, sfx, voice = fit(music), fit(sfx), fit(voice)
    report = {}
    if np.any(voice):
        lv = lufs(voice)
        voice = voice * 10 ** ((-16 - lv) / 20)  # speech at -16 LUFS before the master
        ml = lufs(music) if np.any(music) else -120.0
        if ml > -100:  # music as loud as the voice, so the duck puts it duck_db under
            music = music * 10 ** ((-16 - ml) / 20)
        vdb = _activity(voice)
        active = vdb > max(-50.0, float(np.percentile(vdb, 95)) - 26)
        # widen: duck 150 ms before a word and hold 300 ms after it
        pre, post = 15, 30
        act = active.copy()
        for s in range(1, pre + 1):
            act[:-s] |= active[s:]
        for s in range(1, post + 1):
            act[s:] |= active[:-s]
        g_m = np.where(act, 10 ** (-duck_db / 20), 1.0)
        g_m = _smooth_frames(g_m, 0.08, 0.35)
        music = music * _frames_to_samples(g_m, n)[:, None]
        # effects: at least sfx_under_db below the voice wherever the voice speaks, and the music plus the
        # effects together at least BED_UNDER_DB below it (the check has to count the effects too)
        e_s = 10 ** (_activity(sfx, 0.05) / 10)
        e_v = 10 ** (_activity(voice, 0.05) / 10)
        e_m = 10 ** (_activity(music, 0.05) / 10)
        allow = np.minimum(e_v * 10 ** (-sfx_under_db / 10), np.maximum(0.0, e_v * 10 ** (-BED_UNDER_DB / 10) - e_m))
        g_s = np.where(act, np.minimum(1.0, np.sqrt(allow / np.maximum(e_s, 1e-12))), 1.0)
        g_s = _smooth_frames(np.maximum(g_s, 10 ** (-40 / 20)), 0.01, 0.2)
        sfx = sfx * _frames_to_samples(g_s, n)[:, None]
        # check the bed (music plus effects) against the voice: momentary loudness (K weighted, 400 ms)
        # in the moments where the voice speaks at its normal level
        v4 = block_loudness(voice, 0.4, 0.01)[0]
        bed = block_loudness(music + sfx, 0.4, 0.01)[0]
        spoken = v4 > -70
        mask = spoken & (v4 > float(np.percentile(v4[spoken], 90)) - 10) if spoken.any() else spoken
        if mask.any():
            report["voice_over_bed_db_min"] = round(float(np.percentile(v4[mask] - bed[mask], 5)), 1)
            report["voice_over_bed_db_median"] = round(float(np.median(v4[mask] - bed[mask])), 1)
    out = music + sfx + voice
    out = dc_block(out)
    out = limit(out, -1.0)
    report.update(peak_db=round(peak_db(out), 2), lufs=round(lufs(out), 2))
    return out, report


# ---------------------------------------------------------------------------
# Command line
# ---------------------------------------------------------------------------


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="sound.py", description="Music, sound effects and the mix for a film.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("grid", help="print beat and bar times as JSON")
    g.add_argument("--bpm", type=float, required=True)
    g.add_argument("--dur", type=float, required=True)
    g.add_argument("--beats-per-bar", type=int, default=4)

    m = sub.add_parser("music", help="write a produced music track on the bar grid")
    m.add_argument("--out", required=True)
    m.add_argument("--dur", type=float, required=True, help="length in seconds (the file is exactly this long)")
    m.add_argument("--bpm", type=float, help="tempo; each mood has its own default")
    m.add_argument("--key", default="A minor", help='for example "A minor" or "F# major"')
    m.add_argument("--mood", required=True, choices=list(MOODS))
    m.add_argument("--sections", help='bars per section, for example "intro:4,build:4,drop:8,outro:4"')
    m.add_argument("--peak", type=float, help="time in seconds of the drop; it moves to the nearest bar line")
    m.add_argument("--seed", type=int, default=1)
    m.add_argument("--loop", action="store_true", help="no ending; the last bar flows into the first")

    s = sub.add_parser("sfx", help="sound effects for the events in a film's meta.json")
    s.add_argument("--meta", required=True)
    s.add_argument("--out", required=True)
    s.add_argument("--key", default="A minor")
    s.add_argument("--seed", type=int, default=1)

    x = sub.add_parser("mix", help="music and effects under the voice")
    x.add_argument("--music")
    x.add_argument("--sfx")
    x.add_argument("--voice")
    x.add_argument("--out", required=True)
    x.add_argument("--duck-db", type=float, default=8.0, help="music drop under the voice (10 to 12 for teaching)")

    st = sub.add_parser("stats", help="loudness, peaks, spectrum, clicks (to check what you cannot hear)")
    st.add_argument("--in", dest="inp", required=True)
    st.add_argument("--grid", help="a .grid.json; adds the spectrum of each section")

    a = ap.parse_args(argv)
    if a.cmd == "grid":
        if a.bpm <= 0 or a.dur <= 0 or a.beats_per_bar < 1:
            die("--bpm, --dur and --beats-per-bar must be above 0")
        print(json.dumps(make_grid(a.bpm, a.dur, a.beats_per_bar)))
        return 0
    if a.cmd == "music":
        out, grid = render_music(a.dur, a.bpm, a.key, a.mood, a.sections, a.peak, a.seed, a.loop)
        write_wav(a.out, out)
        with open(a.out + ".grid.json", "w", encoding="utf-8") as f:
            json.dump(grid, f)
        print(json.dumps({"out": a.out, "dur": a.dur, "bpm": grid["bpm"], "key": grid["key"],
                          "peak": grid["peak"], "sections": grid["sections"], "peak_db": round(peak_db(out), 2)}))
        return 0
    if a.cmd == "sfx":
        try:
            with open(a.meta, encoding="utf-8") as f:
                meta = json.load(f)
        except (OSError, ValueError) as e:
            die(f"cannot read {a.meta}: {e}")
        out, placed = render_sfx(meta, a.key, a.seed)
        write_wav(a.out, out)
        print(json.dumps({"out": a.out, "events": len(placed), "peak_db": round(peak_db(out), 2)}))
        return 0
    if a.cmd == "mix":
        mus = read_audio(a.music) if a.music else None
        fx = read_audio(a.sfx) if a.sfx else None
        vo = read_audio(a.voice) if a.voice else None
        out, rep = render_mix(mus, fx, vo, a.duck_db)
        write_wav(a.out, out)
        rep["out"] = a.out
        if "voice_over_bed_db_min" in rep and rep["voice_over_bed_db_min"] < BED_UNDER_DB - 1:
            warn(f"the voice is only {rep['voice_over_bed_db_min']} dB over the music and effects in places; "
                 "raise --duck-db or lower the effects there")
        print(json.dumps(rep))
        return 0
    if a.cmd == "stats":
        y = read_audio(a.inp)
        rep = stats_of(y)
        rep["dur"] = round(len(y) / SR, 4)
        if a.grid:
            with open(a.grid, encoding="utf-8") as f:
                grid = json.load(f)
            secs = grid.get("sections", [])
            rep["sections"] = []
            for i, sc in enumerate(secs):
                t1 = secs[i + 1]["t"] if i + 1 < len(secs) else (grid.get("end_hit") or rep["dur"])
                seg = y[int(sc["t"] * SR) : int(t1 * SR)]
                if len(seg) > SR // 10:
                    rep["sections"].append(dict(name=sc["name"], t=sc["t"], lufs=round(lufs(seg), 1),
                                                bands=band_db(seg)))
        print(json.dumps(rep))
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
