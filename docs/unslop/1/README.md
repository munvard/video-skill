# Unslop your video #1: the runs

One prompt (`prompt.txt`), typed into Claude Code four times on November 26, 2026:

    /video a paper boat in a storm, a 9:16 reel for Instagram, 15 seconds, with sound

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `paperboat-control.json` | no | 8.1 | 9 | 0.64 | none |
| `paperboat-control-2.json` | no | 28.3 | 4 | 1.36 | none |
| `paperboat-pc.json` | yes (skill 748a12d) | 70.3 | 15 | 4.08 | none |
| `paperboat-2.json` | yes (skill 748a12d) | 165.4 | 8 | 6.84 | none |

Every film was judged blind by a separate reviewer that did not know which run made it. The blind judge picked `paperboat-control-2` as the stronger film without /video and `paperboat-2` as the stronger film with /video. The film posted on Instagram is `paperboat-2`.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns, cost, token usage, and the session's own final message. The full session transcripts are not published because they contain local file paths.

If the posted version had a round of written notes from us after the first run, the post says so.

The only change to the summaries: the `plan` field (the account tier) was removed, and long dashes in the final messages were replaced with commas, to match this repo's style check.
