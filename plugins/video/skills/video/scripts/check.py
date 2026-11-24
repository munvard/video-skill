"""check.py: contact sheets, loudness, dark stretches and the loop seam of a video. Needs ffmpeg and ffprobe.

    python check.py film.mp4 out_folder
"""
import json
import pathlib
import re
import subprocess
import sys


def run(args):
    p = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode:
        sys.exit(f"{args[0]} failed: {p.stderr.strip()[-400:]}")
    return p.stdout + p.stderr


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    film, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    if not film.is_file():
        sys.exit(f"no such file: {film}")
    out.mkdir(parents=True, exist_ok=True)
    info = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(film)]))
    video = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        sys.exit("no video stream")
    sound = any(s["codec_type"] == "audio" for s in info["streams"])
    print(f"{video['width']}x{video['height']} {video['r_frame_rate']} fps {float(info['format']['duration']):.2f} s")

    run(["ffmpeg", "-v", "error", "-y", "-i", str(film), "-vf", "fps=2,scale=216:-2,tile=8x5:padding=3:color=red",
         str(out / "sheet_%02d.png")])
    run(["ffmpeg", "-v", "error", "-y", "-i", str(film), "-frames:v", "1", "-vf", "scale=360:-2", str(out / "frame0_360.png")])

    luma = [float(v) for v in re.findall(r"YAVG=([0-9.]+)", run(
        ["ffmpeg", "-v", "error", "-i", str(film), "-vf", "scale=320:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-",
         "-an", "-f", "null", "-"]))]
    n, d = (int(x) for x in video["r_frame_rate"].split("/"))
    fps, start = n / d, None
    for i, value in enumerate(luma + [255.0]):
        if value < 40 and start is None:
            start = i
        elif value >= 40 and start is not None:
            if (i - start) / fps >= 0.5:
                print(f"dark: {start / fps:.2f} to {i / fps:.2f} s")
            start = None

    last = len(luma) - 1
    seam = run(["ffmpeg", "-v", "info", "-i", str(film), "-i", str(film), "-filter_complex",
                f"[0]select=eq(n\\,{last}),setpts=0[a];[1]select=eq(n\\,0),setpts=0[b];[a][b]psnr", "-frames:v", "1", "-an", "-f", "null", "-"])
    m = re.search(r"average:(\S+)", seam)
    print(f"loop seam, last frame against first: {m.group(1) if m else 'not measured'} dB PSNR (higher is closer)")

    if sound:
        s = run(["ffmpeg", "-hide_banner", "-i", str(film), "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"]).split("Summary:")[-1]
        print("loudness", re.search(r"I:\s+(\S+ LUFS)", s).group(1), "true peak", re.search(r"Peak:\s+(\S+ dBFS)", s).group(1))
    else:
        print("no sound track")
    print(f"sheets in {out}: look at every one, then do reference/checklist.md on exact frames")


main()
