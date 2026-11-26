#!/usr/bin/env python3
"""Put the sound on the picture and master it for the feeds.

  python finish.py --video silent.mp4 --audio mix.wav --out film.mp4 [--poster T]
                   [--fade-in 0.05] [--fade-out 0.4] [--loop]

What it does:
  - Loudness: two-pass ffmpeg loudnorm to -14 LUFS integrated, true peak target -1.5 dBTP.
  - Then it MEASURES the true peak of the encoded AAC (AAC adds peaks between samples) and, while it is
    above -1.0 dBTP, encodes the audio again with a lower target (up to 3 times). The picture is copied.
  - AAC 320k with noise substitution (PNS) and intensity stereo off: at 320k they only add peaks
    (measured with ffmpeg 9: a -1.8 dBTP input came out at -0.5 with them, -1.8 without).
  - Picture: H.264 High, CRF 16, yuv420p, bt709 tags, faststart. A film that is already H.264 yuv420p is
    copied as it is, unless --poster is asked.
  - --poster T puts the frame at T seconds in place of frame 0 (so the thumbnail shows a settled frame).
    The frame count stays exact.
  - The audio is padded or trimmed to the length of the picture.
  - --loop: no fades, the end must flow into frame 0.
  - Without --audio it still encodes the picture and warns that the film is silent.
  - It writes to a temporary name and renames at the end, so a failed run never leaves a half file.
Needs ffmpeg and ffprobe 5 or newer on PATH (no option here is newer than ffmpeg 5).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from fractions import Fraction
for _s in (sys.stdout, sys.stderr):  # user and web text (arrows, emoji, any script) on a Windows pipe
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

TARGET_I = -14.0
FIRST_TP = -1.5
MAX_TP = -1.0
RGB_FORMATS = ("rgb", "bgr", "gbr", "argb", "abgr", "rgba", "bgra", "pal8", "gray")


def die(msg: str) -> None:
    print(f"finish.py: {msg}", file=sys.stderr)
    sys.exit(1)


def warn(msg: str) -> None:
    print(f"finish.py: warning: {msg}", file=sys.stderr)


def run(cmd: list, what: str) -> subprocess.CompletedProcess:
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        die(f"ffmpeg failed while {what}:\n{p.stderr.strip()[-1500:]}")
    return p


def probe_video(path: str) -> dict:
    p = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
             "stream=codec_name,pix_fmt,r_frame_rate,avg_frame_rate,nb_read_packets,color_space,width,height",
             "-of", "json", path], f"reading {path}")
    streams = json.loads(p.stdout or "{}").get("streams") or []
    if not streams:
        die(f"no video stream in {path}")
    s = streams[0]
    rate = s.get("r_frame_rate") or s.get("avg_frame_rate") or "0/1"
    fps = Fraction(rate) if rate != "0/0" else Fraction(0)
    if fps <= 0:
        die(f"cannot read the frame rate of {path}")
    frames = int(s.get("nb_read_packets") or 0)
    if frames <= 0:
        die(f"{path} has no frames")
    return dict(codec=s.get("codec_name"), pix_fmt=s.get("pix_fmt") or "", fps=fps, frames=frames,
                color_space=s.get("color_space") or "", dur=float(frames / fps))


def has_audio(path: str) -> bool:
    p = run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_type",
             "-of", "csv=p=0", path], f"reading {path}")
    return bool(p.stdout.strip())


def color_filter(info: dict) -> str:
    """Convert to yuv420p bt709. RGB is converted with the bt709 matrix; yuv tagged as bt601 is converted;
    other yuv keeps its values and only gets the bt709 tags."""
    pf = info["pix_fmt"]
    if pf.startswith(RGB_FORMATS):
        conv = "scale=out_color_matrix=bt709:out_range=tv,"
    elif info["color_space"] in ("bt470bg", "smpte170m"):
        conv = "scale=in_color_matrix=bt601:out_color_matrix=bt709:out_range=tv,"
    else:
        conv = ""
    return conv + "format=yuv420p"


VIDEO_ENC = ["-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
             "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]


def make_picture(video: str, info: dict, poster, tmpdir: str) -> str:
    """Returns a video-only file: the input itself (copied later) or a new H.264 encode."""
    copy_ok = info["codec"] == "h264" and info["pix_fmt"] == "yuv420p" and poster is None
    if copy_ok:
        return video
    out = os.path.join(tmpdir, "picture.mp4")
    fps = info["fps"]
    rate = f"{fps.numerator}/{fps.denominator}"
    cf = color_filter(info)
    if poster is not None:
        if not 0 <= poster < info["dur"]:
            die(f"--poster {poster} is outside the film (0 to {info['dur']:.3f} s)")
        graph = (f"[1:v]trim=end_frame=1,setpts=PTS-STARTPTS[p];"
                 f"[0:v]trim=start_frame=1,setpts=PTS-STARTPTS[r];"
                 f"[p][r]concat=n=2:v=1:a=0,setpts=N/({rate})/TB,{cf}[v]")
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", video, "-ss", f"{poster:.6f}", "-i", video,
               "-filter_complex", graph, "-map", "[v]"]
    else:
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", cf, "-map", "0:v:0"]
    cmd += VIDEO_ENC + ["-r", rate, "-frames:v", str(info["frames"]), "-an", out]
    run(cmd, "encoding the picture")
    got = probe_video(out)["frames"]
    if got != info["frames"]:
        die(f"the encoded picture has {got} frames, the film has {info['frames']}")
    return out


def audio_chain(dur: float, fade_in: float, fade_out: float, loop: bool) -> str:
    n = int(round(dur * 48000))
    parts = ["aresample=48000", "aformat=sample_fmts=fltp:channel_layouts=stereo", "apad",
             f"atrim=end_sample={n}", "asetpts=PTS-STARTPTS"]
    if not loop:
        if fade_in > 0:
            parts.append(f"afade=t=in:st=0:d={fade_in:.4f}")
        if fade_out > 0:
            parts.append(f"afade=t=out:st={max(0.0, dur - fade_out):.4f}:d={min(fade_out, dur):.4f}")
    return ",".join(parts)


def measure_loudnorm(audio: str, chain: str) -> dict:
    p = run(["ffmpeg", "-v", "info", "-nostats", "-hide_banner", "-i", audio, "-af",
             f"{chain},loudnorm=I={TARGET_I}:TP={FIRST_TP}:LRA=20:print_format=json", "-f", "null", "-"],
            "measuring the loudness")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    if not m:
        die("ffmpeg did not print the loudness measurement")
    return json.loads(m.group(0))


def measure_file(path: str):
    """Integrated loudness and true peak of the encoded audio, as ffmpeg's ebur128 meter reads them."""
    p = run(["ffmpeg", "-v", "info", "-nostats", "-hide_banner", "-i", path, "-map", "0:a:0", "-af",
             "ebur128=peak=true", "-f", "null", "-"], "measuring the finished film")
    summary = p.stderr[p.stderr.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+|-inf)\s+LUFS", summary)
    tp = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf)\s+dBFS", summary)
    to_f = lambda m: float(m.group(1)) if m and m.group(1) != "-inf" else float("-inf")  # noqa: E731
    return to_f(i), to_f(tp)


