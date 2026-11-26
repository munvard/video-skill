"""Build the gallery. One command per piece.

  python gallery/src/build.py shape-morph          render, encode, measure the loop
  python gallery/src/build.py shape-morph --draft  a few frames only, then a contact sheet
  python gallery/src/build.py --sheet a b c        contact sheet of finished previews
  python gallery/src/build.py --report             size, frames and loop seam of everything

Needs Python with Pillow and numpy, Node 22 or newer and Chrome (set CHROME if it is not found). Pieces in src/lit
are path traced in WebGL, so they want a real graphics card. SPPK=0.25 renders them with fewer samples.
"""
import io
import json
import shutil
import struct
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SRC = Path(__file__).resolve().parent
GAL = SRC.parent
KIT = GAL.parent / "plugins/video/skills/video/kit"
FR = GAL / ".frames"
STILL = {"icon": GAL.parent / "plugins/video/.claude-plugin/icon.png", "social": GAL / "social.png"}
LIMIT = {"hero": 5400, "anatomy": 1700, "isometric-city": 445, "comic-panels": 445, "map-journey": 445, "beat-cut": 430}


def render(slug, step=1):
    out = FR / slug
    if not any((SRC / d / f"{slug}.js").exists() for d in ("2d", "lit")):
        sys.exit("unknown piece: " + slug)
    scene = next(SRC / d / f"{slug}.js" for d in ("2d", "lit") if (SRC / d / f"{slug}.js").exists())
    if subprocess.run(["node", str(KIT / "render.mjs"), "--scene", str(scene), "--png-dir", str(out), "--every", str(step)]).returncode:
        sys.exit(1)
    return out


def load(out):
    return [Image.open(p).convert("RGB") for p in sorted(out.glob("[0-9]*.png"))]


def calm(frames, thr=2):
    """Keep a pixel as it was when only render noise changed it: less than thr levels, and its average over the next
    frames did not move. A slow fade or a moving gradient is left alone, or it would leave a trail."""
    a = [np.asarray(f).astype(np.int16) for f in frames]
    raw = list(a)
    for i in range(1, len(a)):
        ahead = np.mean(raw[max(0, i - 2):i + 5], axis=0)
        same = np.abs(a[i] - a[i - 1]).max(axis=2, keepdims=True) <= thr
        same &= np.abs(ahead - a[i - 1]).max(axis=2, keepdims=True) <= 1
        a[i] = np.where(same, a[i - 1], a[i])
    return [Image.fromarray(x.astype(np.uint8)) for x in a]


def still(im, **k):
    """One picture as the bare image chunks (ALPH, VP8 or VP8L) of a WebP file."""
    f = io.BytesIO()
    im.save(f, "WEBP", exact=True, **k)
    d = f.getvalue()[12:]
    out = b""
    while d:
        n = struct.unpack("<I", d[4:8])[0]
        n = 8 + n + (n & 1)
        if d[:4] in (b"ALPH", b"VP8 ", b"VP8L"):
            out += d[:n]
        d = d[n:]
    return out


