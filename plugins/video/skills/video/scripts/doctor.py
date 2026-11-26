"""doctor.py: says which tools this computer has for /video and how to add the missing ones. It installs nothing.

    python doctor.py          (on a Mac: python3 doctor.py)

Needed:   ffmpeg and ffprobe, Python 3.10+ with numpy (or uv, which brings numpy when a script runs).
For HTML films (most films): Node 22+ and Chrome, Chromium or Edge.
Optional: Blender 4.2+ (professional 3D), kokoro-onnx and faster-whisper (a voice; uv fetches them on first use).
"""
import os
import platform
import re
import shutil
import subprocess
import sys
from pathlib import Path
for _s in (sys.stdout, sys.stderr):  # user and web text (arrows, emoji, any script) on a Windows pipe
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

OS = platform.system()  # Windows, Darwin, Linux
HINT = {
    "ffmpeg": {"Windows": "winget install Gyan.FFmpeg", "Darwin": "brew install ffmpeg", "Linux": "sudo apt install ffmpeg (or your distro's package)"},
    "node": {"Windows": "winget install OpenJS.NodeJS.LTS", "Darwin": "brew install node", "Linux": "install Node 22 LTS from nodejs.org or your package manager"},
    "chrome": {"Windows": "Edge is built in; or winget install Google.Chrome", "Darwin": "install Google Chrome from google.com/chrome", "Linux": "sudo apt install chromium (or google-chrome-stable)"},
    "uv": {"Windows": "winget install astral-sh.uv", "Darwin": "brew install uv", "Linux": "curl -LsSf https://astral.sh/uv/install.sh | sh"},
    "numpy": {"Windows": "py -m pip install numpy (or use uv)", "Darwin": "python3 -m pip install numpy (or use uv)", "Linux": "python3 -m pip install numpy (or use uv)"},
    "blender": {"Windows": "winget install BlenderFoundation.Blender, or set BLENDER to blender.exe", "Darwin": "brew install --cask blender, or set BLENDER", "Linux": "download from blender.org and set BLENDER to its path"},
}
rows = []


def version(cmd, args=("--version",)):
    try:
        p = subprocess.run([cmd, *args], capture_output=True, text=True, timeout=30)
        return (p.stdout or p.stderr).strip().splitlines()[0] if (p.stdout or p.stderr) else "?"
    except (OSError, subprocess.TimeoutExpired):
        return None


def row(name, ok, have, need, key=None, optional=False):
    rows.append((name, ok, have, need, HINT.get(key or name, {}).get(OS, ""), optional))


def find_chrome():
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    home = Path.home()
    la, pf, pf86 = os.environ.get("LOCALAPPDATA", ""), os.environ.get("ProgramFiles", ""), os.environ.get("ProgramFiles(x86)", "")
    c = [Path(la) / "Google/Chrome/Application/chrome.exe", Path(pf) / "Google/Chrome/Application/chrome.exe", Path(pf86) / "Google/Chrome/Application/chrome.exe",
         Path(pf86) / "Microsoft/Edge/Application/msedge.exe", Path(pf) / "Microsoft/Edge/Application/msedge.exe",
         Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"), Path("/Applications/Chromium.app/Contents/MacOS/Chromium"),
         Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge")]
    for pw in (Path(la) / "ms-playwright", home / "Library/Caches/ms-playwright", home / ".cache/ms-playwright"):
        if pw.is_dir():
            c += sorted(pw.glob("chromium*/*/chrome*"), reverse=True)
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"):
        if shutil.which(name):
            c.append(Path(shutil.which(name)))
    c.append(Path("/snap/bin/chromium"))
    return next((str(p) for p in c if str(p) and p.is_file()), None)


def find_blender():
    if os.environ.get("BLENDER") and Path(os.environ["BLENDER"]).is_file():
        return os.environ["BLENDER"]
    if shutil.which("blender"):
        return shutil.which("blender")
    c = [Path("/Applications/Blender.app/Contents/MacOS/Blender")]
    for base in (os.environ.get("ProgramFiles", ""), str(Path.home() / "Tools/blender"), str(Path.home() / "blender")):
        if base and Path(base).is_dir():
            c += sorted(Path(base).glob("**/blender.exe"), reverse=True)[:3]
            c += sorted(Path(base).glob("Blender Foundation/*/blender.exe"), reverse=True)
    return next((str(p) for p in c if p.is_file()), None)


def main():
    py = sys.version_info
    row("python", py >= (3, 10), f"{py.major}.{py.minor}", "3.10+")
    try:
        import numpy  # noqa: F401
        row("numpy", True, numpy.__version__, "any")
    except ImportError:
        row("numpy", bool(shutil.which("uv")), "missing" + (" (uv will bring it)" if shutil.which("uv") else ""), "any")
    row("uv", bool(shutil.which("uv")), version("uv") or "missing", "optional, makes Python tools one command", optional=True)
    for tool in ("ffmpeg", "ffprobe"):
        v = version(tool, ("-version",))
        m = re.search(r"version (\S+)", v or "")
        row(tool, v is not None, m.group(1) if m else (v or "missing"), "5 or newer", key="ffmpeg")
    nv = version("node")
    major = int(re.search(r"v(\d+)", nv).group(1)) if nv and re.search(r"v(\d+)", nv) else 0
    row("node", major >= 22, nv or "missing", "22+ (HTML films)", key="node")
    ch = find_chrome()
    row("chrome", bool(ch), ch or "missing", "Chrome, Chromium or Edge (HTML films)")
    bl = find_blender()
    row("blender", bool(bl), (version(bl) or bl) if bl else "missing", "4.2+ (professional 3D)", optional=True)
    free = shutil.disk_usage(Path.cwd()).free / 1e9
    row("disk", free >= 10, f"{free:.0f} GB free here", "10 GB+ for frames and renders")

    print(f"/video doctor on {OS} {platform.release()} ({platform.machine()})\n")
    for name, ok, have, need, hint, optional in rows:
        mark = "ok  " if ok else ("opt " if optional else "MISS")
        print(f"{mark} {name:8} {have}   (needs {need})" + ("" if ok or not hint else f"\n          add it: {hint}"))
    missing = [r[0] for r in rows if not r[1] and not r[5]]
    print("\n" + ("Everything needed is here." if not missing else "Missing: " + ", ".join(missing) + ". The film can still be planned; rendering needs them."))
    if OS == "Darwin":
        print("On a Mac, run the scripts with python3 (there is no python command by default).")
    sys.exit(1 if missing else 0)


main()
