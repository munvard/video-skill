# Release notes

## v2.0.0

`/video` now makes the film itself, on your computer, and proves it: every film in the README was made by this
version from one prompt in a clean Claude Code session, with the prompt, the minutes and the model shown.

### New

- **The render engine ships inside the skill.** A parallel headless Chrome renderer (no npm install), a 2D canvas kit
  with measured easing curves, and a small ray tracer. It works from a plugin install through `${CLAUDE_SKILL_DIR}`.
- **Real 3D with Blender.** Free CC0 materials, models and light from Poly Haven and ambientCG (`scripts/assets.py`
  keeps the credits), EEVEE for most shots and Cycles for hero shots.
- **Sound made in code.** Music on a beat grid in seven moods, a sound effect for every event the film declares, an
  optional local voice (Kokoro) checked word by word with faster-whisper, and a two-pass master to -14 LUFS under
  -1 dBTP.
- **Gates with numbers.** `scripts/check.py` prints PASS or FAIL for the format, frame 0, flat and frozen stretches, the
  end hold, dark stretches, large flat dark areas, reading time per line, text height at 360 px wide, overlapping
  text, text contrast per line, empty bands and the safe area in 9:16, loudness and true peak, and the loop seam. It also writes 1 fps sheets and 100% crops for
  the beauty pass.
- **QUICK and STUDIO modes.** QUICK is one concept and a render in minutes. STUDIO writes four concepts, renders a look
  gate, and judges beauty before numbers.
- **Your taste file.** Your reactions go to `.video/taste.md` in your project and win over the defaults.
- **12 style cards at full depth**: world, camera grammar, three shapes, signature moves, build notes.
- **`scripts/doctor.py`** reports missing tools per OS with the command to add each. **`scripts/study.py`** measures a
  reference film (cuts, shot lengths, motion, light, type size, loudness, tempo).

### Changed

- With no text in a project folder, `/video` makes that project's launch film.
- Every style starts as a draft until a film made by the skill proves it. Earlier "proven" and "studied" labels came
  from films made with other tools and were reset.
- The README leads with product films. The style previews moved to [`gallery/README.md`](gallery/README.md).

### Borrowed code

Listed with its licence in [`NOTICE.md`](plugins/video/skills/video/NOTICE.md): the parallel render idea and code from
lemo-opuscar (MIT), easing curves from motionmaxxing (Apache-2.0), instrument and effect recipes from explainroo (MIT),
and the fonts (SIL Open Font License).
