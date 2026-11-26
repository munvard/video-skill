"""check.py: the gates every film passes before anyone sees it. Each gate prints PASS or FAIL with its numbers.

    python check.py film.mp4 [out_folder] [--meta film.meta.json] [--loop] [--silent-ok] [--night A-B] [--hold 1.4]

Needs ffmpeg, ffprobe and numpy (uv run --with numpy python check.py ...). The meta file is written by kit/render.mjs
next to each render; when the film went through finish.py, give the meta of the silent render with --meta (it is also
found by name: film.meta.json, or the newest *.meta.json in the same folder with the same frame count).

Gates (numbers come from the file, never from the plan):
  format      size, fps, frames, picture and sound the same length
  frame0      frame 0 is a full picture: not dark, not flat, sharp (settled), and words on it when the film has words
  empty       no run of more than 3 frames that are one flat field (a blank or a solid colour)
  dead        no stretch over 1.5 s where nothing on screen changes (except the end hold)
  endhold     the picture is not frozen at the end for more than 1.4 s (an end card keeps a slow drift)
  dark        no stretch over 2 s with mean luma under 40 (unless --night marks a planned night beat)
  slab        no flat dark area (a dark panel, an empty dark sky) over 25% of the frame for more than 1.5 s
  reading     every line stays fully on screen long enough to read: 0.3 s a word plus 0.4 s, at least 1.0 s
  textsize    every word is at least 14 px tall when the frame is 360 px wide
  overlap     no two texts on screen together for 0.5 s or more with their boxes overlapping
  contrast    every line at least 4.5:1 against the background around its letters (text colours from the meta)
  band        9:16 only: no empty band (no edges, no change) over 30% of the height for more than 1 s
  safearea    9:16 only: text stays inside the area the Reels, Shorts and TikTok buttons and captions leave free
  loudness    -14 LUFS within 1, true peak at or under -1.0 dBTP
  loop        with --loop: the last frame flows into frame 0 (PSNR at least 30 dB)
Also written to out_folder: sheet_*.jpg (1 frame a second at phone size, with the 9:16 safe area drawn), crop_*.png
(the most detailed 512 px square at four moments, at 100%: look for blocky or pixelated texture), frame0_360.png,
check.json. Look at every sheet yourself: the gates catch numbers, not beauty.
Exit code 1 when any gate fails.
"""
import json
import pathlib
import re
import subprocess
import sys

try:
    import numpy as np
except ImportError:
    sys.exit("check.py needs numpy: run it as  uv run --with numpy python check.py ...  or  pip install numpy")

AW = 96  # analysis width for motion and flat-field tests
RES = []


def run(args):
    p = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode:
        sys.exit(f"{args[0]} failed: {p.stderr.strip()[-600:]}")
    return p.stdout + p.stderr


def gate(name, ok, detail):
    RES.append({"gate": name, "ok": bool(ok) if ok is not None else None, "detail": detail})
    print(f"{'PASS' if ok else 'FAIL' if ok is not None else 'INFO'}  {name:9} {detail}")


def frames_gray(film, w, h, fps_out=None, first=False):
    """Frames as small grayscale arrays (w x h), straight from ffmpeg."""
    vf = f"scale={w}:{h}:flags=area,format=gray"
    if fps_out:
        vf = f"fps={fps_out}," + vf
    extra = ["-frames:v", "1"] if first else []
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", str(film), "-vf", vf, *extra, "-f", "rawvideo", "-"], capture_output=True)
    if p.returncode:
        sys.exit("ffmpeg could not decode the film: " + p.stderr.decode(errors="replace")[-400:])
    a = np.frombuffer(p.stdout, np.uint8)
    return a[: a.size // (w * h) * w * h].reshape(-1, h, w).astype(np.float32)


def runs(mask):
    """(start, length) of every run of True."""
    out, start = [], None
    for i, v in enumerate(list(mask) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i - start))
            start = None
    return out


def sharp(img):
    lap = img[1:-1, 1:-1] * 4 - img[:-2, 1:-1] - img[2:, 1:-1] - img[1:-1, :-2] - img[1:-1, 2:]
    return float(lap.var())


