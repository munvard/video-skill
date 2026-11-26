"""Tests for the Blender tier: scripts/assets.py, scripts/blender/kit3d.py and shot_example.py.

Run from the repo root:  python -m unittest tests.test_blender -v
Blender tests skip cleanly when Blender is not found (BLENDER env var, PATH, usual install folders).
Network tests skip when offline.
"""
import glob
import importlib.util
import json
import os
import pathlib
import shutil
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "plugins/video/skills/video/scripts"
KIT = SCRIPTS / "blender"
SHOT = KIT / "shot_example.py"


def find_blender():
    env = os.environ.get("BLENDER")
    if env and os.path.isfile(env):
        return env
    found = shutil.which("blender")
    if found:
        return found
    home = pathlib.Path.home()
    patterns = [
        "C:/Program Files/Blender Foundation/Blender*/blender.exe",
        str(home / "AppData/Local/Programs/Blender Foundation/Blender*/blender.exe"),
        str(home / "Tools/blender/*/blender.exe"),
        "/Applications/Blender.app/Contents/MacOS/Blender",
        str(home / "Applications/Blender.app/Contents/MacOS/Blender"),
        "/usr/bin/blender", "/usr/local/bin/blender", "/snap/bin/blender",
    ]
    for pattern in patterns:
        hits = sorted(glob.glob(pattern))
        if hits:
            return hits[-1]
    return None


BLENDER = find_blender()


