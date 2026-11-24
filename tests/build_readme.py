"""Builds README.md from the style index, so the gallery always matches the cards."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
STYLES = "plugins/video/skills/video/styles"
COLUMNS = 4

HEAD = """<p align="center"><img src="gallery/hero.webp" width="100%" alt="An orange ball travels through many different film worlds and becomes the dot in the word video"></p>

<h3 align="center">Type <code>/video</code>. Get a finished video.</h3>

<p align="center">
A director for Claude Code. It finds the idea, picks or invents the style, builds every frame in code and 3D,<br>
makes the sound, checks its own work, and learns your taste.
</p>

<p align="center">
<a href="#install">Install</a> &nbsp;·&nbsp; <a href="#one-ball-{n}-styles">{n} styles</a> &nbsp;·&nbsp; <a href="#made-to-travel">Made to travel</a> &nbsp;·&nbsp; <a href="#honest-status">Honest status</a> &nbsp;·&nbsp; <a href="#add-a-style">Add a style</a>
</p>

```text
/video
/video a 20 second post about our search
/video something that could go viral for my bakery
/video a love letter to my city, no product
/video learn the style of reference.mp4
```

You never choose from a menu. With no words at all, it looks at your project and starts.

## How it thinks

<p align="center"><img src="gallery/anatomy.webp" width="100%" alt="A request becomes four concepts, one is chosen and improved, planned by frame, built, checked and finished"></p>

- **It looks for an idea before a look.** Four very different concepts, and it throws away every one that would work for any other product.
- **It plans by frame.** What moves, why, how it becomes the next shot, and which sound lands on it.
- **It builds the hardest seconds first**, at final quality, and changes the method if they are not good.
- **It checks like a stranger on a phone.** Frame 0, sound off, every join, every word at 360 px wide, loudness, the loop.
- **It remembers what you said.** Your reactions live in your own project and win over everything here.

## One ball, {n} styles

The same small story, made {n} ways. `/video` can use one, give several of them jobs in one film, invent its own, or ignore the library. Only the cards it needs are loaded, so the library costs your chat almost nothing.
"""

TAIL = """
## Made to travel

Ask for views and it does the thinking before it draws anything: who sends this to whom, the message they type with it, the question that opens before second 2, the turn, ten hooks in five forms, and a score the plan must pass. After you post, it reads your numbers against your own normal and writes down one lesson.

It is built on [what platforms publish and what research found](plugins/video/skills/video/reference/viral.md), with sources. No skill can promise a viral video, and this one will not pretend to.

## Many styles in one film

A film can go through six worlds and still be one film. Each style gets a job, and [one thing never changes](plugins/video/skills/video/reference/mixing.md).

## Install

As a plain skill, called with `/video`:

```bash
git clone https://github.com/munvard/video-skill
mkdir -p ~/.claude/skills && cp -r video-skill/plugins/video/skills/video ~/.claude/skills/video
```

As a plugin, called with `/video:video`, inside Claude Code:

```text
/plugin marketplace add munvard/video-skill
/plugin install video@video-skill
```

It needs Claude Code, ffmpeg and Python 3. It uses Node and Chrome for motion design and Blender for 3D when you have them. A long film is a long, heavy run: it measures the render time and tells you first. It never publishes or spends without your yes.

## What is inside

| Part | What it does |
|---|---|
| [`SKILL.md`](plugins/video/skills/video/SKILL.md) | the director: understand, choose, plan, build, check, deliver, learn |
| [`styles/`](plugins/video/skills/video/styles/index.md) | {n} cards: look, motion, type, sound, tools, hook, and how each one fails |
| [`viral.md`](plugins/video/skills/video/reference/viral.md) | hooks, reasons to send, a score, reading results |
| [`mixing.md`](plugins/video/skills/video/reference/mixing.md) | many styles, one film |
| [`new-style.md`](plugins/video/skills/video/reference/new-style.md) | learn a style from a film without copying it, or invent one |
| [`craft.md`](plugins/video/skills/video/reference/craft.md), [`checklist.md`](plugins/video/skills/video/reference/checklist.md), [`engines.md`](plugins/video/skills/video/reference/engines.md) | story, motion, type, sound, tools, and 13 checks |
| [`check.py`](plugins/video/skills/video/scripts/check.py) | frame sheets, dark stretches, loop seam and loudness of any film |

## Honest status

{proven} styles are **proven**: a finished film that its owner or a few test viewers clearly liked, with no view numbers yet. {studied} are **studied**: measured frame by frame from real work. {draft} are **drafts**: designed from craft knowledge, with the preview above and no full film yet. Each card says which. The previews are short style sketches made in code for this page, and the source that renders them is in [`gallery/src`](gallery/src).

## Add a style

Read [`new-style.md`](plugins/video/skills/video/reference/new-style.md), add a card and a row in the index, then run `python tests/build_readme.py` and `python tests/check_repo.py`. New cards start as drafts. A card needs its own preview, and a person who knows your reference must not call it a copy.

MIT licence. Third-party material is listed in [`gallery/LICENSES.md`](gallery/LICENSES.md).
"""


def main():
    index = (ROOT / STYLES / "index.md").read_text(encoding="utf-8")
    body, count = "", {"proven": 0, "studied": 0, "draft": 0}
    for family in re.split(r"^## ", index, flags=re.M)[1:]:
        title = family.splitlines()[0]
        rows = re.findall(r"^\| \[([^]]+)\]\(([\w-]+)\.md\) \| (\w+) \| ([^|]+) \|", family, re.M)
        body += f"\n### {title}\n\n<table>\n"
        for start in range(0, len(rows), COLUMNS):
            body += "<tr>\n"
            for name, slug, status, feels in rows[start:start + COLUMNS]:
                count[status] += 1
                mark = "" if status == "draft" else f" <sup>{status}</sup>"
                body += (f'<td width="25%" valign="top"><a href="{STYLES}/{slug}.md">'
                         f'<img src="gallery/{slug}.webp" width="100%" alt="{name}"></a><br>'
                         f"<b>{name}</b>{mark}<br><sub>{feels.strip()}</sub></td>\n")
            body += "</tr>\n"
        body += "</table>\n"
    n = sum(count.values())
    head = HEAD.replace("{n}", str(n))
    tail = TAIL.replace("{n}", str(n))
    for key, value in count.items():
        tail = tail.replace("{" + key + "}", str(value))
    (ROOT / "README.md").write_text(head + body + tail, encoding="utf-8", newline="\n")
    print(f"README.md: {n} styles")


main()
