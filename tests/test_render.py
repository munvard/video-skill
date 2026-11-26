"""The kit renders a film page to a video with meta, stills and PNG frames. Skips when Node 22+ or Chrome is missing.

    python -m unittest tests.test_render -v
"""
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "plugins/video/skills/video/kit"


def node_ok():
    try:
        v = subprocess.run(["node", "--version"], capture_output=True, text=True).stdout
        return int(v.strip().lstrip("v").split(".")[0]) >= 22
    except (OSError, ValueError):
        return False


def frames(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames,width,height",
                          "-of", "json", str(path)], capture_output=True, text=True).stdout
    s = json.loads(out)["streams"][0]
    return int(s["nb_read_frames"]), int(s["width"]), int(s["height"])


PAGE = """<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/kit/fonts.css"><script src="/kit/kit.js"></script>
<style>html,body{margin:0;background:#123}#t{position:absolute;left:60px;right:140px;top:600px;text-align:center;font:800 96px Inter;color:#fff}</style>
<div id="t" data-say="hook">Hello there</div>
<script>window.DUR=2;window.FPS=30;window.SIZE=[540,960];window.EV=[{t:0.5,type:'hit'}];window.TEXTS=domTexts;
window.render=t=>{document.body.style.background=mix('#203080','#802030',t/2);document.getElementById('t').style.transform=`translateY(${mv(t,0,1,40,0,'snapSettle')}px)`;window.R=Math.random();};</script>"""


@unittest.skipUnless(node_ok() and shutil.which("ffmpeg"), "needs Node 22+ and ffmpeg")
class Render(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "film.html").write_text(PAGE, encoding="utf-8")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def render(self, *a):
        p = subprocess.run(["node", str(KIT / "render.mjs"), *a], capture_output=True, text=True, timeout=300)
        self.assertEqual(p.returncode, 0, p.stderr + p.stdout)
        return p

    def test_video_meta_and_workers(self):
        out = self.tmp / "out/film.mp4"
        self.render(str(self.tmp / "film.html"), "--out", str(out), "--workers", "2")
        self.assertEqual(frames(out), (60, 540, 960))
        meta = json.loads((self.tmp / "out/film.meta.json").read_text(encoding="utf-8"))
        self.assertEqual(meta["frames"], 60)
        self.assertEqual(meta["events"][0]["type"], "hit")
        hook = next(t for t in meta["texts"] if t["id"] == "hook")
        self.assertEqual(hook["text"], "Hello there")
        self.assertTrue(hook["full"])
        self.assertAlmostEqual(hook["run"], 2.0, delta=0.05)
        self.assertEqual(hook["px"], 96)
        self.assertFalse(list((self.tmp / "out").glob("*.lock")))

    def test_part_and_stills(self):
        out = self.tmp / "part.mp4"
        self.render(str(self.tmp / "film.html"), "--out", str(out), "--from", "0.5", "--to", "1.5", "--stills", "0,1", "--still-dir", str(self.tmp / "st"))
        self.assertEqual(frames(out)[0], 30)
        self.assertEqual(len(list((self.tmp / "st").glob("*.png"))), 2)

    def test_scene_mode_png(self):
        scene = self.tmp / "s.js"
        scene.write_text("scene({dur:1, fps:10, w:200, h:200, blur:2, draw(c,t){c.fillStyle='#f60';c.fillRect(0,0,200,200);say(c,'x','HI',100,120,60);}});", encoding="utf-8")
        self.render("--scene", str(scene), "--png-dir", str(self.tmp / "png"), "--every", "5")
        self.assertEqual(sorted(p.name for p in (self.tmp / "png").glob("*.png")), ["0000.png", "0005.png"])
        self.assertEqual(json.loads((self.tmp / "png/info.json").read_text())["n"], 10)

    def test_bad_page_fails_clearly(self):
        (self.tmp / "bad.html").write_text("<script>window.DUR=1</script>", encoding="utf-8")
        before = set(Path(tempfile.gettempdir()).glob("vs-chrome-*"))
        p = subprocess.run(["node", str(KIT / "render.mjs"), str(self.tmp / "bad.html"), "--out", str(self.tmp / "b.mp4")], capture_output=True, text=True, timeout=120)
        self.assertNotEqual(p.returncode, 0)
        self.assertIn("render(t)", p.stderr)
        left = set(Path(tempfile.gettempdir()).glob("vs-chrome-*")) - before
        self.assertEqual(left, set(), "a failed render must remove its Chrome profile")


if __name__ == "__main__":
    unittest.main()
