# Unslop your video #7: the runs (jellyfish)

One prompt (`prompt.txt`), typed into Claude Code twice on November 27, 2026:

    /video a jellyfish drifting through a city at night, a 9:16 reel for Instagram, 12 seconds, with sound

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `jellyfish-plain.json` | no | 7.2 | 11 | 0.78 | none |
| `jellyfish-1.json` | yes (skill 4b5c8cd) | 44.4 | 17 | 3.63 | none |

The plain run made one still 2D frame of a night skyline with a moon, and a glowing 2D jellyfish drifting up through it, with no camera move and no cuts. The /video run made 3D moon jellyfish in Blender, drifting over a real cobblestone street at night, with the camera tilting up into a whole bloom of them.

This prompt was picked after a cheap plain run, as one of three scene prompts where plain Claude Code made flat 2D. Pairs where plain Claude Code already made good work are in [#4](../4) and [#5](../5).

The Instagram reel is cut from these two films: 0.8 s of the plain film from its first frame, then four stretches of the /video film. Neither film was edited inside.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns, cost, token usage, and the session's own final message. The full transcripts are not published because they contain local file paths. Changes to the summaries: the `plan` field (the account tier) was removed, long dashes were replaced with commas, and one local folder path in the plain run's final message was cut down to the file name.
