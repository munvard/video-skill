# Blender shots

Real objects in real light: products, props, rich 3D worlds. Blender renders the picture; type and UI stay in the
HTML layer on top.

## When to use Blender, when to stay in HTML

- HTML kit: type, UI, app screens, motion design, 2D worlds, abstract shapes. It is fast and the words stay sharp.
- Blender: a real object the viewer should want to touch (a product, a device, a bottle, a camera), a set with depth,
  glass, metal, stone, fabric. Also any world the HTML kit can only fake with flat slabs.
- Never in Blender: text, captions, logos, UI. They go in HTML on top, so they stay sharp and easy to change.
- Never: photoreal people, voxel or blocky toy kits, dark empty rooms.

## Assets (free, CC0)

`SK/scripts/assets.py` finds and downloads CC0 assets from Poly Haven (HDRIs, models, textures) and ambientCG (PBR
materials). It caches every file once per computer and copies it into the project.

```
python SK/scripts/assets.py search --type model --q "vintage camera"
python SK/scripts/assets.py search --type texture --q "travertine"
python SK/scripts/assets.py search --type hdri --q "photo studio"
python SK/scripts/assets.py get Camera_01 --type model --dest .video/assets
python SK/scripts/assets.py get ambientcg:Travertine009 --type texture --dest .video/assets
python SK/scripts/assets.py get photo_studio_01 --type hdri --dest .video/assets
```

- `get` prints the path to load: the `.gltf`, the `.hdr`, or the texture folder. Default size 2k; `--res 1k` for far
  objects, `4k` only for a close hero.
- Every download adds a line to `.video/assets/CREDITS.md` (name, author, link, licence). Keep it with the project.
- The cache is `%LOCALAPPDATA%/video-skill` on Windows, `~/Library/Caches/video-skill` on a Mac and
  `~/.cache/video-skill` on Linux. Offline, `get` uses the cached copy.
- Pick models by look, not by name: open the link from `search` and check the thumbnail. Detailed, high-poly,
  product-style models win.

## One kit, one short script per shot

`SK/scripts/blender/kit3d.py` holds the parts. A shot script imports it, builds one scene and renders PNG frames.
`SK/scripts/blender/shot_example.py` is a complete example: copy it, keep its structure, change the scene.

What the kit gives you:
- `reset()`, `engine("eevee" | "cycles", samples)`, `gpu()`, `color(look, exposure)` (AgX).
- `world_hdri(path, strength, rotation)`, `world_color(color)`.
- `pbr(name, color or texture folder, roughness, metal, coat, transmission, ior, kind=..., tint=...)`. Kinds: glass,
  brushed, metal, lacquer, ceramic, fabric, plastic.
- `import_asset(path, size, location, rotation, drop)` for `.gltf`, `.glb` and `.blend`.
- Set pieces: `sweep()` (studio cyclorama), `pedestal()`, `bevel()`, `smooth()`.
- Light: `key()`, `rim()`, `fill()`, `area()`, `flag()` (a black card the camera cannot see).
- Camera: `camera(loc, target, lens, fstop, focus)`, `move(cam, f0, f1, start, end, center)` with smooth eases,
  `animate()` for any other value.
- Output: `output(w, h, fps, frames, folder, scale, shot)`, `render()`, `measure(n)`, `run(args)`.

## Engines

- EEVEE (ray tracing on) for most shots: about 1 to 5 s a frame at 1080x1920.
- Cycles for 2 or 3 hero shots only: often 30 to 150 s a frame. The example still took 43 s at 256 samples on a
  desktop GPU, against 2.2 s a frame in EEVEE.
- Cycles shows light more truly. A dark product can turn grey from the bright set it reflects: darken what sits
  right under it (`tint` on the stone), add a `flag()`, and give Cycles its own exposure.
- GPU backends, picked by `gpu()`: OptiX or CUDA on NVIDIA, HIP on AMD, Metal on Apple silicon, oneAPI on Intel,
  else the CPU (slow). It prints what it picked. Check that line before a long render.

## Measure first, then render

1. Test the look small: `--res 0.3` with three frames (`--frames 1,45,90`) into a test folder.
2. Measure at the final size: `--measure 10` renders 10 frames into a temp folder and prints the seconds a frame
   and the total time.
3. Tell the user the render time before the full render. One heavy render at a time on a machine.
4. Render the final frames into their own folder.

```
blender -b -P SK/scripts/blender/shot_example.py -- --frames 1,45,90 --res 0.3 --out .video/<film>/renders/tests/hero
blender -b -P SK/scripts/blender/shot_example.py -- --measure 10
blender -b -P SK/scripts/blender/shot_example.py -- --engine eevee --frames 1-90 --out .video/<film>/renders/hero
blender -b -P SK/scripts/blender/shot_example.py -- --engine cycles --frames 45 --out .video/<film>/renders/hero_still
```

Run them from the project folder (assets go to `.video/assets`). Frames go next to the film page in
`.video/<film>/renders/`, because the renderer serves only the page's own folder. Each frame folder gets `render.log`, `.shot.json`
and a `.done` marker. A stopped render resumes: frames already there are skipped.

The kit refuses to write a test render (`--res` below 1) into a final folder, frames of one shot into another
shot's folder, or over a finished render (pass `--overwrite` only when you mean it; better, render the new draft
into a new folder and keep the old one).

## What makes it look premium

- Real materials: roughness on everything, bevels on every hard edge, PBR textures on stone, wood and fabric.
- Light per world: an HDRI for reflections, a big soft key from the side, a rim strip behind, a weak cool fill,
  a glow on the wall behind the hero.
- Depth of field on the hero (f/3 to f/5 for small objects), motion blur on, AgX with a look ("Punchy" or
  "Medium High Contrast").
- A palette per world: one bold background color, one accent in its opposite color, a calm material for the
  plinth. Bright and saturated, never a dark room.
- A motivated camera: a slow push in that arcs a little around the hero, eased in and out. Background shapes then
  drift behind it (parallax). Keep the move small (10 to 20 degrees) so shapes never pass behind the hero's top.
- Leave calm space above or below the hero for the HTML type.

## What fails

- Dark rooms, flat slabs, empty grey floors.
- Toy, voxel or blocky models; photoreal people.
- A world of bare primitives (spheres, cubes, rings, slabs) in a plain room: that is a test scene, not a product world.
  Build or fetch real objects (Poly Haven models), with detail at the size they are seen, and something on every screen.
- Glossy surfaces that mirror a light strip in the frame (make them rougher or move the light).
- A tall column straight behind the hero (it grows out of its head).
- Text or UI made in Blender.
- Test renders in the final folder; overwriting a draft you may still need.
- A full Cycles render planned before measuring.
- Trying a new idea in a final render. Each idea gets a half-size test (`--res 0.5`) of only the frames it changes;
  a final render is for a decided shot. Before a final, multiply frames by the measured seconds a frame for every
  cut: two cuts at 720 frames and 2.5 s a frame is already an hour.
- An end card where only dust moves. On a defocused wide frame that reads as frozen; keep a real slow camera
  move (a 3 to 5% push in or a small arc) through the whole hold.

## Put the frames under the HTML type

Render PNG frames (`f0001.png` ...), then the HTML page draws them as the bottom layer, frame by frame, with
`seq()` from `kit.js`:

```
const plate = seq('renders/hero/f%04d.png', 1);
// in the frame function for frame i (0 = first frame):
ctx.drawImage(await plate.at(i), 0, 0, W, H);   // then draw the type and UI above it
```

Keep the frame rate the same in Blender and the page (30 fps by default). The page owns timing, type, captions and
sound; Blender owns only the picture.
