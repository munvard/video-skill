"""Tests for the sound scripts (music, effects, mix, finish, voice).

    uv run --with numpy python -m unittest tests.test_sound -v

The finish tests need ffmpeg on PATH. The voice test runs only when kokoro-onnx and faster-whisper can be
imported (it downloads models), so the suite runs offline.
"""

import importlib.util
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ROOT, "plugins", "video", "skills", "video", "scripts")
sys.path.insert(0, SCRIPTS)
import sound  # noqa: E402

SR = sound.SR
HAVE_FFMPEG = bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))


def run_script(name, *args):
    return subprocess.run([sys.executable, os.path.join(SCRIPTS, name), *args], capture_output=True, text=True)


def ebur128(path):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-map", "0:a:0", "-af",
                        "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    s = p.stderr[p.stderr.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+)\s+LUFS", s).group(1))
    tp = float(re.search(r"True peak:\s+Peak:\s+(-?[\d.]+)\s+dBFS", s).group(1))
    return i, tp


def frame_count(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                        "stream=nb_read_packets", "-of", "csv=p=0", path], capture_output=True, text=True)
    return int(p.stdout.strip())


class TestGrid(unittest.TestCase):
    def test_grid_math(self):
        g = sound.make_grid(120, 4.0)
        self.assertEqual(g["beats"], [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0])
        self.assertEqual(g["bars"], [0.0, 2.0, 4.0])
        self.assertAlmostEqual(g["bar"], 2.0)
        g3 = sound.make_grid(90, 5.0, 3)
        self.assertAlmostEqual(g3["beat"], 60 / 90, places=6)
        self.assertEqual(len(g3["bars"]), len(g3["beats"][::3]))

    def test_grid_cli(self):
        p = run_script("sound.py", "grid", "--bpm", "120", "--dur", "20")
        self.assertEqual(p.returncode, 0, p.stderr)
        g = json.loads(p.stdout)
        self.assertEqual(len(g["beats"]), 41)
        self.assertEqual(g["bars"][:3], [0.0, 2.0, 4.0])


