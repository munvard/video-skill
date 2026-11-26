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
    p = subprocess.run([sys.executable, str(SCRIPTS / "check.py"), str(film), *a], capture_output=True, text=True, encoding="utf-8", timeout=300)
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

    def test_frame0_soft_opener(self):
        # A soft but settled 3 s opener, then a very crisp end: frame 0 passes (it is as sharp as its own shot).
        # The same film starting on 0.5 s of heavy blur fails (frame 0 caught mid-blur).
        soft = "testsrc2=s=540x960:r=30:d=3,gblur=sigma=0.8"  # about 35% of the end's sharpness
        crisp = "testsrc2=s=540x960:r=30:d=3"
        ok = self.tmp / "soft_open.mp4"
        ff("-f", "lavfi", "-i", soft, "-f", "lavfi", "-i", crisp, "-filter_complex", "[0][1]concat=n=2:v=1[v]",
           "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(ok))
        self.assertEqual(check(ok, str(self.tmp / "c9"))[1]["frame0"], "PASS")
        bad = self.tmp / "blur_open.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=s=540x960:r=30:d=0.5,gblur=sigma=25", "-f", "lavfi", "-i", soft,
           "-f", "lavfi", "-i", crisp, "-filter_complex", "[0][1][2]concat=n=3:v=1[v]",
           "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(bad))
        self.assertEqual(check(bad, str(self.tmp / "c10"))[1]["frame0"], "FAIL")

    def test_slab(self):
        # A moving pattern with a flat navy panel over its top half for 3 s: slab fails; the plain pattern passes.
        film = self.tmp / "slab.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=s=540x960:r=30:d=3", "-vf", "drawbox=x=0:y=0:w=540:h=480:color=0x1e2a5a:t=fill",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", str(film))
        self.assertEqual(check(film, str(self.tmp / "c5"))[1]["slab"], "FAIL")
        self.assertEqual(check(self.good, str(self.tmp / "c6"))[1]["slab"], "PASS")

    def test_band(self):
        # 9:16 with a moving pattern in the top 40% and a flat colour below: band fails.
        film = self.tmp / "band.mp4"
        ff("-f", "lavfi", "-i", "testsrc2=s=540x960:r=30:d=3", "-vf", "drawbox=x=0:y=384:w=540:h=576:color=0xe8dcc8:t=fill",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", str(film))
        self.assertEqual(check(film, str(self.tmp / "c7"))[1]["band"], "FAIL")
        self.assertEqual(check(self.good, str(self.tmp / "c8"))[1]["band"], "PASS")

    def test_contrast(self):
        # "Letters" (bars) in a text box: pale teal on teal fails, white on navy passes.
        def film(name, bg, fg):
            f = self.tmp / f"{name}.mp4"
            bars = ",".join(f"drawbox=x={100 + i * 40}:y=400:w=20:h=80:color=0x{fg}:t=fill" for i in range(8))
            ff("-f", "lavfi", "-i", f"color=c=0x{bg}:s=540x960:r=30:d=2", "-vf", bars, "-c:v", "libx264", "-pix_fmt", "yuv420p", str(f))
            meta = {"w": 540, "h": 960, "fps": 30, "dur": 2, "frames": 60, "events": [], "texts": [
                {"id": "a", "text": "Stay out", "t0": 0, "t1": 2, "run": 2, "full": True, "pass": False, "px": 80,
                 "box": [90, 390, 430, 490], "boxm": [90, 390, 430, 490], "tm": 1.0, "colors": [f"#{fg}"]}]}
            (self.tmp / f"{name}.meta.json").write_text(json.dumps(meta), encoding="utf-8")
            return check(f, str(self.tmp / f"c_{name}"), "--meta", str(self.tmp / f"{name}.meta.json"))
        code, g, out = film("lowc", "3c8c96", "96bec8")
        self.assertEqual(g["contrast"], "FAIL", out)
        code, g, out = film("highc", "142850", "ffffff")
        self.assertEqual(g["contrast"], "PASS", out)

    def test_overlap(self):
        meta = {"w": 540, "h": 960, "fps": 30, "dur": 4, "frames": 120, "events": [], "texts": [
            {"id": "a", "text": "Fixed rows", "t0": 0, "t1": 3, "run": 3, "full": True, "pass": False, "px": 60, "box": [100, 300, 440, 380]},
            {"id": "b", "text": "Added rows", "t0": 1, "t1": 4, "run": 3, "full": True, "pass": False, "px": 60, "box": [120, 320, 460, 400]}]}
        mp = self.tmp / "ov.meta.json"
        mp.write_text(json.dumps(meta), encoding="utf-8")
        self.assertEqual(check(self.good, str(self.tmp / "c9"), "--meta", str(mp))[1]["overlap"], "FAIL")

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

    def test_any_script_in_texts(self):
        # Text outside cp1252 (an arrow, an emoji, Armenian, CJK) must not crash check.py on a Windows pipe.
        line = "Try it → now ✨ Բարև 你好"
        meta = {"w": 540, "h": 960, "fps": 30, "dur": 4, "frames": 120, "events": [], "texts": [
            {"id": "a", "text": line, "t0": 0, "t1": 4, "run": 4, "full": True, "px": 60, "box": [60, 300, 480, 370]}]}
        mp = self.tmp / "u.meta.json"
        mp.write_text(json.dumps(meta), encoding="utf-8")
        code, g, out = check(self.good, str(self.tmp / "c11"), "--meta", str(mp))
        self.assertIn(code, (0, 1), out)
        self.assertNotIn("Traceback", out)
        self.assertTrue((self.tmp / "c11/check.json").exists(), out)

    def test_hook_gate(self):
        # A 9:16 reel that cuts at 1 s and 2 s passes the hook with --reel; one long take with no cut fails it there,
        # and without --reel the hook only reports (INFO).
        a, b = "testsrc2=s=540x960:r=30:d=1", "testsrc2=s=540x960:r=30:d=1,negate"
        reel = self.tmp / "reel.mp4"
        ff("-f", "lavfi", "-i", a, "-f", "lavfi", "-i", b, "-f", "lavfi", "-i", a, "-f", "lavfi", "-i", b,
           "-filter_complex", "[0][1][2][3]concat=n=4:v=1[v]", "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(reel))
        self.assertEqual(check(reel, str(self.tmp / "c12"), "--reel")[1]["hook"], "PASS")
        self.assertEqual(check(self.good, str(self.tmp / "c13"), "--reel")[1]["hook"], "FAIL")
        self.assertEqual(check(self.good, str(self.tmp / "c14"))[1]["hook"], "INFO")

    def test_hook_pace(self):
        # After the hook a reel keeps 4 to 7 big changes per 10 s: a 10 s reel that cuts every 2 s passes, one that
        # flips four times a second fails with --reel.
        src = "testsrc2=s=540x960:r=30:d=10"
        calm, frantic = self.tmp / "calm.mp4", self.tmp / "frantic.mp4"
        ff("-f", "lavfi", "-i", src, "-vf", "negate=enable='between(t,1,2)+between(t,3,5)+between(t,7,9)'",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", str(calm))
        ff("-f", "lavfi", "-i", src, "-vf", "negate=enable='between(t,1,2)+gte(t,3)*lt(mod(t,0.5),0.25)'",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", str(frantic))
        self.assertEqual(check(calm, str(self.tmp / "c15"), "--reel")[1]["hook"], "PASS")
        code, g, out = check(frantic, str(self.tmp / "c16"), "--reel")
        self.assertEqual(g["hook"], "FAIL", out)

    def test_output_first(self):
        # Craft rule 10: a tool showcase opens on its output, never on the input. A reel that opens on a dark terminal
        # being typed fails frame 0; the same terminal shown after the output (at 3 s) passes frame 0 and the hook.
        out_src = "testsrc2=s=540x960:r=30"
        typing = ("color=c=0x1a1a1a:s=540x960:r=30:d={d}", "[{n}:v][{m}:v]overlay=x='min(40,-420+t*600)':y=520:shortest=1")
        bar = ("-f", "lavfi", "-i", "color=c=white:s=460x120:r=30")
        first = self.tmp / "input_first.mp4"
        ff("-f", "lavfi", "-i", typing[0].format(d=1.4), *bar, "-f", "lavfi", "-i", out_src + ":d=4", "-filter_complex",
           typing[1].format(n=0, m=1) + "[a];[2:v]negate=enable='between(t,0.8,1.4)'[b];[a][b]concat=n=2:v=1[v]",
           "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(first))
        later = self.tmp / "output_first.mp4"
        ff("-f", "lavfi", "-i", out_src + ":d=3", "-f", "lavfi", "-i", typing[0].format(d=1), *bar, "-f", "lavfi",
           "-i", out_src + ":d=2", "-filter_complex",
           "[0:v]negate=enable='between(t,1,1.5)'[a];" + typing[1].format(n=1, m=2) + "[t];[a][t][3:v]concat=n=3:v=1[v]",
           "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(later))
        code, g, out = check(first, str(self.tmp / "c17"), "--reel")
        self.assertEqual(g["frame0"], "FAIL", out)
        code, g, out = check(later, str(self.tmp / "c18"), "--reel")
        self.assertEqual((g["frame0"], g["hook"]), ("PASS", "PASS"), out)

    def test_hookread(self):
        # A reel with no meta: white hook words on a pale, busy-free background are unreadable (FAIL); the same words on
        # a dark bed pass; a wide white area with no words (a sky, a flower) is not taken for words (INFO).
        strokes = ",".join(f"drawbox=x={60 + 22 * i}:y=200:w=8:h=110:color=white:t=fill" for i in range(18))
        cases = {"pale": ("0xa8b894", strokes, "FAIL"), "dark": ("0x1c2633", strokes, "PASS"),
                 "sky": ("0xa8b894", "drawbox=x=100:y=180:w=320:h=220:color=white:t=fill", "INFO")}
        own = self.tmp / "hookread"  # its own folder: another test's meta.json next to the film would skip the gate
        own.mkdir(exist_ok=True)
        for i, (name, (bg, draw, want)) in enumerate(cases.items()):
            film = own / f"hook_{name}.mp4"
            ff("-f", "lavfi", "-i", f"color=c={bg}:s=540x960:r=30:d=2", "-vf", draw, "-c:v", "libx264", "-pix_fmt",
               "yuv420p", str(film))
            code, g, out = check(film, str(own / f"c{i}"), "--reel")
            self.assertEqual(g["hookread"], want, f"{name}: {out}")

    def test_loop_gate(self):
        code, g, out = check(self.good, str(self.tmp / "c4"), "--loop")
        self.assertEqual(g["loop"], "FAIL", out)

    def test_study(self):
        p = subprocess.run([sys.executable, str(SCRIPTS / "study.py"), str(self.bad), str(self.tmp / "st")], capture_output=True, text=True, encoding="utf-8", timeout=300)
        self.assertEqual(p.returncode, 0, p.stderr)
        s = json.loads((self.tmp / "st/study.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(s["shots"]["count"], 2)
        self.assertAlmostEqual(s["seconds"], 4.0, delta=0.1)

    def test_doctor_runs(self):
        p = subprocess.run([sys.executable, str(SCRIPTS / "doctor.py")], capture_output=True, text=True, encoding="utf-8", timeout=120)
        self.assertIn("ffmpeg", p.stdout)


if __name__ == "__main__":
    unittest.main()
