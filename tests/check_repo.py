"""Repo checks: every style card is complete and in the index, links work, no long dashes, the README media stays small,
and nothing private is in any tracked file or commit message.

    python tests/check_repo.py

The privacy gate reads a local, uncommitted deny list: tests/pii_terms.local.txt (one regular expression per line,
case ignored, lines starting with # are comments). Optional tests/pii_allow.local.txt: lines "term|path glob" that
allow one listed term in matching files (for example a product the owner chose to show). Without a deny list the gate
says it was skipped; the maintainer always runs it with the list before a push.
"""
import fnmatch
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKILL = ROOT / "plugins/video/skills/video"
PARTS = ["Use it for", "Not for", "Look", "Motion", "Type", "Sound", "Build with", "Hook", "It fails when"]
DEEP = ["## The world", "## Camera grammar", "## Three ways to shape it", "## Signature moves", "## Build notes", "## Make it yours"]
README_MEDIA_MAX = 4.5e6
problems = []


def fail(msg):
    problems.append(msg)


index = (SKILL / "styles/index.md").read_text(encoding="utf-8")
rows = re.findall(r"^\| \[[^]]+\]\(([\w-]+\.md)\)( ★)? \| (proven|studied|draft) \|", index, re.M)
cards = {p.name: p.read_text(encoding="utf-8") for p in (SKILL / "styles").glob("*.md") if p.name != "index.md"}
names = [r[0] for r in rows]
if len(names) != len(set(names)) or set(names) != set(cards):
    fail(f"index and cards differ: {set(names) ^ set(cards)}")
deep = 0
for name, star, status in rows:
    text = cards.get(name, "")
    if f"Status: {status}." not in text:
        fail(f"{name}: status in index is {status}")
    if not all(f"**{part}:**" in text for part in PARTS):
        fail(f"{name}: missing one of the nine parts")
    words = len(text.split())
    if "Depth: full." in text:
        deep += 1
        if not star:
            fail(f"{name}: full card without a star in the index")
        if not all(h in text for h in DEEP):
            fail(f"{name}: a full card needs {DEEP}")
        if words > 900:
            fail(f"{name}: {words} words, full cards stay under 900")
    elif words > 180:
        fail(f"{name}: {words} words, short cards stay under 180")
    if status == "proven" and "docs/films/" not in text:
        fail(f"{name}: proven needs a link to its film page in docs/films/")
if deep < 12:
    fail(f"only {deep} full-depth cards, 12 expected")

tracked = subprocess.run(["git", "ls-files", "-co", "--exclude-standard"], cwd=ROOT, capture_output=True, text=True).stdout.split("\n")
tracked = [ROOT / t for t in tracked if t and (ROOT / t).is_file()]
text_ext = {".md", ".py", ".js", ".mjs", ".html", ".css", ".json", ".txt", ".yml", ".yaml", ".toml", ".gitignore", ".gitattributes", ".svg", ""}
texts = {}
for p in tracked:
    if p.suffix.lower() in text_ext or p.name.startswith("."):
        try:
            texts[p] = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            pass

for p, text in texts.items():
    if re.search("[\u2013\u2014]", text):
        fail(f"long dash in {p.relative_to(ROOT)}")
    if p.suffix == ".md":
        for link in re.findall(r"\]\(([^)#:]+\.(?:md|html|png|jpg|webp|gif|mp4))\)", text):
            if not (p.parent / link).exists():
                fail(f"broken link in {p.relative_to(ROOT)}: {link}")

readme = (ROOT / "README.md").read_text(encoding="utf-8")
media = 0
for src in set(re.findall(r'(?:src|href)="([^"#:]+)"', readme) + re.findall(r"!\[[^\]]*\]\(([^)#:]+)\)", readme)):
    f = ROOT / src
    if not f.exists():
        fail(f"README points to a missing file: {src}")
    elif f.suffix.lower() in (".webp", ".png", ".jpg", ".jpeg", ".gif", ".mp4", ".svg"):
        media += f.stat().st_size
if media > README_MEDIA_MAX:
    fail(f"README media is {media / 1e6:.1f} MB, keep it under {README_MEDIA_MAX / 1e6:.1f} MB")

skill_md = (SKILL / "SKILL.md").read_text(encoding="utf-8")
for ref in re.findall(r"`(?:SK/)?((?:reference|styles|scripts|kit)/[\w./-]+\.\w+)`", skill_md):
    if not (SKILL / ref).exists():
        fail(f"SKILL.md names a missing file: {ref}")

deny_file, allow_file = ROOT / "tests/pii_terms.local.txt", ROOT / "tests/pii_allow.local.txt"
if deny_file.exists():
    terms = [ln.strip() for ln in deny_file.read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")]
    allow = [ln.split("|", 1) for ln in allow_file.read_text(encoding="utf-8").splitlines() if "|" in ln] if allow_file.exists() else []
    pats = [(t, re.compile(t, re.I)) for t in terms]
    rel = lambda p: p.relative_to(ROOT).as_posix()
    for p, text in texts.items():
        if p.name.endswith(".local.txt"):
            continue
        for t, rx in pats:
            if rx.search(text) and not any(a == t and fnmatch.fnmatch(rel(p), g) for a, g in allow):
                fail(f"privacy: '{t}' found in {rel(p)}")
    for p in tracked:
        if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".ttf", ".woff2"):
            raw = " ".join(re.findall(r"[A-Za-z0-9 ._/:@\-]{8,}", p.read_bytes().decode("latin-1")))
            for t, rx in pats:
                if rx.search(raw):
                    fail(f"privacy: '{t}' found inside {rel(p)} (metadata?)")
    log = subprocess.run(["git", "log", "--all", "--format=%an %ae %cn %ce %B"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8").stdout
    for t, rx in pats:
        if rx.search(log):
            fail(f"privacy: '{t}' found in a commit message or identity")
    privacy = f"privacy gate on {len(terms)} terms"
else:
    privacy = "privacy gate SKIPPED (no tests/pii_terms.local.txt)"

if problems:
    print("\n".join("FAIL " + p for p in problems))
    sys.exit(1)
print(f"ok: {len(cards)} styles ({deep} full), README media {media / 1e6:.2f} MB, {privacy}")
