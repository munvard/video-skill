# Sound

Every film gets music, a sound for every event on screen, and a master for the feeds. Everything is made on this
computer with free tools: numpy for music and effects, Kokoro for an optional voice, ffmpeg for the master.
`SK` is this skill's folder (`${CLAUDE_SKILL_DIR}`).

## The order

1. **Grid first**, before the plan is final: `python SK/scripts/sound.py grid --bpm 120 --dur 20`. It prints every
   beat and bar time as JSON. Put cuts, hits and text changes on these times.
2. **Music**: `python SK/scripts/sound.py music --out music.wav --dur 20 --mood bright-pop --key "A minor"
   --sections "intro:2,build:4,drop:8,outro:2" --peak 9.5`. The file is exactly `--dur` long, with its bars and sections in `music.wav.grid.json`. `--peak` moves the
   drop to the nearest bar line; put the best picture there. `--loop` makes the last bar flow into the first.
3. **Effects**: `python SK/scripts/sound.py sfx --meta film.meta.json --out sfx.wav --key "A minor"`. It reads the
   events the page declared in `window.EV` (the renderer copies them into `film.meta.json`).
4. **Voice** (optional): write `lines.json` as `[{"t": 1.2, "text": "Meet the new app."}]`, then
   `uv run --with kokoro-onnx --with soundfile --with faster-whisper python SK/scripts/voice.py say --lines lines.json --out voice.wav`.
   Every line is transcribed back; if the words heard are not the words written, it fails and writes nothing.
   Rewrite the line (spell out "README dot M D" style text as people say it) and run again. It also writes
   `voice.wav.words.json` with the time of every word, for captions. List voices with `voice.py voices`.
5. **Mix**: `python SK/scripts/sound.py mix --music music.wav --sfx sfx.wav [--voice voice.wav] --out mix.wav`.
   Music and effects duck 8 dB under the voice (`--duck-db 10` to `12` for teaching).
6. **Master and mux**: `python SK/scripts/finish.py --video draft.mp4 --audio mix.wav --out film.mp4 --poster 2.4`.
   Two-pass loudnorm to -14 LUFS, then it measures the true peak of the encoded AAC and encodes again until it is
   at or under -1.0 dBTP. `--poster T` puts the best settled frame at T in place of frame 0. `--loop` for loops.
7. **Check what you cannot hear**: `python SK/scripts/sound.py stats --in mix.wav --grid music.wav.grid.json` prints
   loudness, peaks, clicks and the spectrum per section. `check.py` then gates the finished film.

## Moods

| Mood | Tempo | Use it for |
|---|---|---|
| `bright-pop` | 118 | app launches, friendly products, social posts |
| `deep-pulse` | 122 | dev tools, AI, night and tech worlds |
| `warm-lofi` | 84 | calm apps, journals, food, wellness |
| `epic-build` | 100 | a hero launch, hardware reveals, a big finish |
| `minimal-tech` | 124 | clean product films, Swiss grid, data |
| `playful-pluck` | 112 | games, kids, cute mascots, shape morph |
| `calm-ambient` | 72 | glass and light, macro material, brand films |

Each mood has its own default tempo; `--bpm` overrides it. Change `--seed` for a different track in the same mood.

## Effects

`window.EV` is a list of `{t, type, gain, pan}`. Types: `whoosh` and `swish` (peak at `t`, for moves), `hit`,
`impact`, `thud` and `drop` (start at `t`, for landings), `click`, `tick`, `type` and `pop` (small UI moments),
`riser` (ends at `t`, into a reveal), `shimmer`, `glass` and `bell` (light, sparkle, a logo). An unknown type plays a
soft hit with a warning.

## Rules that make it sound expensive

- One sound for one event. Ten effects in a second is noise; pick the event that matters.
- Silence is an effect: half a bar with no music before the drop or the logo.
- The first sound lands on frame 0. A film that opens silent loses the scroll.
- Effects sit under the music, except the one hit on the key moment.
- Under a voice, music plus effects stay at least 6 dB below it (mix enforces this).
- The end: the music resolves on the last bar, and the logo holds on its ring out. No hard cut of a sustained note.

Borrowed code and its licences: `NOTICE.md`.
