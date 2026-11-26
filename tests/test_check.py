"""The gates in scripts/check.py catch what they claim, on films made with ffmpeg. Also doctor.py and study.py run.

    uv run --with numpy python -m unittest tests.test_check -v
"""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "plugins/video/skills/video/scripts"


def ff(*a):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)


def check(film, *a):
    p = subprocess.run([sys.executable, str(SCRIPTS / "check.py"), str(film), *a], capture_output=True, text=True, timeout=300)
    gates = {line.split()[1]: line.split()[0] for line in p.stdout.splitlines() if line[:4] in ("PASS", "FAIL", "INFO")}
    return p.returncode, gates, p.stdout


@unittest.skipUnless(shutil.which("ffmpeg"), "needs ffmpeg")
class Gates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        # A moving, bright, loud-enough 9:16 film: a test pattern that scrolls, with a tone mastered near -14 LUFS.
        cls.good = cls.tmp / "good.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=s=540x960:r=30:d=4", "-f", "lavfi", "-i", "sine=f=220:d=4:sample_rate=48000",
           "-af", "volume=-11dB", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(cls.good))
        # Black for 1 s in the middle, then frozen for 2 s at the end, silent.
        cls.bad = cls.tmp / "bad.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=s=540x960:r=30:d=1", "-f", "lavfi", "-i", "color=c=black:s=540x960:r=30:d=1",
           "-f", "lavfi", "-i", "color=c=0x3366aa:s=540x960:r=30:d=2",
           "-filter_complex", "[0][1][2]concat=n=3:v=1[v]", "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(cls.bad))

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_good_film_passes_numbers(self):
        code, g, out = check(self.good, str(self.tmp / "c1"))
        for name in ("format", "frame0", "empty", "dead", "endhold", "dark"):
            self.assertEqual(g[name], "PASS", out)
        self.assertTrue((self.tmp / "c1/sheet_01.jpg").exists())
        self.assertTrue((self.tmp / "c1/check.json").exists())

    def test_bad_film_fails(self):
        code, g, out = check(self.bad, str(self.tmp / "c2"))
        self.assertEqual(code, 1)
        for name in ("empty", "endhold", "loudness"):
            self.assertEqual(g[name], "FAIL", out)

    def test_slab(self):
        # A moving pattern with a flat navy panel over its top half for 3 s: slab fails; the plain pattern passes.
        film = self.tmp / "slab.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=s=540x960:r=30:d=3", "-vf", "drawbox=x=0:y=0:w=540:h=480:color=0x1e2a5a:t=fill",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", str(film))
        self.assertEqual(check(film, str(self.tmp / "c5"))[1]["slab"], "FAIL")
        self.assertEqual(check(self.good, str(self.tmp / "c6"))[1]["slab"], "PASS")

    def test_meta_gates(self):
        meta = {"w": 540, "h": 960, "fps": 30, "dur": 4, "frames": 120, "events": [], "texts": [
            {"id": "a", "text": "Fine line here", "t0": 0, "t1": 4, "run": 4, "full": True, "px": 60, "box": [40, 200, 460, 270]},
            {"id": "b", "text": "far too short to read in time", "t0": 1, "t1": 1.5, "run": 0.5, "full": True, "px": 10, "box": [300, 900, 530, 920]}]}
        mp = self.tmp / "m.meta.json"
        mp.write_text(json.dumps(meta), encoding="utf-8")
        code, g, out = check(self.good, str(self.tmp / "c3"), "--meta", str(mp))
        self.assertEqual(g["reading"], "FAIL", out)
        self.assertEqual(g["textsize"], "FAIL", out)
        self.assertEqual(g["safearea"], "FAIL", out)
        self.assertIn("far too short", out)

    def test_loop_gate(self):
        code, g, out = check(self.good, str(self.tmp / "c4"), "--loop")
        self.assertEqual(g["loop"], "FAIL", out)

    def test_study(self):
        p = subprocess.run([sys.executable, str(SCRIPTS / "study.py"), str(self.bad), str(self.tmp / "st")], capture_output=True, text=True, timeout=300)
        self.assertEqual(p.returncode, 0, p.stderr)
        s = json.loads((self.tmp / "st/study.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(s["shots"]["count"], 2)
        self.assertAlmostEqual(s["seconds"], 4.0, delta=0.1)

    def test_doctor_runs(self):
        p = subprocess.run([sys.executable, str(SCRIPTS / "doctor.py")], capture_output=True, text=True, timeout=120)
        self.assertIn("ffmpeg", p.stdout)


if __name__ == "__main__":
    unittest.main()
