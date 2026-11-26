"""study.py: measure a reference video, so a style can be learned from numbers and not from guesses.

    python study.py ref.mp4 [out_folder]       (uv run --with numpy python study.py ref.mp4)

Prints and writes out_folder/study.json and study.md:
  shots       every cut, the shot lengths (median, shortest, longest) and how even they are (CV; under 0.25 feels mechanical)
  still       share of the film where the picture barely moves (held frames), and the longest hold
  motion      motion energy per second (mean frame change), so you can see where it builds and where it rests
  brightness  mean luma and colourfulness per second: the light plan of the film
  type        height of the biggest text-like shapes at 360 px wide, sampled every second (a rough measure, check by eye)
  sound       loudness, true peak, and the beat (tempo guess from sound onsets) when the file has sound
  sheet       one frame a second at phone size (study_sheet_*.jpg) to look at
Learn the timing, the method and the light. Never copy shots, words, layout, characters, sound or brand.
"""
import json
import pathlib
import re
import subprocess
import sys
for _s in (sys.stdout, sys.stderr):  # user and web text (arrows, emoji, any script) on a Windows pipe
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

try:
    import numpy as np
except ImportError:
    sys.exit("study.py needs numpy: run it as  uv run --with numpy python study.py ref.mp4")


def run(args, binary=False):
    p = subprocess.run(args, capture_output=True, text=not binary, **({} if binary else {"encoding": "utf-8", "errors": "replace"}))
    if p.returncode:
        sys.exit(f"{args[0]} failed: {(p.stderr if not binary else p.stderr.decode(errors='replace'))[-400:]}")
    return p.stdout if binary else p.stdout + p.stderr


