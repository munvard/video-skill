# Unslop your video #8: the runs (fox), a /video run that did not finish

One prompt (`prompt.txt`), typed into Claude Code twice on November 27, 2026:

    /video a fox running through a snowy forest at dawn, a 9:16 reel for Instagram, 12 seconds, with sound

| Run | /video installed | Minutes | Result |
|---|---|---|---|
| `fox-plain.json` | no | 7.8 (14 turns, 0.94 USD at API list price) | a 2D side-scroller: a cartoon fox runs across a flat snowfield past layered 2D pines |
| fox-1 | yes (skill 4b5c8cd) | stopped at 150 (189 turns, about 6.20 USD estimated from the run's log) | no film |

The /video run planned a Blender film (a fur fox running out of blue shadow into the low sun) and spent its time on low-resolution motion and quality tests for the running fox. It never started the final render. Our test setup stops any /video run at 150 minutes, so it was stopped with no film. It has no summary file, because the summary is written only when a run ends on its own.

We publish this so the record includes the failures. The fix we plan: a time budget, so a run starts its final render with the best motion it has instead of testing until it runs out of time.

`fox-plain.json` is the plain run's summary: the prompt, the model, time, turns, cost, token usage, and the session's own final message. The only changes: the `plan` field (the account tier) was removed, and long dashes were replaced with commas.
