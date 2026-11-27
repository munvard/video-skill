# Checklist

Run it on every draft worth showing and on every final, on exact frames at phone size. `scripts/check.py` covers the
numbers; this list covers what only eyes can judge. **Blocker:** false claim, private data, copied work, a broken frame or
sound, a needed word that cannot be read, or a film that is not beautiful. **Major:** a stranger would scroll,
misunderstand or feel something is cheap. Fix both. Note the rest.

## 0. The stranger's six (reels, ads, posts made for views)
Score each 0 to 10 as a stranger scrolling a phone who has never heard of the product. The bar is 9 or 10 on all six.
A score of 9 or 10 needs a second you can name; when in doubt, score lower. Never round up. A score of 8 or more also
names the real hit it matches in `reference/calibration.md`; without one it is 7 at most.
1. **Stop.** At 0.0 s, sound off: is frame 0 big, striking and already moving, so a fast thumb stops? No empty band, no
   title card, no slow fade in.
2. **Clarity.** By 2 s, sound off: does the stranger know what this is and what it does for them? Hold each key
   word of the request against frame 0 and the hero stills: would a stranger name it unprompted? "A storm" reads as a
   storm (a dark, heavy sky, wind, foam on high crests), not bright water with rain drawn on top. A key word that does
   not read is a fail, however good the rest looks.
3. **Hold.** Is there a second where they would swipe? Name it. Something new happens at least every 2 s, and the best
   moment is still ahead until the end.
4. **Beauty.** Is every frame worth looking at for its picture alone, at phone size? Is the payoff the most striking
   frame of the film, not smaller or plainer than the setup?
5. **Share.** Who would send it, to whom, and why does sending it make the sender look good? "Nobody outside the field"
   is a fail.
6. **Trust.** Is every claim shown, not told, and true? Does anything look faked, inflated, AI-made or like an ad
   template?

## 1. The beauty pass (first, before any number)
1. Look at the 1 fps sheet at phone size. Would a stranger stop on each frame for its picture alone, and send the film
   to a friend? "It is fine" is a fail.
2. A sheet that reads as grey, black or beige panels with caption bands is a BLOCKER, even with every gate green.
3. Is every world rich, lit and coloured? Does the light change between acts?
4. Does the hero of every beat fill 70% of the width or more (in 9:16 push the camera in until it does), title beats and
   wides included: a device at 5% of a bare wall is a dead shot, push in or cut it. With real
   materials, depth and detail? Any UI it shows must be readable at 360 px wide, or it is decoration and must not
   look like text to read. In 9:16, a 16:9 page that does not fill the safe area top to bottom is a fail, and so is
   UI text under 42 px tall at 1080 wide that the viewer must read. Zoom live HTML, never a screenshot past 1:1.
5. Anything that reads as AI slop: purple or violet gradient backdrops, soft glows, neon edges, cute glossy blob or droid
   mascots, floating glass cards (a BLOCKER however clean the render)? Anything that looks cheap: bare 3D primitives
   in a plain room, a toy or voxel kit, flat clip art, a default gradient, a stock-looking icon row, a placeholder,
   square corners where the design is round, line-art hands?
6. Put frame 0 next to the end card: are they both postable on their own?
7. Open the 100% crops (`crop_*.png`): any blocky texture, square speck, banding or stretched noise is a BLOCKER.
8. A product on a surface: at the hero frame, does it stand on it? No gap, a contact shadow that starts at the base,
   nothing sunk in, and the shot script's `K.rests()` line says `ok`. A floating product is a BLOCKER: a viewer who is
   told a price looks for exactly this.
9. Glass and liquid at 100%: a visible liquid line, the background bent through the glass, no dark or silver band at
   the base or the walls, a liquid that is not flat opaque colour, and no bright halo outside the edges. Every macro
   sharp on its subject.

## 2. Story
10. Frame 0 alone on a phone, sound off: would a stranger stop? Do they know what the film is about by 2 s?
11. By the middle, do they know what the product is? By the end, where to get it? Every command or link on screen works
   as typed on a fresh machine: copy it from the README with every step it needs (add a plugin marketplace before the
   install), or show the plain link. A command that fails on first try is a false claim. For an invented or unreleased
   product, no install command, package name, domain, store link or store availability ("Free on iOS and Android") a
   stranger could act on or register: a BLOCKER.
12. One idea, one spine, one peak. No caption cards between beats, no headline list.
13. Nothing small, expected or about safety is shown. Nothing cringe: no slogan, no wink, no fake quote.
    The picture shows what the line says: a line that names a colour, a count or a state is checked on its frame.

## 3. Picture and joins
14. Every join at 10 or more frames a second, then the exact two frames: ghost, jump, flash, double text?
15. Every move: what does it follow? Does it settle on what must be read? Does it go in and straight back out?
16. Every subject fully in frame when it matters. Nothing cut at the edge by accident.
17. Crop UI and characters at 720 px: unfinished icons, empty panes, broken text, wrong hands or eyes?
    Line breaks in every cut: a price, a date or a name never splits across two lines ("Ships March / 2027").
18. No labels burned in ("3D render", "Real app", "Sped up", debug text).

## 4. Text at 360 px wide
19. Every needed word readable at 360 px, with contrast (scrim on bright screens), in the safe area, spelled right.
20. Each line on screen long enough, no two captions overlapping, captions match the spoken words exactly.

## 5. Sound
21. Listen, or say clearly that nobody has. Effects on their events (a sound 7 frames early is a major), music cuts on
    bars, music and effects in the same key, nothing harsh.
22. Voice at least 6 dB over music plus effects; no word under a riser.
23. Loop: last frame and last sound flow into frame 0 with no blink and no click.

## 6. Truth, rights and privacy
24. Every claim against a source; every asset and font against a licence, credited in `post.md`.
25. No names, emails, home paths, hostnames, notifications, keys or tokens in any frame or in the post text.
26. Side by side with the last version the user liked: is any scene flatter, emptier or more ordinary? Then it is worse.