def mux(dst, size, parts):
    """Write an animated WebP. A frame repaints its rectangle, or only the tiles that changed in it."""
    u24 = lambda v: struct.pack("<I", v)[:3]
    out = b"VP8X" + struct.pack("<I", 10) + b"\x12\0\0\0" + u24(size[0] - 1) + u24(size[1] - 1)
    out += b"ANIM" + struct.pack("<IIH", 6, 0xFFFFFFFF, 0)
    for (x, y, w, h), ms, data in parts:
        body = u24(x // 2) + u24(y // 2) + u24(w - 1) + u24(h - 1) + u24(ms) + (b"\0" if data[:4] == b"ALPH" else b"\x02") + data
        out += b"ANMF" + struct.pack("<I", len(body)) + body
    dst.write_bytes(b"RIFF" + struct.pack("<I", len(out) + 4) + b"WEBP" + out)
    return dst.stat().st_size


def changed(a, b, pad):
    """The even rectangle that holds every changed pixel, with room for the codec's own ringing."""
    d = np.argwhere((np.asarray(a) != np.asarray(b)).any(axis=2))
    if not len(d):
        return None
    (y0, x0), (y1, x1) = d.min(0), d.max(0) + 1
    h, w = np.asarray(a).shape[:2]
    x0, y0 = max(0, x0 - pad) // 16 * 16, max(0, y0 - pad) // 16 * 16
    return int(x0), int(y0), int(min(w, x1 + pad) - x0), int(min(h, y1 + pad) - y0)


def tiles(a, b, box):
    """The new picture with every 16 pixel tile that did not change made clear. The edge is kept 8 pixels away from
    the clear part, so the codec cannot bleed color over it."""
    d = (np.asarray(a) != np.asarray(b)).any(axis=2)
    h, w = d.shape
    H, W = -(-h // 16), -(-w // 16)
    p = np.zeros((H * 16 + 16, W * 16 + 16), bool)
    p[8:8 + h, 8:8 + w] = d
    grow = np.zeros_like(p)
    for dy in (-8, -4, 0, 4, 8):
        for dx in (-8, -4, 0, 4, 8):
            grow |= np.roll(p, (dy, dx), (0, 1))
    on = grow[8:8 + H * 16, 8:8 + W * 16].reshape(H, 16, W, 16).any(axis=(1, 3))
    if on.mean() > .8:
        return None
    big = np.pad(np.kron(on, np.ones((16, 16), bool)), 8, "edge")
    al = np.ones((H * 16, W * 16), bool)
    for dy in (0, 4, 8, 12, 16):
        for dx in (0, 4, 8, 12, 16):
            al &= big[dy:dy + H * 16, dx:dx + W * 16]
    rgb = np.asarray(b).copy()
    keep = np.kron(on, np.ones((16, 16), bool))[:h, :w]
    rgb[~keep] = rgb[keep].mean(axis=0) if keep.any() else 0
    im = Image.fromarray(np.dstack([rgb, np.where(al[:h, :w], 255, 0).astype(np.uint8)]), "RGBA")
    return im.crop((box[0], box[1], box[0] + box[2], box[1] + box[3]))


def encode(slug, frames, fps):
    """Best quality under the size limit. Each frame is the smaller of lossless and lossy, over its changed rectangle."""
    dst, cap = GAL / f"{slug}.webp", LIMIT.get(slug, 400) * 1024
    if (SRC / "lit" / f"{slug}.js").exists():  # drawn scenes have no noise, and freezing a slow fade would leave a ghost
        frames = calm(frames)
    dur = [round((i + 1) * 1000 / fps) - round(i * 1000 / fps) for i in range(len(frames))]
    todo = [[(0, 0, *frames[0].size), dur[0], frames[0], None]]
    for a, b, ms in zip(frames, frames[1:], dur[1:]):
        r = changed(a, b, 12)
        if r is None:
            todo[-1][1] += ms
        else:
            todo.append([r, ms, b.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])), tiles(a, b, r)])
    with ThreadPoolExecutor(6) as ex:
        free = list(ex.map(lambda t: still(t[2], lossless=True, quality=60, method=4), todo))

        def lossy(q, m):
            d = list(ex.map(lambda t: still(t[2], quality=q, method=m), todo))
            e = list(ex.map(lambda t: t[3] and still(t[3], quality=q, method=m, alpha_quality=100), todo))
            return [min((z for z in c if z), key=len) for c in zip(free, d, e)]
        size = lambda ds: sum(len(x) + 24 for x in ds) + 60
        if size(free) <= cap * .8:
            best, data = 100, free
        else:
            lo, hi = 4, 92
            while hi - lo > 1:
                mid = (lo + hi) // 2
                lo, hi = (mid, hi) if size(lossy(mid, 4)) <= cap else (lo, mid)
            best, data = lo, lossy(lo, 6)
    return dst, best, mux(dst, frames[0].size, [(r, ms, d) for (r, ms, *_), d in zip(todo, data)])


