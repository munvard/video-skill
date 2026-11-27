"""note_check.py: the stranger's six in a delivery note are held against real reels.

    python note_check.py .video/<film>/deliver/NOTE.md

The note has a table with one row per question (Stop, Clarity, Hold, Beauty, Share, Trust):

    | Question | Score | Second | Matches |
    | Stop | 8 | 0.0 s: the finished storm already moving | C04 |

A score of 8 or more must name a hit ID from reference/calibration.md in its row (a flop ID or no ID does not count):
without one, the score is 7 at most. Prints PASS or FAIL per row and exits 1 on any FAIL.
"""
import pathlib
import re
import sys

SIX = ("stop", "clarity", "hold", "beauty", "share", "trust")
CAL = pathlib.Path(__file__).resolve().parents[1] / "reference" / "calibration.md"


def hits():
    """The hit IDs: the first column of the table under '## Hits' in calibration.md."""
    text = CAL.read_text(encoding="utf-8")
    part = text.split("## Hits", 1)[1].split("\n## ", 1)[0]
    return set(re.findall(r"^\|\s*(C\d\d)\s*\|", part, re.M))


def main():
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        sys.exit(__doc__)
    note = pathlib.Path(sys.argv[1])
    ok_ids, rows = hits(), {}
    for line in note.read_text(encoding="utf-8").splitlines():
        cells = [c.strip().strip("*").strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 2 or cells[0].lower() not in SIX:
            continue
        score = next((float(m.group(1)) for c in cells[1:] if (m := re.fullmatch(r"(\d+(?:\.\d+)?)(?:\s*/\s*10)?", c))), None)
        rows[cells[0].lower()] = (score, set(re.findall(r"\bC\d\d\b", " ".join(cells[1:]))))
    bad = 0
    for q in SIX:
        if q not in rows or rows[q][0] is None:
            print(f"FAIL  {q:8} no score row (table: | Question | Score | Second | Matches |)")
            bad += 1
            continue
        score, ids = rows[q]
        named = sorted(ids & ok_ids)
        if score >= 8 and not named:
            print(f"FAIL  {q:8} {score:g} names no hit from reference/calibration.md: 7 at most, or name the hit it matches")
            bad += 1
        else:
            print(f"PASS  {q:8} {score:g}" + (f" (matches {', '.join(named)})" if named else ""))
    print("NOTE SCORES ANCHORED" if not bad else f"FAILED: {bad} of 6")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
