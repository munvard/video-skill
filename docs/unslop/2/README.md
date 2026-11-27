# Unslop your video #2: the runs

One prompt (`prompt.txt`), typed into Claude Code twice on November 27, 2026:

    /video a tiny astronaut lost in a garden, a 9:16 reel for Instagram, 15 seconds, with sound

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `astronaut-plain.json` | no | 7.7 | 17 | 1.40 | none |
| `astronaut-1.json` | yes (skill 235dfa1) | 144.0 | 12 | 7.51 | none |

The 144 minutes include about 1.5 hours when the run was paused on purpose, because another job was rendering on the same computer.

The Instagram reel is cut from these two films. The screen is split: the plain film on top from 0.5 s (its first lit frame, it starts dark), the /video film below. Then the /video film grows to full screen and plays on from 3.0 s to 10.5 s of the film, between its own opening and closing words. Neither film was edited inside.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns, cost, token usage, and the session's own final message. The full transcripts are not published because they contain local file paths. The only change to the summaries: the `plan` field (the account tier) was removed, and long dashes were replaced with commas, to match this repo's style check.