def num(v) -> float:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return float("nan")
    return f


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="finish.py", description="Master the sound and put it on the picture.")
    ap.add_argument("--video", required=True)
    ap.add_argument("--audio")
    ap.add_argument("--out", required=True)
    ap.add_argument("--poster", type=float, help="seconds: this frame replaces frame 0")
    ap.add_argument("--fade-in", type=float, default=0.05)
    ap.add_argument("--fade-out", type=float, default=0.4)
    ap.add_argument("--loop", action="store_true", help="no fades: the end flows into frame 0")
    a = ap.parse_args(argv)

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            die(f"{tool} is not on PATH. Install ffmpeg 5 or newer")
    if not os.path.isfile(a.video):
        die(f"video not found: {a.video}")
    if a.audio and not os.path.isfile(a.audio):
        die(f"audio not found: {a.audio}")
    if os.path.abspath(a.out) in (os.path.abspath(a.video), os.path.abspath(a.audio or "")):
        die("--out must be a new file, not one of the inputs")

    info = probe_video(a.video)
    out_dir = os.path.dirname(os.path.abspath(a.out))
    os.makedirs(out_dir, exist_ok=True)
    ext = os.path.splitext(a.out)[1] or ".mp4"
    with tempfile.TemporaryDirectory(dir=out_dir, prefix=".finish-") as tmp:
        picture = make_picture(a.video, info, a.poster, tmp)
        part = os.path.join(tmp, "film" + ext)
        vmap = ["-map", "0:v:0", "-c:v", "copy"]
        if not a.audio:
            warn("no --audio: the film is silent")
            run(["ffmpeg", "-v", "error", "-y", "-i", picture] + vmap + ["-an", "-movflags", "+faststart", part],
                "writing the film")
            os.replace(part, a.out)
            print(json.dumps({"out": a.out, "frames": info["frames"], "silent": True}))
            return 0
        if not has_audio(a.audio):
            die(f"no audio stream in {a.audio}")

        chain = audio_chain(info["dur"], a.fade_in, a.fade_out, a.loop)
        m = measure_loudnorm(a.audio, chain)
        mi = num(m.get("input_i"))
        silent = not (mi > -70)
        if silent:
            warn("the audio is silent or quieter than -70 LUFS, so it is not normalised")
        tp_target = FIRST_TP
        lufs = peak = float("nan")
        for attempt in range(4):
            if silent:
                af = chain
            else:
                af = (f"{chain},loudnorm=I={TARGET_I}:TP={tp_target:.2f}:LRA=20:measured_I={m['input_i']}:"
                      f"measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
                      f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
                      f"aresample=48000")
            run(["ffmpeg", "-v", "error", "-y", "-i", picture, "-i", a.audio, "-filter_complex", f"[1:a]{af}[a]"]
                + vmap + ["-map", "[a]", "-c:a", "aac", "-b:a", "320k", "-aac_pns", "0", "-aac_is", "0", "-ar", "48000", "-movflags", "+faststart",
                          part], "writing the film")
            lufs, peak = measure_file(part)
            if silent or peak <= MAX_TP:
                break
            if attempt == 3:
                break
            new_target = tp_target - (peak - MAX_TP) - 0.3
            print(f"finish.py: note: true peak {peak:.2f} dBTP after AAC; encoding the audio again with the "
                  f"target at {new_target:.2f}", file=sys.stderr)
            tp_target = new_target
        got = probe_video(part)["frames"]
        if got != info["frames"]:
            die(f"the finished film has {got} frames, the picture has {info['frames']}")
        os.replace(part, a.out)
    rep = {"out": a.out, "frames": info["frames"], "dur": round(info["dur"], 4), "lufs": lufs,
           "true_peak": peak}
    print(json.dumps(rep))
    if not silent and peak > MAX_TP:
        warn(f"the true peak is still {peak:.2f} dBTP after 3 retries; lower the loudest moments of the mix")
        return 1
    if not silent and abs(lufs - TARGET_I) > 1.0:
        warn(f"the loudness is {lufs:.1f} LUFS, more than 1 LU from {TARGET_I}; the mix may be very peaky")
    return 0


if __name__ == "__main__":
    sys.exit(main())
