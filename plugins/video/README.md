# video

A skill for Claude Code that makes finished videos. Type `/video` in a project, or describe any video you want. It picks a style, mixes two, invents one, or works without one. You do not have to choose.

46 style cards in 8 families. Each card says how it looks, moves and sounds, how to open, and how it fails. Only the chosen card is loaded.

**Honest status:** 2 styles are proven, which means a finished film that its owner or a few test viewers clearly liked, with no view numbers yet, 3 were measured frame by frame, 41 are drafts that still need a test film. Each card says which. No skill can promise a viral video.

## Install

As a plain skill, called with `/video`: copy `plugins/video/skills/video` to `~/.claude/skills/video`.

As a plugin, called with `/video:video`:

```
/plugin marketplace add munvard/video-skill
/plugin install video@video-skill
```

## Needs

Claude Code, ffmpeg and Python 3. Node and Chrome for motion design, Blender for 3D. It checks what you have.

## Use

```
/video
/video a 20 second post about our search
/video a love letter to my city, no product
/video learn the style of reference.mp4
```

It saves your reactions in `.video/taste.md` in your project, so the next video starts closer to your taste. It never publishes or spends without your yes.

MIT licence.
