"""Builds README.md, gallery/README.md and the GitHub Pages site in docs/ from two sources of truth:
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
PAGES = "https://munvard.github.io/video-skill"
COLUMNS = 4

data = json.loads((ROOT / "docs/films/films.json").read_text(encoding="utf-8"))
RELEASE = f"https://github.com/{REPO}/releases/download/{data['release']}"
films = data["films"]
compare = data.get("compare")


def esc(s):
    return html.escape(str(s), quote=True)


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

# ---------- README.md ----------
cells = ""
for i in range(0, len(films), 2):
    cells += "<tr>\n"
    for f in films[i:i + 2]:
        cuts = " and ".join(c["label"] for c in f["cuts"])
        cells += (f'<td width="50%" valign="top"><a href="{PAGES}/films/{f["slug"]}.html">'
                  f'<img src="{f["poster"]}" width="100%" alt="{esc(f["alt"])}"></a><br>'
                  f'<b>{esc(f["title"])}</b>: {esc(f["kind"])}<br>'
                  f'<sub>One prompt, {mins(f)}, {esc(f["model"])}. {cuts}.</sub></td>\n')
    cells += "</tr>\n"

cmp = ""
if compare:
    cmp = f"""
## With and without the skill

The same 15 second brief (five lines of copy, 1920x1080, no voice), given to Claude Code twice in a clean folder:
once with nothing installed, once with `/video`. Same model, one prompt each, no help.
This brief was also used while the skill was built (two of its rules came from an earlier run of it), so read it
as a fair test of the result, not a blind one.

<a href="{PAGES}/films/{compare['slug']}.html"><img src="{compare['poster']}" width="100%" alt="{esc(compare['alt'])}"></a>

| | Without | With `/video` |
|---|---|---|
""" + "".join(f"| {esc(k)} | {esc(a)} | {esc(b)} |\n" for k, a, b in compare["rows"])

readme = f"""<h1 align="center"><code>/video</code></h1>

<p align="center"><b>Launch videos and product videos for your app, made in Claude Code.</b><br>
Advanced motion design and 3D, with sound, checked frame by frame. 9:16 for Reels, Shorts and TikTok, 16:9 for your
site and X.<br>Free and open source (MIT). Runs on your computer. Needs Claude Code.</p>

Every film below was made by this skill from **one prompt** in a clean folder, with no editing by hand. Click one to
watch it with sound and see its prompt, its plan and its gate numbers.

<table>
{cells}</table>
{cmp}
## Install

Inside Claude Code:

```text
/plugin marketplace add {REPO}
/plugin install video@video-skill
```

> **You need**
> - Claude Code, with a Claude plan (Pro, Max, Team or Enterprise) or an API account
> - ffmpeg and Python 3 with numpy
> - Optional: Node 22 and Chrome for motion design, Blender for 3D
>
> The first run checks your tools and tells you what is missing. Everything else is free and runs on your computer:
> no API keys, no paid services.

## Use

```text
/video
/video a 20 second launch post for our search, 9:16
/video a 16:9 hero film for the site, make it 3D
/video learn the style of reference.mp4
```

With no text, in a project folder, it reads the README, the site and the screenshots, and makes that product's launch
film.

## How it works

- **QUICK or STUDIO.** QUICK is one concept and a render in minutes. STUDIO writes four very different concepts, shows
  you stills before it builds (the look gate), and judges the result for beauty before it checks the numbers.
- **Motion design in code.** Film pages in HTML and canvas with measured easing curves, rendered frame by frame in
  headless Chrome, in parallel.
- **Real 3D.** Blender with free CC0 materials, models and light from Poly Haven and ambientCG: EEVEE for most shots,
  Cycles for the hero shots.
- **Sound made in code.** Music on a beat grid, a sound for every event on screen, an optional local voice checked
  word by word, and a master to -14 LUFS.
- **Checked like a viewer on a phone.** `check.py` prints PASS or FAIL with numbers: frame 0 not empty, no dead or
  frozen stretches, the end hold, reading time for every line, text height at 360 px wide, the 9:16 safe area,
  loudness and true peak, the loop seam.
- **It learns your taste.** Your reactions go to `.video/taste.md` in your project and win over its defaults.

## What is inside

| Part | What it does |
|---|---|
| [`SKILL.md`](plugins/video/skills/video/SKILL.md) | the director: understand, choose, plan, look gate, build, check, deliver, learn |
| [`kit/`](plugins/video/skills/video/kit/README.md) | the render engine: a parallel headless Chrome renderer, a 2D canvas kit, a ray tracer |
| [`scripts/`](plugins/video/skills/video/scripts) | `check.py` gates, `sound.py`, `voice.py`, `finish.py`, `assets.py`, `doctor.py`, `study.py`, the Blender kit |
| [`styles/`](gallery/README.md) | {n} style cards, {full} at full depth, with a preview each |
| [`reference/`](plugins/video/skills/video/reference) | craft rules, sound, Blender, engines, the checklist |

## Honest status

- The films above are the proof. Each page shows the exact prompt, the minutes, the model and the plan used.
- Styles: {count['proven']} proven, {count['studied']} studied, {count['draft']} drafts. See the [style library](gallery/README.md).
- Tested on Windows 11 with an AMD GPU. Mac and Linux paths are written but less tested.
- A STUDIO film is a long, heavy run that uses a lot of your Claude plan. QUICK is the cheap path.
- Live-action styles need your own footage. No skill can promise views, and this one will not pretend to.

MIT licence. Borrowed code and its licences: [`NOTICE.md`](plugins/video/skills/video/NOTICE.md). Fonts and gallery
files: [`gallery/LICENSES.md`](gallery/LICENSES.md). Release notes: [`RELEASE_NOTES.md`](RELEASE_NOTES.md).
"""
(ROOT / "README.md").write_text(readme, encoding="utf-8", newline="\n")

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
    f'<div><b>{esc(f["title"])}</b><br><small>{esc(f["kind"])}. One prompt, {mins(f)}.</small></div></a>'
    for f in films + ([compare] if compare else []))
(docs / "index.html").write_text(page("/video: launch videos made in Claude Code", f"""
<h1><code>/video</code></h1>
<p class="sub">Launch videos and product videos for your app, made in Claude Code: motion design and 3D, with sound,
checked frame by frame. Free and open source (MIT). <a href="https://github.com/{REPO}">Get it on GitHub</a>.</p>
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
<h2>The run</h2><table>{facts}</table>
{f'<h2>What it planned</h2><p>{esc(f["plan_note"])}</p>' if f.get("plan_note") else ""}
{f'<h2>Gate numbers</h2><table>{gates}</table>' if gates else ""}
<p><small>Made by the <a href="https://github.com/{REPO}">/video</a> skill in a clean Claude Code session that
saw only this plugin. No frame was edited by hand.</small></p>"""
    (docs / "films" / f"{f['slug']}.html").write_text(page(f["title"], inner, 1), encoding="utf-8", newline="\n")

print(f"README.md, gallery/README.md, docs/: {len(films)} films, {n} styles ({full} full)")
