# Unslop your video #10: the runs (The Great Wave)

One prompt (`prompt.txt`), typed into Claude Code twice on November 27, 2026:

    /video Hokusai's The Great Wave off Kanagawa rebuilt as a 3D scene, matching the painting's composition, then the camera flies into the wave, a 9:16 reel for Instagram, 15 seconds, with sound

| Run | /video installed | Minutes | Turns | Cost (USD, API list price) | Notes from a human during the run |
|---|---|---|---|---|---|
| `greatwave-plain.json` | no | 74.1 | 19 | 4.17 | none |
| `greatwave-1.json` | yes (skill 4b5c8cd) | 75.0 | 21 | 6.70 | none |

Both runs started with the same two files in an otherwise empty project folder: the print as an image and a note with
its source. The image is Katsushika Hokusai, Under the Wave off Kanagawa (The Great Wave), from the series Thirty-six
Views of Mount Fuji, about 1830 to 1832, from The Metropolitan Museum of Art (accession JP1847,
[object 45434](https://www.metmuseum.org/art/collection/search/45434)). The Met publishes it as public domain under its
Open Access program.

The plain run projected the print onto geometry shaped to the depth of its parts (2.5D). From the first camera position
it matches the print pixel for pixel, then the camera drifts so the layers separate, dives under the lip and flies into
the wave. The /video run built new 3D geometry in Blender with flat woodblock colours and ink outlines. It opens in the
print's composition, flashes the real print in the same framing at 1.2 s so viewers can compare, then flies under the
claws and into the curl, and ends with Mount Fuji framed inside the wave.

An honest note: the plain film looks closer to the print, because its picture is the print's own pixels. The /video
film is new geometry that only follows the print. No comparison reel was posted from this pair.

Each file is the run's summary: the prompt, the model, whether the plugin was installed, the skill commit, time, turns,
cost, token usage, and the session's own final message. The full transcripts are not published because they contain
local file paths. Changes to the summaries: the `plan` field (the account tier) was removed, long dashes were replaced
with "to" between two numbers, and one local folder path in the plain run's final message was cut down to the file name.
