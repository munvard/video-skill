"""Builds gallery/README.md and the GitHub Pages site in docs/ from two sources of truth:
the style index (plugins/video/skills/video/styles/index.md) and the proof films (docs/films/films.json).

    python tests/build_readme.py

Films are not stored in git: each cut is a file on the GitHub release named in films.json, and the pages play it
from there. Only small posters live in docs/films/media/.
"""
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
STYLES = "plugins/video/skills/video/styles"
REPO = "munvard/video-skill"
COLUMNS = 4

data = json.loads((ROOT / "docs/films/films.json").read_text(encoding="utf-8"))
RELEASE = f"https://github.com/{REPO}/releases/download/{data['release']}"
films = data["films"]
compare = data.get("compare")


def esc(s):
    return html.escape(str(s), quote=True)


def asks(f):
    n = len(f.get("notes", []))
    return "One prompt" + (f" and {n} round{'s' if n > 1 else ''} of notes" if n else "")


def mins(f):
    return f"{f['minutes']:.0f} min" if f["minutes"] >= 10 else f"{f['minutes']:.1f} min"


# ---------- the style gallery (gallery/README.md) ----------
index = (ROOT / STYLES / "index.md").read_text(encoding="utf-8")
count = {"proven": 0, "studied": 0, "draft": 0}
full = 0
body = ""
for family in re.split(r"^## ", index, flags=re.M)[1:]:
    title = family.splitlines()[0]
    rows = re.findall(r"^\| \[([^]]+)\]\(([\w-]+)\.md\)( ★)? \| (\w+) \| ([^|]+) \|", family, re.M)
    if not rows:
        continue
    body += f"\n### {title}\n\n<table>\n"
    for start in range(0, len(rows), COLUMNS):
        body += "<tr>\n"
        for name, slug, star, status, feels in rows[start:start + COLUMNS]:
            count[status] += 1
            full += bool(star)
            mark = (" ★" if star else "") + ("" if status == "draft" else f" <sup>{status}</sup>")
            body += (f'<td width="25%" valign="top"><a href="../{STYLES}/{slug}.md">'
                     f'<img src="{slug}.webp" width="100%" alt="{name}"></a><br>'
                     f"<b>{name}</b>{mark}<br><sub>{feels.strip()}</sub></td>\n")
        body += "</tr>\n"
    body += "</table>\n"
n = sum(count.values())
gallery = f"""# The style library

{n} style cards, {full} of them at full depth (marked ★). `/video` loads only the one or two cards it picks, so the
library costs your chat almost nothing. It can also mix styles, invent one, or work without one.

The previews are short style sketches made in code for this page; the source that renders them is in
[`src`](src). They are not films made by the skill: those are on the [main page](../README.md).

Status: **proven** means a film made by this skill in that style passed every gate and is shown with its prompt.
**studied** means measured from real work with `scripts/study.py`. **draft** means designed from craft knowledge and
not tested in a film yet. Today: {count['proven']} proven, {count['studied']} studied, {count['draft']} drafts.
{body}
Add a style: read [`new-style.md`](../plugins/video/skills/video/reference/new-style.md), add a card and a row in the
index, then run `python tests/build_readme.py` and `python tests/check_repo.py`. New cards start as drafts.

Licences of the fonts and other third-party files used here: [`LICENSES.md`](LICENSES.md).
"""
(ROOT / "gallery/README.md").write_text(gallery, encoding="utf-8", newline="\n")

# README.md is a hand-written launch page now (hero strip, with and without pairs, film gallery): not built here.

