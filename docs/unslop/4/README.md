# Unslop your video #4: the runs (Orbel launch film)

One prompt (`prompt.txt`), typed into Claude Code twice on November 27, 2026, in a project folder that held only
`project-README.md`:

    /video Make the launch film for this project: one 9:16 cut for Reels and TikTok and one 16:9 cut for the site. I am away, so do not stop to ask; make it beautiful.

The README describes Orbel, a desk light that works as a focus timer. It says Orbel is an invented product for a demo,
and it lists a price and a ship date: "149 USD. Ships in March 2027."

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `orbel-plain.json` | no | 172.0 | 5 | 4.74 | none |
| `orbel-2.json` | yes (skill fb061c2) | 430.0 | 12 | 11.08 | none |

Both runs rendered in Blender on the same Mac at the same time, so both took longer than they would alone. The plain
run ran at low priority. The /video run's 430 minutes include about 20 minutes when it was paused on purpose, because
another job was rendering on that computer.

No comparison reel was posted from this pair, because both runs made a good 3D film of the same lamp:

- The plain run made a 31 s film on a dark walnut desk at night. It opens on black, the lamp fades in, and its first
  words ("Focus, without a screen.") come at 1.5 s.
- The /video run made a 24 s film that follows the light through one day. Frame 0 is the lit lamp with "Time you can
  see." in large type.

The /video opening stops a scroll faster. But a short side-by-side would show the same lamp twice, once dark and once
lit, and that does not show what /video changes.

One difference in what the films claim: the plain film's end card shows "149 USD · Ships March 2027", taken from the
README, with no note that the product is invented. Its own final message warned about this: "The film presents it as
real, with a price and ship date and no disclaimer, so think about that before posting publicly." The /video film
leaves the price, ship date and store link out on purpose, because the README marks Orbel as invented, and its post
text says it is a concept product shown in 3D.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns,
cost, token usage, and the session's own final message. The full transcripts are not published because they contain
local file paths. The only changes to the summaries: the `plan` field (the account tier) was removed, and long dashes
were replaced with commas (or with "to" between two numbers), to match this repo's style check.