def find_meta(film, frames):
    for cand in (film.with_suffix(".meta.json"), film.parent / (film.stem + ".meta.json")):
        if cand.is_file():
            return cand
    best = None
    for cand in sorted(film.parent.glob("*.meta.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            if json.loads(cand.read_text(encoding="utf-8")).get("frames") == frames:
                return cand
        except (OSError, ValueError):
            continue
    return best


NAMED = {"white": (255, 255, 255), "black": (0, 0, 0)}


def parse_color(c):
    """CSS colour (#rgb, #rrggbb, rgb(), rgba(), white, black) to (r, g, b), or None."""
    c = str(c).strip().lower()
    if c in NAMED:
        return NAMED[c]
    m = re.fullmatch(r"#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?", c)
    if m:
        h = m.group(1)
        h = "".join(ch * 2 for ch in h) if len(h) == 3 else h
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    m = re.fullmatch(r"rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)", c)
    if m:
        a = m.group(4)
        if a is not None and (float(a.rstrip("%")) / (100 if a.endswith("%") else 1)) < 0.5:
            return None
        return tuple(round(float(m.group(i))) for i in (1, 2, 3))
    return None


def rel_lum(rgb):
    """WCAG relative luminance of sRGB values (0 to 255), works on arrays."""
    x = np.asarray(rgb, np.float32) / 255
    x = np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
    return x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722


def frame_rgb(film, t, W, H):
    p = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(film), "-frames:v", "1", "-f", "rawvideo",
                        "-pix_fmt", "rgb24", "-"], capture_output=True)
    a = np.frombuffer(p.stdout, np.uint8)
    return a[: W * H * 3].reshape(H, W, 3) if a.size >= W * H * 3 else None


