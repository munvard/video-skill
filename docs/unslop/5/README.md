# Unslop your video #5: the runs (rubber duck)

One prompt (`prompt.txt`), typed into Claude Code twice on November 27, 2026:

    /video a rubber duck on a desk helping debug code, a 9:16 reel for Instagram, 12 seconds, with sound

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `duck-plain.json` | no | 6.6 | 12 | 1.24 | none |
| `duck-1.json` | yes (skill 4c10cf4) | 41.9 | 40 | 6.96 | none |

No comparison reel was posted from this pair. The plain run made a good 2D cartoon, and the /video run made a 3D film in Blender whose story needs more time than a short comparison gives it. We publish both runs anyway, so the record is not only the pairs where /video won clearly.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns, cost, token usage, and the session's own final message. The full transcripts are not published because they contain local file paths. The only change to the summaries: the `plan` field (the account tier) was removed, and long dashes were replaced with commas, to match this repo's style check.
