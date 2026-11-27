# Unslop your video #3: the runs (whale)

One prompt (`prompt.txt`), typed into Claude Code twice on November 27, 2026:

    /video a whale swimming through the clouds, a 9:16 reel for Instagram, 15 seconds, with sound

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `whale-plain.json` | no | 5.4 | 17 | 0.87 | none |
| `whale-1.json` | yes (skill 4b5c8cd) | 107.5 | 143 | 8.05 | none |

The plain run made a flat 2D whale crossing a cartoon sky. The /video run made a 3D humpback in Blender, swimming over a
sea of clouds at sunset. Its own final message says the 3D was rendered at 720p and scaled up to save render time, so
it is a little soft.

The Instagram reel is cut from these two films: 0.8 s of the plain film from 5.0 s (a typical frame, with the whale mid
sky as in most of the film), then four stretches of the /video film. Neither film was edited inside.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns,
cost, token usage, and the session's own final message. The full transcripts are not published because they contain
local file paths. The only changes to the summaries: the `plan` field (the account tier) was removed, long dashes were
replaced with commas (or with "to" between two numbers) to match this repo's style check, and one local folder path in
`whale-1.json` was shortened to the project-relative `.video/whale/deliver/`.