def leftover(src, dec):
    """Largest brightness error, in levels, on areas that are flat in the source and far from any edge. Finds ghosts of old frames."""
    worst = 0
    for a, b in zip(src, dec):
        a, b = np.asarray(a).astype(np.int16), np.asarray(b).astype(np.int16)
        h, w = a.shape[0] // 8, a.shape[1] // 8
        blk = a[:h * 8, :w * 8].reshape(h, 8, w, 8, 3)
        lo, hi = (np.pad(m, ((2, 2), (2, 2), (0, 0)), "edge") for m in (blk.min((1, 3)), blk.max((1, 3))))
        for dy in range(5):
            for dx in range(5):
                part = np.s_[dy:dy + h, dx:dx + w]
                lo0 = lo[part] if dy + dx == 0 else np.minimum(lo0, lo[part])
                hi0 = hi[part] if dy + dx == 0 else np.maximum(hi0, hi[part])
        ok = (hi0 - lo0 <= 12).all(axis=2)
        e = np.abs((a - b) @ [.299, .587, .114])[:h * 8, :w * 8].reshape(h, 8, w, 8).max((1, 3)).round()
        if ok.any():
            worst = max(worst, int(e[ok].max()))
    return worst


def expand(path, fps, n):
    """Decode, with merged frames repeated, so that frame k is frame k of the source again."""
    im, out, t = Image.open(path), [], 0
    for i in range(im.n_frames):
        im.seek(i)
        f = im.convert("RGB")
        t += im.info["duration"]
        while len(out) < n and round((len(out) + 1) * 1000 / fps) <= t + 1:
            out.append(f)
    return out


def seam(frames):
    d = [float(np.abs(np.asarray(a, np.float32) - np.asarray(b, np.float32)).mean() / 2.55)
         for a, b in zip(frames, frames[1:] + frames[:1])]
    return d[-1], max(d[:-1])


def read(path):
    im = Image.open(path)
    out, ms = [], 0
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        out.append(im.convert("RGB"))
        ms += im.info.get("duration", 0)
    return out, ms


def sheet(rows, dst, size=240, cols=6):
    hs = [round(size * r[1][0].height / r[1][0].width) for r in rows]
    im = Image.new("RGB", (size * cols, sum(hs)), "black")
    y = 0
    for (name, fr), h in zip(rows, hs):
        for k in range(cols):
            f = fr[round(k * len(fr) / cols) % len(fr)]
            im.paste(f.resize((size, h), Image.LANCZOS), (k * size, y))
        ImageDraw.Draw(im).text((4, y + 2), name, fill="white", stroke_width=2, stroke_fill="black")
        y += h
    im.save(dst, quality=88)
    return dst


def main(a):
    FR.mkdir(exist_ok=True)
    if a[0] == "--sheet":
        print(sheet([(s, read(GAL / f"{s}.webp")[0]) for s in a[1:]], FR / "sheet.jpg"))
    elif a[0] == "--report":
        tot = 0
        for p in sorted(GAL.glob("*.webp")):
            f, ms = read(p)
            s, m = seam(f)
            tot += p.stat().st_size
            print(f"{p.stem:18} {f[0].size} {len(f):3}f {ms/1000:5.2f}s {p.stat().st_size/1024:5.0f} KB "
                  f"seam {s:.2f}% (max step {m:.2f}%)")
        print(f"total {tot/1e6:.2f} MB")
    else:
        slug, draft = a[0], "--draft" in a
        if "--encode" in a:
            out = FR / slug
        else:
            out = render(slug, int(a[a.index("--draft") + 1]) if draft and a[-1] != "--draft" else 6 if draft else 1)
        fr = load(out)
        if draft:
            if len(fr) > 6:
                fr = [fr[round(k * len(fr) / 12) % len(fr)] for k in range(12)]
                rows = [(slug, fr[:6]), ("", fr[6:])]
            else:
                rows = [(slug, fr)]
            print(sheet(rows, FR / f"{slug}.jpg", 240))
            return
        if slug in STILL:
            STILL[slug].parent.mkdir(parents=True, exist_ok=True)
            fr[0].save(STILL[slug], optimize=True)
            print(f"{slug}: {fr[0].size} {STILL[slug].stat().st_size/1024:.0f} KB")
            shutil.rmtree(out, ignore_errors=True)
            return
        fps = json.loads((out / "info.json").read_text())["fps"]
        dst, q, size = encode(slug, fr, fps)
        s, m = seam(fr)
        print(f"{slug}: {len(fr)} frames {fps} fps, {size/1024:.0f} KB q{q}, seam {s:.2f}% (max step {m:.2f}%), "
              f"leftover {leftover(fr, expand(dst, fps, len(fr)))} levels")
        if "--keep" not in a:
            shutil.rmtree(out, ignore_errors=True)


main(sys.argv[1:])