class TestMusic(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.y, cls.grid, cls.stems, cls.kicks = sound.render_music(
            8.0, 120, "A minor", "bright-pop", None, 4.0, 3, False, stems=True)

    def test_length_exact(self):
        self.assertEqual(self.y.shape, (8 * SR, 2))

    def test_peak_and_not_silent(self):
        self.assertLess(float(np.abs(self.y).max()), 10 ** (-0.9 / 20))  # under -0.9 dBFS
        self.assertGreater(sound.lufs(self.y), -20)
        self.assertLess(abs(float(self.y.mean())), 1e-3)  # no DC

    def test_clean_end(self):
        self.assertEqual(float(np.abs(self.y[-1]).max()), 0.0)
        self.assertLess(float(np.abs(self.y[-480:]).max()), 0.02)

    def test_no_clicks(self):
        self.assertEqual(sound.click_count(self.y), 0)

    def test_peak_on_bar(self):
        self.assertAlmostEqual(self.grid["peak"], 4.0, places=3)  # 4.0 s is bar 2 at 120 bpm

    def test_drums_on_grid(self):
        kick = self.stems["kick"].mean(axis=1)
        beats = np.arange(0, 8.0001, self.grid["beat"] / 4)  # the 16th-note grid
        errs = []
        for kt in self.kicks:
            i0 = int(round(kt * SR))
            if i0 >= len(kick):
                continue
            before = float(np.abs(kick[max(0, i0 - 288) : max(0, i0 - 48)]).max(initial=0.0))
            seg = np.abs(kick[max(0, i0 - 240) : i0 + 480])
            rise = before + 0.1 * (float(seg.max()) - before)
            on = int(np.argmax(seg > rise)) + max(0, i0 - 240)
            errs.append(abs(on / SR - beats[np.argmin(np.abs(beats - kt))]))
        self.assertTrue(errs)
        self.assertLess(max(errs), 0.001)

    def test_grid_file_and_loop(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "m.wav")
            p = run_script("sound.py", "music", "--out", out, "--dur", "4", "--bpm", "120", "--mood", "minimal-tech",
                           "--loop")
            self.assertEqual(p.returncode, 0, p.stderr)
            y = sound.read_audio(out)
            self.assertEqual(len(y), 4 * SR)
            with open(out + ".grid.json", encoding="utf-8") as f:
                g = json.load(f)
            self.assertEqual(g["bars"], [0.0, 2.0, 4.0])
            self.assertTrue(g["loop"])
            # the seam: the jump from the last sample to the first is like any other step
            step = float(np.abs(y[0] - y[-1]).max())
            self.assertLess(step, 6 * float(np.percentile(np.abs(np.diff(y, axis=0)), 99.9)) + 1e-6)


class TestSfx(unittest.TestCase):
    def test_hit_on_time(self):
        meta = {"dur": 3.0, "events": [{"t": 1.25, "type": "hit"}]}
        y, _ = sound.render_sfx(meta)
        self.assertEqual(len(y), 3 * SR)
        m = np.abs(y).max(axis=1)
        on = int(np.argmax(m > 0.1 * m.max())) / SR
        self.assertLess(abs(on - 1.25), 0.010)
        self.assertLess(float(m[: int(1.2 * SR)].max()), 1e-6)

    def test_every_type_and_unknown(self):
        types = list(sound.SFX_LEVEL) + ["laser"]
        meta = {"dur": len(types) * 0.8 + 2, "events": [{"t": 0.5 + i * 0.8, "type": t, "gain": 0.8, "pan": 0.3}
                                                       for i, t in enumerate(types)]}
        y, placed = sound.render_sfx(meta, "C major", 2)
        self.assertEqual(len(placed), len(types))
        self.assertLess(float(np.abs(y).max()), 10 ** (-0.9 / 20))
        for ev in meta["events"]:  # every event makes sound near its time
            i = int(ev["t"] * SR)
            self.assertGreater(float(np.abs(y[max(0, i - 2 * SR) : i + SR // 2]).max()), 1e-3, ev["type"])

    def test_repeats_differ(self):
        meta = {"dur": 3.0, "events": [{"t": 0.5, "type": "pop"}, {"t": 1.5, "type": "pop"}]}
        y, _ = sound.render_sfx(meta)
        a, b = y[int(0.5 * SR) : int(0.6 * SR)], y[int(1.5 * SR) : int(1.6 * SR)]
        self.assertGreater(float(np.abs(a - b).max()), 1e-3)


class TestMix(unittest.TestCase):
    def test_music_ducks_under_voice(self):
        rng = np.random.default_rng(1)
        n = 6 * SR
        music = sound.filt(rng.standard_normal((n, 2)), "lp", 400) * 0.2  # low band only
        voice = np.zeros((n, 2))
        t = np.arange(2 * SR) / SR
        burst = np.sin(2 * math.pi * 2000 * t) * (0.6 + 0.4 * np.sin(2 * math.pi * 4 * t))  # high band only
        voice[2 * SR : 4 * SR] = burst[:, None] * 0.3
        out, rep = sound.render_mix(music, None, voice, 8.0)
        low = sound.filt(out, "lp", 600)

        def db(x):
            return 10 * math.log10(float(np.mean(x * x)))

        under = db(low[int(0.5 * SR) : int(1.5 * SR)]) - db(low[int(2.6 * SR) : int(3.4 * SR)])
        self.assertGreater(under, 6.5)
        self.assertLess(under, 9.5)
        self.assertLessEqual(float(np.abs(out).max()), 10 ** (-1 / 20) + 1e-9)
        self.assertIn("voice_over_bed_db_median", rep)

    def test_effects_under_voice(self):
        n = 4 * SR
        t = np.arange(n) / SR
        voice = np.zeros((n, 2))
        voice[SR : 3 * SR, 0] = voice[SR : 3 * SR, 1] = 0.3 * np.sin(2 * math.pi * 220 * t[SR : 3 * SR])
        sfx = np.zeros((n, 2))
        sfx[:, 0] = sfx[:, 1] = 0.3 * np.sin(2 * math.pi * 3000 * t)  # as loud as the voice
        out, _ = sound.render_mix(None, sfx, voice)
        hi = sound.filt(out, "hp", 1500)
        lo = sound.filt(out, "lp", 600)
        seg = slice(int(1.5 * SR), int(2.5 * SR))
        gap = 10 * math.log10(float(np.mean(lo[seg] ** 2)) / float(np.mean(hi[seg] ** 2)))
        self.assertGreater(gap, 8.5)


class TestMeters(unittest.TestCase):
    @unittest.skipUnless(HAVE_FFMPEG, "ffmpeg not installed")
    def test_lufs_matches_ffmpeg(self):
        y, _ = sound.render_music(6.0, 110, "D major", "playful-pluck", seed=5)
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "a.wav")
            sound.write_wav(p, y)
            i, tp = ebur128(p)
        self.assertLess(abs(sound.lufs(y) - i), 0.5)
        self.assertLess(abs(sound.true_peak_db(y) - tp), 0.5)


@unittest.skipUnless(HAVE_FFMPEG, "ffmpeg not installed")
class TestFinish(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        cls.video = os.path.join(cls.dir, "silent.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=180x320:rate=30:duration=4",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", cls.video], check=True)
        cls.audio = os.path.join(cls.dir, "mix.wav")
        y, _ = sound.render_music(4.0, 120, "A minor", "bright-pop", seed=2)
        sound.write_wav(cls.audio, y)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.dir, ignore_errors=True)

    def finish(self, name, *extra):
        out = os.path.join(self.dir, name)
        p = run_script("finish.py", "--video", self.video, "--audio", self.audio, "--out", out, *extra)
        self.assertEqual(p.returncode, 0, p.stderr)
        return out, json.loads(p.stdout.strip().splitlines()[-1])

    def test_loudness_and_true_peak(self):
        out, rep = self.finish("film.mp4")
        i, tp = ebur128(out)
        self.assertLess(abs(i + 14), 1.0)
        self.assertLessEqual(tp, -1.0)
        self.assertEqual(frame_count(out), 120)
        self.assertEqual(rep["frames"], 120)

    def test_poster_keeps_frame_count(self):
        out, _ = self.finish("poster.mp4", "--poster", "2.0")
        self.assertEqual(frame_count(out), 120)
        _, tp = ebur128(out)
        self.assertLessEqual(tp, -1.0)

    def test_loop_and_silent(self):
        out, _ = self.finish("loop.mp4", "--loop")
        self.assertEqual(frame_count(out), 120)
        silent = os.path.join(self.dir, "silent_out.mp4")
        p = run_script("finish.py", "--video", self.video, "--out", silent)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn("silent", p.stderr)
        self.assertEqual(frame_count(silent), 120)
        self.assertFalse([f for f in os.listdir(self.dir) if f.startswith(".finish-")])  # no temp left


HAVE_VOICE = all(importlib.util.find_spec(m) for m in ("kokoro_onnx", "faster_whisper"))


@unittest.skipUnless(HAVE_VOICE, "kokoro-onnx and faster-whisper are not installed")
class TestVoice(unittest.TestCase):
    def test_two_lines_pass_the_word_check(self):
        with tempfile.TemporaryDirectory() as d:
            lines = os.path.join(d, "lines.json")
            with open(lines, "w", encoding="utf-8") as f:
                json.dump([{"t": 0.3, "text": "Meet the new way to make films."},
                           {"t": 2.5, "text": "It takes three minutes."}], f)
            out = os.path.join(d, "voice.wav")
            p = run_script("voice.py", "say", "--lines", lines, "--out", out)
            self.assertEqual(p.returncode, 0, p.stderr)
            with open(out + ".words.json", encoding="utf-8") as f:
                words = json.load(f)["words"]
            self.assertEqual([w["word"] for w in words][:2], ["Meet", "the"])
            self.assertEqual(len(words), 11)


if __name__ == "__main__":
    unittest.main()
