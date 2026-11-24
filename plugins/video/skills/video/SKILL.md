---
name: video
description: Make a finished video of any kind with code and 3D: launch films, product shorts, ads, daily social posts, explainers, jokes, title pieces or videos with no product. Chooses from a library of styles, mixes them, invents a new one, or works from intuition. Also learns a style from a reference video. Use when the user types /video or asks for a film, reel, short, ad, trailer, animation or explainer.
---

# Video

Turn a short request, or no request, into a finished video that a stranger watches to the end. The style library is a source of ideas, not a menu for the user. Do not ask which style they want.

## 1. Understand
1. Read the request. With no request, look at the current folder: product, README, real screens, brand.
2. Write one sentence: who watches, what they should feel, what they should remember.
3. List what is true and can be shown. Never invent features, users, numbers, reviews or results.
4. Choose the format from where it will be posted. Default: 9:16, 1080x1920, 15 to 30 s. Every frame is composed for that format, never cropped from another.
5. Ask one question only when the work cannot start without it: real spending, a missing private asset, or two very different render costs.

## 2. Choose how to choose
Read `styles/index.md`. Then do the one that gives the strongest film:
- **Use** one style.
- **Mix** as many as the film needs. Give each one a job and keep one spine: `reference/mixing.md`.
- **Invent** a style with `reference/new-style.md`.
- **Ignore the library** when the idea already has a clear form.

When the user wants views, growth or a hook, read `reference/viral.md` first and do its thinking before any concept. Say nothing about guaranteed results.

Think of four very different concepts first. Write each in two sentences with its first frame, its turn and its last frame. Reject a concept that would work for any other product. Judge the rest: does frame 0 stop a stranger, is there one idea, can it be beautiful with the tools here, is it true, would someone send it to a friend. Take the winner and improve it with the best part of another. A style marked **draft** is allowed, but build a proof of its hardest 3 seconds first.

Reference work: learn its timing and method. Never copy its shots, words, layout, characters, sound or brand.

## 3. Plan
Write a frame-event table: frame range, what is seen, what moves and why, how it becomes the next shot, words, sound. Read `reference/craft.md`. The plan is ready when every move follows something, every join has a method, and the viewer feels the question before second 2 with the sound off.

## 4. Build
1. Check the tools that exist here (`reference/engines.md`). Use what is installed before adding anything.
2. Build the hardest 3 to 5 seconds at final quality. If it is not good, change the method now.
3. For 3D, make one finished still for each world before rendering frames, and measure seconds per frame.
4. Build the whole film, then the sound to picture.

## 5. Check
Run `python scripts/check.py film.mp4 out/` (from this skill's folder) and look at the sheets. Then follow `reference/checklist.md` on exact frames. Fix every blocker and major problem. A fix pass must not make the film flatter or more ordinary: compare each scene with the last version people liked.

## 6. Deliver
One master per format, a cover, subtitles when there is speech, a short post text, credits for every third-party asset, and a list of what must be true before posting. Never publish, send or spend without the user's clear yes.

## 7. Learn
When the user reacts, write their exact words and the rule they give to `.video/taste.md` in their project, and read that file first next time. It wins over this library. When real numbers arrive, add them with the hook and styles used (`.video/results.md`). Do not call a style proven because it looks good.

## Learn a style from a video
When the user gives a reference video, follow `reference/new-style.md`. Work only from a file they may use.
