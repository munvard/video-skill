# Unslop your video #11: the runs (watch)

One prompt (`prompt.txt`), typed into Claude Code twice:

    /video a luxury wristwatch product film, a 9:16 reel for Instagram, 12 seconds, with sound

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `watch-plain.json` | no | 15.1 | 26 | 2.31 | none |
| `watch-1.json` | yes (skill 4b5c8cd) | 88.2 | 8 | 3.92 | none |

The /video run was made on November 27, 2026. The plain run was made the same night, after the /video film was already
cut into an Instagram reel, so this pair was not picked by looking at both results first.

Here plain Claude Code made good work. It drew a blue sunburst dial for an invented brand, ELARIS, in 2D with NumPy:
slow push-ins on a face-on dial, gold hands, a date window, a pull back to the whole watch and captions. The /video run
modelled an invented watch, HALDEN, in 3D in Blender: a steel case, a green sunburst dial, a stitched leather strap,
seen from several angles as it turns, with the seconds hand jumping on the beat and the hands clicking to 10:10 at the end.
The /video run's own final message scores its film 8, 8, 7, 7, 6, 7 out of 10 and says a watch collector would see it as CG.

The @slashvideo Instagram reel about this film is cut from the /video run's final renders; its edit and labels are
ours. The brands in both films are invented.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns,
cost, token usage, and the session's own final message. The full transcripts are not published because they contain
local file paths. Changes to the summaries: the `plan` field (the account tier) was removed, long dashes were replaced
with commas (or with "to" between two numbers), and two local folder paths in the plain run's final message were cut
down to the file name or "the project folder".