def frames(film, w, h, fmt="gray", ch=1):
    a = np.frombuffer(run(["ffmpeg", "-v", "error", "-i", str(film), "-vf", f"scale={w}:{h}:flags=area,format={fmt}", "-f", "rawvideo", "-"], binary=True), np.uint8)
    return a[: a.size // (w * h * ch) * w * h * ch].reshape(-1, h, w, ch).astype(np.float32)


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        sys.exit(__doc__)
    film = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else film.parent / (film.stem + "_study")
    out.mkdir(parents=True, exist_ok=True)
    info = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(film)]))
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    has_sound = any(s["codec_type"] == "audio" for s in info["streams"])
    W, H = int(v["width"]), int(v["height"])
    n, d = (int(x) for x in v["r_frame_rate"].split("/"))
    fps = n / d
    aw = 96
    ah = max(2, round(aw * H / W / 2) * 2)
    rgb = frames(film, aw, ah, "rgb24", 3)
    g = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    nf = len(g)
    dur = nf / fps
    diff = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2)) if nf > 1 else np.zeros(0)
    # A cut: a big jump against the frames around it, and the picture is a different picture (low correlation).
    cuts = []
    for i in range(1, nf):
        dd = diff[i - 1]
        local = np.median(diff[max(0, i - 6): i + 5]) if len(diff) else 0
        if dd > 12 or (dd > 5 and dd > 3 * local):
            a, b = g[i - 1].ravel() - g[i - 1].mean(), g[i].ravel() - g[i].mean()
            corr = float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-6))
            if corr < 0.6 and (not cuts or i - cuts[-1] > 3):
                cuts.append(i)
    bounds = [0, *cuts, nf]
    shots = np.diff(bounds) / fps
    cv = float(shots.std() / shots.mean()) if len(shots) > 1 else 0.0
    still = diff < 0.35
    longest, cur = 0, 0
    for x in still:
        cur = cur + 1 if x else 0
        longest = max(longest, cur)
    per_sec = []
    for s in range(int(np.ceil(dur))):
        a, b = int(s * fps), min(nf, int((s + 1) * fps))
        if a >= b:
            break
        seg = rgb[a:b]
        mx, mn = seg.max(axis=3), seg.min(axis=3)
        per_sec.append({"t": s, "motion": round(float(diff[a:max(a + 1, b - 1)].mean()) if len(diff) else 0, 2),
                        "luma": round(float(g[a:b].mean()), 1), "colour": round(float((mx - mn).mean()), 1)})
    # Type: on a 360 px wide frame each second, find rows of strong horizontal edges and estimate the tallest line height.
    tw = 360
    th = max(2, round(tw * H / W / 2) * 2)
    big = run(["ffmpeg", "-v", "error", "-i", str(film), "-vf", f"fps=1,scale={tw}:{th}:flags=area,format=gray", "-f", "rawvideo", "-"], binary=True)
    bf = np.frombuffer(big, np.uint8)
    bf = bf[: bf.size // (tw * th) * tw * th].reshape(-1, th, tw).astype(np.float32)
    type_px = []
    for f in bf:
        e = np.abs(np.diff(f, axis=1)) > 60
        rows = e.sum(axis=1) > tw * 0.04
        best, cur = 0, 0
        for r in rows:
            cur = cur + 1 if r else 0
            best = max(best, cur)
        type_px.append(int(best))
    sound = None
    if has_sound:
        s = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(film), "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"]).split("Summary:")[-1]
        li = re.search(r"I:\s+(\S+) LUFS", s)
        tp = re.search(r"Peak:\s+(\S+) dBFS", s)
        pcm = np.frombuffer(run(["ffmpeg", "-v", "error", "-i", str(film), "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], binary=True), np.int16).astype(np.float32)
        hop = 80
        env = np.sqrt(np.convolve(pcm ** 2, np.ones(hop) / hop, "same")[::hop] + 1e-9)
        flux = np.maximum(0, np.diff(np.log(env + 1)))
        bpm = None
        if len(flux) > 400:
            ac = np.correlate(flux - flux.mean(), flux - flux.mean(), "full")[len(flux) - 1:]
            lo, hi = int(100 * 60 / 180), int(100 * 60 / 70)
            lag = lo + int(np.argmax(ac[lo:hi]))
            bpm = round(60 * 100 / lag, 1)
        sound = {"lufs": li.group(1) if li else None, "true_peak": tp.group(1) if tp else None, "tempo_guess_bpm": bpm}
    res = {"file": film.name, "size": [W, H], "fps": round(fps, 3), "seconds": round(dur, 2), "cuts_at_s": [round(c / fps, 2) for c in cuts],
           "shots": {"count": len(shots), "median_s": round(float(np.median(shots)), 2), "shortest_s": round(float(shots.min()), 2),
                     "longest_s": round(float(shots.max()), 2), "cv": round(cv, 2)},
           "still": {"share": round(float(still.mean()) if len(still) else 0, 2), "longest_s": round(longest / fps, 2)},
           "motion_median": round(float(np.median(diff)) if len(diff) else 0, 2), "per_second": per_sec,
           "type_tallest_px_at_360": type_px, "sound": sound}
    (out / "study.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    run(["ffmpeg", "-v", "error", "-y", "-i", str(film), "-vf", "fps=1,scale=240:-2,tile=8x4:padding=3:color=white", "-q:v", "3", str(out / "study_sheet_%02d.jpg")])
    lines = [f"# Study of {film.name}", "", f"{W}x{H}, {fps:g} fps, {dur:.1f} s. {len(shots)} shots: median {res['shots']['median_s']} s, "
             f"from {res['shots']['shortest_s']} to {res['shots']['longest_s']} s, CV {res['shots']['cv']}.",
             f"Held frames: {res['still']['share'] * 100:.0f}% of the film, longest hold {res['still']['longest_s']} s. Median motion {res['motion_median']} a frame.",
             f"Tallest text-like line per second at 360 px: {type_px}.", f"Sound: {sound}." if sound else "No sound.", "",
             "| s | motion | luma | colour |", "|---|---|---|---|"] + [f"| {p['t']} | {p['motion']} | {p['luma']} | {p['colour']} |" for p in per_sec]
    (out / "study.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines[:6]))
    print(f"written: {out / 'study.json'}, {out / 'study.md'}, study_sheet_*.jpg")


main()