# ---------- the Pages site (docs/) ----------
CSS = """body{margin:0;font:17px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;background:#0f1115;color:#e9e6df}
main{max-width:1080px;margin:0 auto;padding:40px 24px 80px}a{color:#ffb27a}h1{font-size:44px;margin:0 0 8px}
.sub{color:#b9b4aa;margin:0 0 32px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
.card{background:#181b21;border-radius:14px;overflow:hidden;text-decoration:none;color:inherit}
.card img{width:100%;display:block}.card div{padding:14px 16px}.cuts{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}
video{background:#000;border-radius:12px;max-width:100%}.v916{width:340px}.v169{width:680px}
pre{white-space:pre-wrap;background:#181b21;padding:16px;border-radius:10px}table{border-collapse:collapse}
td,th{border-bottom:1px solid #2a2e36;padding:6px 14px 6px 0;text-align:left}"""


def page(title, inner, depth=0):
    up = "../" * depth
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" '
            f'content="width=device-width,initial-scale=1"><title>{esc(title)}</title>'
            f'<link rel="stylesheet" href="{up}style.css"></head><body><main>{inner}</main></body></html>\n')


docs = ROOT / "docs"
(docs / "films").mkdir(parents=True, exist_ok=True)
(docs / "style.css").write_text(CSS + "\n", encoding="utf-8", newline="\n")
grid = "".join(
    f'<a class="card" href="films/{f["slug"]}.html"><img src="{f["poster"].removeprefix("docs/")}" alt="{esc(f["alt"])}">'
    f'<div><b>{esc(f["title"])}</b><br><small>{esc(f["kind"])}. {asks(f)}, {mins(f)}.</small></div></a>'
    for f in films + ([compare] if compare else []))
(docs / "index.html").write_text(page("/video: launch videos made in Claude Code", f"""
<h1><code>/video</code></h1>
<p class="sub">Launch videos and product videos for your app, made in Claude Code: motion design and 3D, with sound,
checked frame by frame. Open source, MIT. <a href="https://github.com/{REPO}">Get it on GitHub</a>.</p>
<div class="grid">{grid}</div>"""), encoding="utf-8", newline="\n")

for f in films + ([compare] if compare else []):
    vids = "".join(
        f'<figure><video class="{"v916" if c["h"] > c["w"] else "v169"}" controls playsinline preload="metadata" '
        f'poster="../{f["poster"].removeprefix("docs/")}" src="{RELEASE}/{c["file"]}"></video><figcaption>{esc(c["label"])}, '
        f'{c["w"]}x{c["h"]}, {c["dur"]:.1f} s</figcaption></figure>' for c in f["cuts"])
    gates = "".join(f"<tr><td>{esc(k)}</td><td>{esc(v)}</td></tr>" for k, v in f.get("gates", {}).items())
    facts = "".join(f"<tr><td>{esc(k)}</td><td>{esc(v)}</td></tr>" for k, v in (
        ("Model", f["model"]), ("Plan", f["plan"]), ("Mode", f.get("mode", "")), ("Minutes, prompt to file", mins(f)),
        ("Input", f.get("input", "")), ("Skill version", f.get("commit", ""))) if v)
    inner = f"""<p><a href="../index.html">All films</a></p><h1>{esc(f['title'])}</h1>
<p class="sub">{esc(f['about'])}</p><div class="cuts">{vids}</div>
<h2>The prompt</h2><pre>{esc(f['prompt'])}</pre>
{"".join(f"<h2>Notes after the first cut</h2><pre>{esc(n)}</pre>" for n in f.get("notes", []))}
<h2>The run</h2><table>{facts}</table>
{f'<h2>What it planned</h2><p>{esc(f["plan_note"])}</p>' if f.get("plan_note") else ""}
{f'<h2>Gate numbers</h2><table>{gates}</table>' if gates else ""}
<p><small>Made by the <a href="https://github.com/{REPO}">/video</a> skill in a clean Claude Code session that
saw only this plugin. No frame was edited by hand.</small></p>"""
    (docs / "films" / f"{f['slug']}.html").write_text(page(f["title"], inner, 1), encoding="utf-8", newline="\n")

print(f"gallery/README.md, docs/: {len(films)} films, {n} styles ({full} full)")
