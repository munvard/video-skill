# Unslop your video #6: the runs (mechanical keyboard)

One prompt (`prompt.txt`), typed into Claude Code twice on November 27, 2026:

    /video a product shot of a mechanical keyboard, a 9:16 reel for Instagram, 12 seconds, with sound

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `keyboard-plain.json` | no | 58.3 | 6 | 1.38 | none |
| `keyboard-1.json` | yes (skill 455d90e) | 378.6 | 7 | 9.87 | none |

The minutes are long for both runs because each one shared its computer with other renders. The plain run ran at low
priority beside another Blender job. The /video run's 378.6 minutes include about 324 minutes when it was paused on
purpose, because another project was rendering on the same computer.

No comparison reel was posted from this pair, because both runs made a good 3D product film in Blender:

- The plain run made a dark, moody 12 s film with no words: a soft-focus close-up of the keys, a low angle across the
  board, then the whole keyboard from above on black.
- The /video run made a 12 s reel with words and a click on every visible keypress: "Watch it type." on a falling
  Enter key, a switch lifting out of the board, "Swap switches. No solder." on yellow, the knob turning, a ripple across
  every key seen from above, and an end card. The keyboard is an original design with no brand, and its final message
  says so.

A short side-by-side would show two good keyboard renders, and that does not show what /video changes. Product prompts
like this one and Orbel (#4) are where Claude Code already makes good 3D on its own.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns,
cost, token usage, and the session's own final message. The full transcripts are not published because they contain
local file paths. The only changes to the summaries: the `plan` field (the account tier) was removed, and long dashes
were replaced with commas (or with "to" between two numbers), to match this repo's style check.
