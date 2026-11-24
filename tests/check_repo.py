"""Every style card is complete and in the index, every link works, no long dashes."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKILL = ROOT / "plugins/video/skills/video"
PARTS = ["Use it for", "Not for", "Look", "Motion", "Type", "Sound", "Build with", "Hook", "It fails when"]
index = (SKILL / "styles/index.md").read_text(encoding="utf-8")
rows = re.findall(r"^\| \[[^]]+\]\(([\w-]+\.md)\) \| (proven|studied|draft) \|", index, re.M)
cards = {p.name: p.read_text(encoding="utf-8") for p in (SKILL / "styles").glob("*.md") if p.name != "index.md"}
assert len(rows) == len(dict(rows)) and set(dict(rows)) == set(cards), set(dict(rows)) ^ set(cards)
for name, status in rows:
    assert f"Status: {status}." in cards[name], name
    assert all(f"**{part}:**" in cards[name] for part in PARTS), name
    assert len(cards[name].split()) <= 180, name
for path in ROOT.rglob("*.md"):
    text = path.read_text(encoding="utf-8")
    assert not re.search("[\u2013\u2014]", text), path
    for link in re.findall(r"\]\(([^)#:]+\.md)\)", text):
        assert (path.parent / link).exists(), (path, link)
readme = (ROOT / "README.md").read_text(encoding="utf-8")
assert f"One ball, {len(cards)} styles" in readme
for src in re.findall(r'(?:src|href)="([^"#:]+)"', readme):
    assert (ROOT / src).exists(), src
for ref in re.findall(r"`((?:reference|styles|scripts)/[\w./-]+\.\w+)`", (SKILL / "SKILL.md").read_text(encoding="utf-8")):
    assert (SKILL / ref).exists(), ref
print(f"ok: {len(cards)} styles")