def contrast(img, box, colors):
    """Worst contrast ratio between each text colour and the typical (median) background around and between its letters.
    Pixels near a text colour, and 2 px around them (anti-aliasing), are not background."""
    H, W = img.shape[:2]
    x0, y0, x1, y1 = box
    pad = 0.1 * (y1 - y0)
    x0, y0, x1, y1 = (max(0, int(x0 - pad)), max(0, int(y0 - pad)), min(W, int(x1 + pad)), min(H, int(y1 + pad)))
    reg = img[y0:y1, x0:x1].astype(np.float32)
    if reg.size == 0:
        return None
    near = np.zeros(reg.shape[:2], bool)
    for c in colors:
        near |= np.abs(reg - np.array(c, np.float32)).max(axis=2) < 48
    grow = near.copy()
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            grow |= np.roll(np.roll(near, dy, 0), dx, 1)
    bg = rel_lum(reg[~grow])
    if bg.size < 50:
        return None
    worst = None
    for c in colors:
        lt = float(rel_lum(c))
        lb = float(np.median(bg))
        r = (max(lt, lb) + 0.05) / (min(lt, lb) + 0.05)
        worst = r if worst is None else min(worst, r)
    return worst


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        sys.exit(__doc__)
    opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
    film = pathlib.Path(args[0])
    out = pathlib.Path(args[1]) if len(args) > 1 and not args[1].startswith("--") else film.parent / (film.stem + "_check")
    if not film.is_file():
        sys.exit(f"no such file: {film}")
    out.mkdir(parents=True, exist_ok=True)
    loop, silent_ok, hold_max = "--loop" in args, "--silent-ok" in args, float(opt("--hold", 1.4))
    night = [tuple(float(x) for x in r.split("-")) for r in (opt("--night") or "").split(",") if r]

    info = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(film)]))
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    if v is None:
        sys.exit("no video stream")
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    W, H = int(v["width"]), int(v["height"])
    n, d = (int(x) for x in v["r_frame_rate"].split("/"))
    fps = n / d
    vdur = float(v.get("duration") or info["format"]["duration"])
    adur = float(a.get("duration") or 0) if a else 0.0
    ah = max(2, round(AW * H / W / 2) * 2)
    g = frames_gray(film, AW, ah)
    nf = len(g)
    same_len = a is None or abs(adur - vdur) <= 1.5 / fps + 0.03
    gate("format", same_len and nf > 0, f"{W}x{H} {fps:g} fps, {nf} frames, {nf / fps:.2f} s" + (f", sound {adur:.2f} s" if a else ", no sound") + ("" if same_len else "  (picture and sound differ)"))

    meta_path = pathlib.Path(opt("--meta")) if opt("--meta") else find_meta(film, nf)
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path and meta_path.is_file() else None
    texts = [t for t in (meta or {}).get("texts", []) if not t.get("pass")]
    sx = W / meta["w"] if meta else 1.0

    # frame 0: full, settled, with words
    h360 = max(2, round(360 * H / W / 2) * 2)
    f0 = frames_gray(film, 360, h360, first=True)[0]
    # settled = as sharp as the opening shot it starts (first 3 s), and not a blur next to the whole film.
    # Comparing only with the film let a crisp end card on a dark shade fail a soft, focused 3D opener.
    sh = [sharp(x) for x in frames_gray(film, 360, h360, fps_out=2)]
    s0 = sharp(f0)
    s90 = float(np.percentile(sh, 90)) if sh else 0.0
    sop = float(np.percentile(sh[:6], 90)) if sh else 0.0
    words0 = [t for t in texts if t["t0"] <= 0.001]
    ok0 = (f0.mean() >= 40 and f0.std() >= 18 and s0 >= 0.5 * sop and s0 >= 0.25 * s90
           and (not texts or words0))
    gate("frame0", ok0, f"mean luma {f0.mean():.0f} (40+), contrast {f0.std():.0f} (18+), sharpness {s0:.0f} "
         f"vs opening {sop:.0f} (50%+) and film {s90:.0f} (25%+)"
         + (f", words at frame 0: {len(words0)}" if meta else ", no meta: words not checked"))

    flat = (g.std(axis=(1, 2)) < 1.5) & ((g.max(axis=(1, 2)) - g.min(axis=(1, 2))) < 8)
    bad = [(s, l) for s, l in runs(flat) if l > 3]
    gate("empty", not bad, "no flat frames" if not bad else "flat runs at " + ", ".join(f"{s / fps:.2f} s ({l} f)" for s, l in bad[:6]))

    diff = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2)) if nf > 1 else np.zeros(0)
    still = diff < 0.35
    tail = 0
    for x in still[::-1]:
        if not x:
            break
        tail += 1
    dead = [(s, l) for s, l in runs(still) if l / fps > 1.5 and s + l < len(still) - tail + 1 and s + l != len(still)]
    gate("dead", not dead, "something moves in every 1.5 s" if not dead else "frozen at " + ", ".join(f"{s / fps:.2f} s for {l / fps:.2f} s" for s, l in dead[:6]))
    gate("endhold", tail / fps <= hold_max, f"frozen tail {tail / fps:.2f} s (at most {hold_max} s)")

    luma = g.mean(axis=(1, 2))
    dk = [(s, l) for s, l in runs(luma < 40) if l / fps > 2 and not any(s / fps >= a0 - 0.1 and (s + l) / fps <= b0 + 0.1 for a0, b0 in night)]
    gate("dark", not dk, f"mean luma {luma.mean():.0f}" if not dk else "dark at " + ", ".join(f"{s / fps:.2f} to {(s + l) / fps:.2f} s" for s, l in dk[:6]))

    # slab: a big flat dark area (a dark panel or an empty dark sky) that covers a quarter of the frame for over 1.5 s
    B = 6
    hb, wb = ah // B, AW // B
    blk = g[:, : hb * B, : wb * B].reshape(nf, hb, B, wb, B)
    slab = ((blk.std(axis=(2, 4)) < 2.5) & (blk.mean(axis=(2, 4)) < 80)).mean(axis=(1, 2))
    sl = [(s, l) for s, l in runs(slab > 0.25) if l / fps > 1.5 and not any(s / fps >= a0 - 0.1 and (s + l) / fps <= b0 + 0.1 for a0, b0 in night)]
    gate("slab", not sl, f"largest flat dark area {slab.max() * 100:.0f}% of the frame (25% or less)" if not sl else
         "flat dark area over 25% of the frame at " + ", ".join(f"{s / fps:.2f} to {(s + l) / fps:.2f} s (up to {slab[s:s + l].max() * 100:.0f}%)" for s, l in sl[:6])
         + ": light it, texture it or fill it with the subject")

    # band (9:16): an empty band (no edges, no change) over 30% of the height for more than 1 s: the subject group should
    # fill the frame from the top to the bottom of the safe area.
    if H > W * 1.5:
        dx = np.abs(np.diff(g, axis=2)).mean(axis=2)
        rm = g.mean(axis=2)
        dm = np.abs(np.diff(rm, axis=1, prepend=rm[:, :1]))
        empty = (dx < 0.8) & (dm < 3)
        band = np.zeros(nf)
        for i in range(nf):
            best = cur = 0
            for e in empty[i]:
                cur = cur + 1 if e else 0
                best = max(best, cur)
            band[i] = best / ah
        bd = [(s0, l) for s0, l in runs(band > 0.30) if l / fps > 1.0]
        gate("band", not bd, f"largest empty band {band.max() * 100:.0f}% of the height (30% or less)" if not bd else
             "empty band over 30% of the height at " + ", ".join(f"{s0 / fps:.2f} to {(s0 + l) / fps:.2f} s (up to {band[s0:s0 + l].max() * 100:.0f}%)" for s0, l in bd[:6])
             + ": make the subject group fill the safe area from top to bottom")

    if meta:
        slow = []
        for t in texts:
            need = max(1.0, 0.3 * len(t["text"].split()) + 0.4)
            if not t.get("full"):
                slow.append(f"'{t['text'][:28]}' never fully on screen")
            elif t["run"] + 1e-6 < need:
                slow.append(f"'{t['text'][:28]}' {t['run']:.2f} s, needs {need:.2f} s")
        gate("reading", not slow, f"{len(texts)} lines all readable in time" if not slow else "; ".join(slow[:8]))
        small = []
        for t in texts:
            px = t.get("px") or (t["box"][3] - t["box"][1]) * 0.72
            h360 = px * sx * 360 / W
            if h360 < 14:
                small.append(f"'{t['text'][:24]}' {h360:.1f} px")
        gate("textsize", not small, f"smallest {min(((t.get('px') or 0) * sx * 360 / W) for t in texts):.1f} px at 360 wide (14+)" if texts and not small else ("no texts" if not texts else "too small: " + "; ".join(small[:8])))
        if H > W * 1.5:
            x0, x1, y0, y1 = 60 / 1080 * W, 940 / 1080 * W, 250 / 1920 * H, 1450 / 1920 * H
            out_t = [t for t in texts if t.get("box") and (t["box"][0] * sx < x0 - 1 or t["box"][2] * sx > x1 + 1 or t["box"][1] * sx < y0 - 1 or t["box"][3] * sx > y1 + 1)]
            gate("safearea", not out_t, "all text inside x 60 to 940, y 250 to 1450 (at 1080x1920)" if not out_t else "outside: " + "; ".join(f"'{t['text'][:22]}' box {[round(v) for v in t['box']]}" for t in out_t[:6]))
        over = []
        for i, a1 in enumerate(texts):
            for b1 in texts[i + 1:]:
                ta, tb = a1.get("boxm") or a1.get("box"), b1.get("boxm") or b1.get("box")
                both = min(a1["t1"], b1["t1"]) - max(a1["t0"], b1["t0"])
                if not ta or not tb or both < 0.5:
                    continue
                iw, ih = min(ta[2], tb[2]) - max(ta[0], tb[0]), min(ta[3], tb[3]) - max(ta[1], tb[1])
                small = min((ta[2] - ta[0]) * (ta[3] - ta[1]), (tb[2] - tb[0]) * (tb[3] - tb[1])) or 1
                if iw > 0 and ih > 0 and iw * ih / small > 0.15:
                    over.append(f"'{a1['text'][:18]}' and '{b1['text'][:18]}' at {max(a1['t0'], b1['t0']):.1f} s")
        gate("overlap", not over, "no text sits on other text for 0.5 s or more" if not over else "text on text: " + "; ".join(over[:6]))
        lows, seen = [], []
        for t in texts:
            cols = [c for c in (parse_color(x) for x in t.get("colors") or []) if c]
            box = t.get("boxm") or t.get("box")
            if not cols or not box or t.get("tm") is None:
                continue
            img = frame_rgb(film, t["tm"], W, H)
            r = contrast(img, [v * sx for v in box], cols) if img is not None else None
            if r is None:
                continue
            seen.append(f"'{t['text'][:18]}' {r:.1f}")
            if r < 4.5:
                lows.append(f"'{t['text'][:24]}' {r:.1f}:1 at {t['tm']:.1f} s")
        if seen:
            gate("contrast", not lows, ("every line 4.5:1 or more against the background around its letters: " + ", ".join(seen[:10])) if not lows else
                 "under 4.5:1: " + "; ".join(lows[:8]) + ". Use a stronger colour, a soft shadow or a scrim behind the words")
        else:
            gate("contrast", None, "no text colours in the meta (render with the current kit/render.mjs); check contrast by eye")
    else:
        gate("reading", None, "no meta.json from kit/render.mjs: reading time, text size and safe area are not checked; check them by eye")

    if a:
        s = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(film), "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"]).split("Summary:")[-1]
        li = float(re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", s).group(1).replace("-inf", "-99"))
        tp = float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", s).group(1).replace("-inf", "-99"))
        gate("loudness", abs(li + 14) <= 1 and tp <= -1.0, f"{li:.1f} LUFS (-14 within 1), true peak {tp:.1f} dBTP (-1.0 or lower)")
    else:
        gate("loudness", True if silent_ok else False, "no sound track" + (" (allowed)" if silent_ok else ": a film for social needs sound; pass --silent-ok if this one must be silent"))

    last = nf - 1
    seam = run(["ffmpeg", "-v", "info", "-i", str(film), "-i", str(film), "-filter_complex",
                f"[0]select=eq(n\\,{last}),setpts=0[a];[1]select=eq(n\\,0),setpts=0[b];[a][b]psnr", "-frames:v", "1", "-an", "-f", "null", "-"])
    m = re.search(r"average:(\S+)", seam)
    psnr = float(m.group(1)) if m and m.group(1) != "inf" else 99.0
    gate("loop", (psnr >= 30) if loop else None, f"last frame against frame 0: {psnr:.1f} dB PSNR" + (" (30+)" if loop else ""))

    motion = float(np.median(diff)) if len(diff) else 0.0
    cuts = int((diff > np.median(diff) * 6 + 6).sum()) if len(diff) else 0
    gate("motion", None, f"median change {motion:.1f} a frame (human-made films are often about 4 to 10), about {cuts} hard cuts")

    # Sheets at phone size, one frame a second, with the 9:16 safe area drawn on each tile.
    tw = 270
    vf = f"fps=1,scale={tw}:-2"
    if H > W * 1.5:
        th = round(tw * H / W)
        vf += (f",drawbox=x=0:y=0:w={tw}:h={round(250 / 1920 * th)}:color=red@0.25:t=fill"
               f",drawbox=x=0:y={round(1450 / 1920 * th)}:w={tw}:h={th}:color=red@0.25:t=fill"
               f",drawbox=x={round(940 / 1080 * tw)}:y=0:w={tw}:h={th}:color=red@0.25:t=fill"
               f",drawbox=x=0:y=0:w={round(60 / 1080 * tw)}:h={th}:color=red@0.25:t=fill")
    vf += ",tile=6x3:padding=4:color=white"
    for old in out.glob("sheet_*.jpg"):
        old.unlink()
    run(["ffmpeg", "-v", "error", "-y", "-i", str(film), "-vf", vf, "-q:v", "3", str(out / "sheet_%02d.jpg")])
    run(["ffmpeg", "-v", "error", "-y", "-i", str(film), "-frames:v", "1", "-vf", "scale=360:-2", str(out / "frame0_360.png")])
    # 100% crops: the most detailed 512 px square at a few moments, at full size, to see blocky or pixelated texture.
    for old_c in out.glob("crop_*.png"):
        old_c.unlink()
    cs = min(512, W, H)
    for k, tt in enumerate(np.linspace(0.15, 0.85, 4) * vdur):
        img = frame_rgb(film, float(tt), W, H)
        if img is None:
            continue
        gy = img.mean(axis=2)
        st = max(16, cs // 4)
        best, bx, by = -1.0, 0, 0
        for y in range(0, H - cs + 1, st):
            for x in range(0, W - cs + 1, st):
                d = float(np.abs(np.diff(gy[y:y + cs:4, x:x + cs:4], axis=1)).mean())
                if d > best:
                    best, bx, by = d, x, y
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{tt:.3f}", "-i", str(film), "-frames:v", "1", "-vf",
             f"crop={cs}:{cs}:{bx}:{by}", str(out / f"crop_{k + 1}_{tt:.1f}s.png")])
    failed = [r["gate"] for r in RES if r["ok"] is False]
    (out / "check.json").write_text(json.dumps({"film": str(film), "meta": str(meta_path) if meta else None, "gates": RES, "failed": failed}, indent=1), encoding="utf-8")
    print(("FAILED: " + ", ".join(failed)) if failed else "ALL GATES PASS", f"| sheets and 100% crops in {out}: look at every one (beauty first), then reference/checklist.md")
    sys.exit(1 if failed else 0)


main()
