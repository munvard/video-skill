"""scripts/note_check.py holds a delivery note's stranger's six against reference/calibration.md.

    python -m unittest tests.test_note_check -v
"""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/video/skills/video/scripts/note_check.py"
HEAD = "| Question | Score | Second | Matches |\n|---|---|---|---|\n"


def run(rows):
    with tempfile.TemporaryDirectory() as d:
        note = Path(d) / "NOTE.md"
        note.write_text("# Note\n\n" + HEAD + "".join(f"| {q} | {s} | {sec} | {m} |\n" for q, s, sec, m in rows),
                        encoding="utf-8")
        p = subprocess.run([sys.executable, str(SCRIPT), str(note)], capture_output=True, text=True, encoding="utf-8")
        return p.returncode, p.stdout


SIX = ["Stop", "Clarity", "Hold", "Beauty", "Share", "Trust"]


class NoteCheck(unittest.TestCase):
    def test_sevens_need_no_reference(self):
        code, out = run([(q, 7, "1.0 s", "") for q in SIX])
        self.assertEqual(code, 0, out)

    def test_eight_without_a_hit_fails(self):
        # The duck note: 8/9/8/8/8/9 with no reel named. A blind judge gave it 6/8/6/7/6/7.
        rows = [(q, s, "0.0 s", "") for q, s in zip(SIX, (8, 9, 8, 8, 8, 9))]
        code, out = run(rows)
        self.assertEqual(code, 1, out)
        self.assertEqual(out.count("FAIL  "), 6, out)

    def test_eight_with_a_hit_passes_and_a_flop_does_not_count(self):
        rows: list[tuple] = [(q, 7, "1.0 s", "") for q in SIX]
        rows[0] = ("Stop", 8, "0.0 s: finished 3D already moving", "C04")
        rows[4] = ("Share", "8/10", "0.8 s: default versus /video", "C10, like C08")
        code, out = run(rows)
        self.assertEqual(code, 0, out)
        rows[1] = ("Clarity", 9, "0.0 s: the toggle", "C01")  # C01 is a flop
        code, out = run(rows)
        self.assertEqual(code, 1, out)
        self.assertIn("FAIL  clarity", out)

    def test_missing_rows_fail(self):
        code, out = run([(q, 6, "1 s", "") for q in SIX[:4]])
        self.assertEqual(code, 1, out)
        self.assertIn("FAIL  share", out)


if __name__ == "__main__":
    unittest.main()
