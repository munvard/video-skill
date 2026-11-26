# video

A Claude Code skill for launch videos and product videos: motion design and 3D, sound made in code, and every frame
checked like a viewer on a phone. 9:16 for Reels, Shorts and TikTok, 16:9 for a site or X.

Type `/video` in a project folder with no text and it reads the project and makes its launch film. Or describe the
video you want.

## Install

```
/plugin marketplace add munvard/video-skill
/plugin install video@video-skill
```

Then run `/video`. The first run checks your tools with `scripts/doctor.py` and tells you what is missing.

## You need

- Claude Code with a paid Claude plan
- ffmpeg and Python 3 (with numpy)
- Optional: Node 22 and Chrome for motion design, Blender for 3D

## What is inside

- `skills/video/SKILL.md`: the director (QUICK and STUDIO modes, concepts, look gate, build, checks, delivery).
- `skills/video/kit/`: the render engine (a parallel headless Chrome renderer, a 2D canvas kit and a ray tracer).
- `skills/video/scripts/`: `check.py` (gates with numbers), `sound.py`, `voice.py`, `finish.py`, `assets.py`,
  `doctor.py`, `study.py`, and the Blender kit in `blender/`.
- `skills/video/styles/`: 46 style cards, 12 of them at full depth. Each says how the style looks, moves and sounds,
  and how it fails.

Your reactions are saved in `.video/taste.md` in your project, so the next film starts closer to your taste. It
never publishes or spends anything.

MIT licence. Borrowed code and its licences are listed in `skills/video/NOTICE.md`.
