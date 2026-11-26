# Checklist

Run it on every draft worth showing and on every final, on exact frames at phone size. `scripts/check.py` covers the
numbers; this list covers what only eyes can judge. **Blocker:** false claim, private data, copied work, a broken frame or
sound, a needed word that cannot be read, or a film that is not beautiful. **Major:** a stranger would scroll,
misunderstand or feel something is cheap. Fix both. Note the rest.

## 1. The beauty pass (first, before any number)
1. Look at the 1 fps sheet at phone size. Would a stranger stop on each frame for its picture alone, and send the film
   to a friend? "It is fine" is a fail.
2. A sheet that reads as grey, black or beige panels with caption bands is a BLOCKER, even with every gate green.
3. Is every world rich, lit and coloured? Does the light change between acts?
4. Does the hero of every beat fill 70% of the width or more (in 9:16 push the camera in until it does), title beats and
   wides included: a device at 5% of a bare wall is a dead shot, push in or cut it. With real
   materials, depth and detail? Any UI it shows must be readable at 360 px wide, or it is decoration and must not
   look like text to read. In 9:16, a whole 16:9 page shown small is a fail: crop to regions that fill the frame.
5. Anything that reads as AI slop: purple or violet gradient backdrops, soft glows, neon edges, cute glossy blob or droid
   mascots, floating glass cards (a BLOCKER however clean the render)? Anything that looks cheap: bare 3D primitives
   in a plain room, a toy or voxel kit, flat clip art, a default gradient, a stock-looking icon row, a placeholder,
   square corners where the design is round, line-art hands?
6. Put frame 0 next to the end card: are they both postable on their own?
7. Open the 100% crops (`crop_*.png`): any blocky texture, square speck, banding or stretched noise is a BLOCKER.

## 2. Story
8. Frame 0 alone on a phone, sound off: would a stranger stop? Do they know what the film is about by 2 s?
9. By the middle, do they know what the product is? By the end, where to get it? Every command or link on screen works
   as typed on a fresh machine: copy it from the README with every step it needs (add a plugin marketplace before the
   install), or show the plain link. A command that fails on first try is a false claim. For an invented or unreleased
   product, no install command, package name, domain, store link or store availability ("Free on iOS and Android") a
   stranger could act on or register: a BLOCKER.
10. One idea, one spine, one peak. No caption cards between beats, no headline list.
11. Nothing small, expected or about safety is shown. Nothing cringe: no slogan, no wink, no fake quote.
    The picture shows what the line says: a line that names a colour, a count or a state is checked on its frame.

## 3. Picture and joins
12. Every join at 10 or more frames a second, then the exact two frames: ghost, jump, flash, double text?
13. Every move: what does it follow? Does it settle on what must be read? Does it go in and straight back out?
14. Every subject fully in frame when it matters. Nothing cut at the edge by accident.
15. Crop UI and characters at 720 px: unfinished icons, empty panes, broken text, wrong hands or eyes?
    Line breaks in every cut: a price, a date or a name never splits across two lines ("Ships March / 2027").
16. No labels burned in ("3D render", "Real app", "Sped up", debug text).

## 4. Text at 360 px wide
17. Every needed word readable at 360 px, with contrast (scrim on bright screens), in the safe area, spelled right.
18. Each line on screen long enough, no two captions overlapping, captions match the spoken words exactly.

## 5. Sound
19. Listen, or say clearly that nobody has. Effects on their events (a sound 7 frames early is a major), music cuts on
    bars, music and effects in the same key, nothing harsh.
20. Voice at least 6 dB over music plus effects; no word under a riser.
21. Loop: last frame and last sound flow into frame 0 with no blink and no click.

## 6. Truth, rights and privacy
22. Every claim against a source; every asset and font against a licence, credited in `post.md`.
23. No names, emails, home paths, hostnames, notifications, keys or tokens in any frame or in the post text.
24. Side by side with the last version the user liked: is any scene flatter, emptier or more ordinary? Then it is worse.