def load_assets():
    spec = importlib.util.spec_from_file_location("assets", SCRIPTS / "assets.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def blender(*args, cwd=None, timeout=900):
    cmd = [BLENDER, "-b", "--factory-startup", "--python-exit-code", "1", *args]
    return subprocess.run(cmd, check=False, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace",
                          timeout=timeout)


STATS = """
import sys, json, bpy, numpy as np
out = {}
for f in sys.argv[sys.argv.index("--") + 1:]:
    im = bpy.data.images.load(f)
    w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[:, :, :3]
    out[f] = [float(a.mean()), float(a.std()), w, h]
print("STATS " + json.dumps(out))
"""


@unittest.skipUnless(BLENDER, "Blender not found (set BLENDER to its path)")
class BlenderTier(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="video-skill-blender-")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def run_shot(self, out, *extra):
        return blender("-P", str(SHOT), "--", "--engine", "eevee", "--frames", "1,2,3", "--res", "0.1",
                       "--out", out, "--assets", os.path.join(self.tmp, "assets"), *extra, cwd=self.tmp)

    def test_kit_imports(self):
        code = (f"import sys; sys.path.insert(0, {str(KIT)!r}); import kit3d as K; "
                "print('KIT_OK', K.ease(0.5), K.hexc('#ffffff'), K.gpu())")
        r = blender("--python-expr", code)
        self.assertEqual(r.returncode, 0, r.stdout[-2000:] + r.stderr[-2000:])
        self.assertIn("KIT_OK 0.5 (1.0, 1.0, 1.0)", r.stdout)
        self.assertIn("kit3d: gpu", r.stdout)

    def test_handheld_without_aim_keys(self):
        # handheld drift must work when only the camera position is keyed (no "aim" in start and end).
        code = (f"import sys; sys.path.insert(0, {str(KIT)!r}); import kit3d as K; K.reset(); "
                "cam = K.camera((0, -6, 1.5), (0, 0, 1)); "
                "K.move(cam, 1, 30, {'loc': (0, -6, 1.5)}, {'loc': (1, -5, 1.6)}, handheld=0.002); "
                "aim = cam.constraints[0].target; "
                "n = sum(len(fc.modifiers) for fc in K.fcurves(aim) if fc.data_path == 'location'); "
                "print('HANDHELD_MODS', n)")
        r = blender("--python-expr", code)
        self.assertEqual(r.returncode, 0, r.stdout[-2000:] + r.stderr[-2000:])
        self.assertIn("HANDHELD_MODS 3", r.stdout)

    def test_shot_renders_three_frames(self):
        out = os.path.join(self.tmp, "frames")
        r = self.run_shot(out)
        self.assertEqual(r.returncode, 0, r.stdout[-3000:] + r.stderr[-2000:])
        pngs = [os.path.join(out, f"f{f:04d}.png") for f in (1, 2, 3)]
        for p in pngs:
            self.assertTrue(os.path.isfile(p), p)
        self.assertTrue(os.path.isfile(os.path.join(out, ".done")))
        self.assertEqual(json.loads(pathlib.Path(out, ".shot.json").read_text(encoding="utf-8"))["kind"], "test")
        script = os.path.join(self.tmp, "stats.py")
        pathlib.Path(script).write_text(STATS, encoding="utf-8")
        s = blender("-P", script, "--", *pngs)
        line = next(x for x in s.stdout.splitlines() if x.startswith("STATS "))
        for p, (mean, std, w, h) in json.loads(line[6:]).items():
            self.assertEqual((w, h), (108, 192), p)
            self.assertGreater(mean, 0.15, f"{p} is too dark: mean {mean:.3f}")
            self.assertGreater(std, 0.05, f"{p} is flat or blank: std {std:.3f}")

    def test_one_render_per_folder(self):
        busy = os.path.join(self.tmp, "busy")
        os.makedirs(busy)
        pathlib.Path(busy, ".lock").write_text(str(os.getpid()), encoding="utf-8")  # this test process is alive
        r = self.run_shot(busy, "--builtin")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("is already rendering in process", r.stdout + r.stderr)
        self.assertFalse(any(f.endswith(".png") for f in os.listdir(busy)))
        stale = os.path.join(self.tmp, "stale")
        os.makedirs(stale)
        pathlib.Path(stale, ".lock").write_text("999999", encoding="utf-8")  # a process that is gone
        pathlib.Path(stale, ".f0002.part.png").write_bytes(b"half")  # a frame cut off mid-write
        r = self.run_shot(stale, "--builtin")
        self.assertEqual(r.returncode, 0, r.stdout[-3000:] + r.stderr[-2000:])
        names = sorted(os.listdir(stale))
        self.assertEqual([n for n in names if n.endswith(".png")], ["f0001.png", "f0002.png", "f0003.png"])
        self.assertNotIn(".lock", names)

    def test_output_refuses_wrong_folder(self):
        final = os.path.join(self.tmp, "final")
        os.makedirs(final)
        pathlib.Path(final, "f0001.png").write_bytes(b"x")
        pathlib.Path(final, ".shot.json").write_text(json.dumps({"shot": "example_hero", "kind": "final"}), encoding="utf-8")
        r = self.run_shot(final, "--builtin")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("test renders and final frames never share a folder", r.stdout + r.stderr)
        other = os.path.join(self.tmp, "other")
        os.makedirs(other)
        pathlib.Path(other, "f0001.png").write_bytes(b"x")
        r = self.run_shot(other, "--builtin")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("unknown shot", r.stdout + r.stderr)


class Assets(unittest.TestCase):
    def test_credit_lines(self):
        assets = load_assets()
        tmp = tempfile.mkdtemp(prefix="video-skill-assets-")
        try:
            meta = {"source": "Poly Haven", "id": "x_1", "name": "X 1", "author": "Someone",
                    "url": "https://polyhaven.com/a/x_1"}
            assets.credit(tmp, meta)
            assets.credit(tmp, meta)
            text = pathlib.Path(tmp, "CREDITS.md").read_text(encoding="utf-8")
            self.assertEqual(text.count("https://polyhaven.com/a/x_1"), 1)
            self.assertIn("licence CC0 1.0", text)
            self.assertIn("Powered by Poly Haven", text)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_search_returns_results(self):
        assets = load_assets()
        try:
            rows = assets.search("hdri", "studio", 3)
        except assets.Offline as e:
            self.skipTest(f"offline: {e}")
        self.assertTrue(rows)
        self.assertTrue(all(r["source"] == "polyhaven" and r["id"] and r["url"] for r in rows))


if __name__ == "__main__":
    unittest.main()
