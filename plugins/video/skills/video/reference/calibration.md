# Calibration: real reels with real view counts

Self-scores run high. Measured on November 27, 2026: films that gave themselves 8 or 9 on the stranger's six
(`reference/checklist.md` section 0) got 6 or 7 from a blind judge, about 2 points lower, and the user trusted the note.
So every score is held against reels whose real views are known.

**The rule.** A score of 8 or more names the hit below that the film matches on that question (its ID in the Matches
column) and the second in the film where it does what that hit did. With no hit to name, the score is 7 at most. A film
closer to a flop than to any hit scores 5 or lower on that question. `scripts/note_check.py NOTE.md` checks the table.

## Hits (Instagram Reels, TikTok and Shorts, June to November 2026, views when counted)
| ID | Views | What it was | Why it worked |
|---|---|---|---|
| C02 | 3.7M | a finished 3D website on a laptop, words "Can you believe Claude did this" | the finished, bright result on frame 0 and a question anyone can check |
| C04 | 160.8K | a 5 s 3D loop with a short claim about Claude and Blender, from an account with 514 followers | finished 3D already moving on frame 0, a short loop, one checkable claim |
| C06 | 286.1K | "Claude rigs characters in Blender?" | a live-test question: people stay to see whether it works |
| C08 | 196.9K | moving output on frame 0, then the person who made it | output first |
| C10 | 184.8K | "So this is the kind of website Claude Code builds by default" | a pain point: the boring default is the reason to watch, and people send default versus better |

## Flops
| ID | Views | What it was | Why it failed |
|---|---|---|---|
| C01 | 4,086 | a settings toggle on frame 0, same maker as C08 | input first: nothing finished to look at |
| C03 | 4,212 | a launch motion-design film for a coding tool, opening on an empty cream screen | empty open, reads as an ad |
| C05 | 383 | a dinosaur with "Hollywood CGI. Written in Python", 16:9 | an overclaim, and the wrong shape for a phone |
| C07 | 3,146 | a dark, empty open | nothing to stop on |
| C09 | 570 | "one prompt built this 3D world", no hook | "one prompt" no longer surprises anyone |
| C11 | 302 | a spec ad for a famous brand | an ad nobody asked for |

C12 (893K, a silent warehouse dashboard in 16:9) is an outlier nobody could explain: never build a rule on it.

## Our own reels
| Reel | Blind scores (stop, clarity, hold, beauty, share, trust) | Real views |
|---|---|---|
| A Blender paper boat in a storm, one prompt, no hook words | 6/8/6/6/7/6 | 23 at 2 h 45 min, new account with 0 followers |

## Scoring with it
1. For each of the six, find the closest hit and the closest flop. Write the hit's ID only when the film really does
   what it did, at a second you can point to.
2. A still card held over 2 s, white words on a bright frame, or an in-joke only one field gets cannot score 8 on Hold,
   Beauty or Share, whatever the hit.
3. Never round up. If the table holds no 8, say so plainly in the note: that is the honest result, not a failure to hide.
