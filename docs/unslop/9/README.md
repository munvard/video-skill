# Unslop your video #9: the runs (turtle)

One prompt (`prompt.txt`), typed into Claude Code twice on November 27, 2026:

    /video a tiny house on the back of a walking turtle, a 9:16 reel for Instagram, 12 seconds, with sound

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `turtle-plain.json` | no | 5.7 | 14 | 1.05 | none |
| `turtle-1.json` | yes (skill 4b5c8cd) | 149.4 | 11 | 6.23 | none |

The plain run made a flat 2D cartoon with Python and Pillow: one locked side view of a turtle walking in place on a
scrolling dirt path at sunrise, with a cottage, smoke, a sun and clouds. The /video run made a 3D film in Blender: a
giant tortoise walking through a golden-hour meadow with a tiny cottage on its shell, seen close up, from above, from
the side, from behind, backlit by the sun, and in a wide shot into the low sun.

The time limit changed during the /video run. Our test setup stops any /video run at 150 minutes (see [#8](../8)). At
about 107 minutes this run was already rendering its last shot, but it still needed its mix, its encode and its checks, so a
stop at 150 minutes could have thrown away a nearly finished film. We raised its limit to 190 minutes, once, as a hard
stop. The run finished on its own at 149.4 minutes, so the raise was not used in the end.

No comparison reel was posted from this pair yet.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns,
cost, token usage, and the session's own final message. The full transcripts are not published because they contain
local file paths. Changes to the summaries: the `plan` field (the account tier) was removed, long dashes were replaced
with "to" between two numbers, and one local folder path in the plain run's final message was cut down to the file name.
