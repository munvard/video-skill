# Notices

The skill is MIT licensed (see LICENSE at the repository root). It contains or adapts the third-party work below. Each
copied file keeps its own notice at the top.

## Code

- `kit/render.mjs`: the worker split, the output lock, the cleanup of crashed segments and the WebGL-lost abort are
  adapted from lemo-opuscar (`core/render/video.mjs`, `core/render/browser.mjs`), Copyright (c) 2026 SecondFirst Pty Ltd,
  trading as LemoLab, MIT License. https://github.com/lemomo-ai/lemo-opuscar
- `kit/kit.js`: the twelve measured eases (`E.crashIn` to `E.crashOut`, `EASE_FRAMES`) are copied from motionmaxxing
  (`runtime/motion.js`), Copyright Tejas Makwana, Apache License 2.0. The full licence is in
  `kit/LICENSE-motionmaxxing.txt`. Changes: the curves were moved into the kit's `E` object; nothing else of
  motionmaxxing is included (in particular not its bundled GSAP). https://github.com/Tejashmakwana/motionmaxxing

## Fonts

All fonts in `kit/fonts/` are under the SIL Open Font License 1.1; each has its licence file next to it: Inter,
Fraunces, JetBrains Mono, Caveat, Bangers.

## Ideas, not code

These projects shaped ideas only; none of their text or code is copied: the reading-time check and page contract idea
(lemo-opuscar docs, CC BY-NC 4.0), the safe-area sheet and poster frame idea (brag, claude-animation-skills), shot
continuity and reference analysis ideas (onetake, PolyForm Noncommercial), the end-to-end test brief (the
awesome-claude-video-skills harness, MIT).
