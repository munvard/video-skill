"""Example hero shot: a premium product on a marble plinth in a bright studio sweep.

The hero is a detailed vintage camera from Poly Haven (CC0), lit by an HDRI plus a warm key,
a rim strip and a cool fill, with depth of field and a slow push in that arcs around it.
Without internet (and no cached copy) it builds a glass bottle with a brushed cap instead.

    blender -b -P shot_example.py -- --engine eevee --frames 1-90 --out renders/hero --res 0.5
    blender -b -P shot_example.py -- --engine cycles --frames 45 --out renders/hero_still
    blender -b -P shot_example.py -- --measure 10          (seconds per frame first)

Extra flags: --builtin (skip downloads, use the built bottle). The default size is 1080x1920
(9:16) at 30 fps, frames 1-90 (3 s). Assets go to --assets (default .video/assets).
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import kit3d as K  # noqa: E402

# palette: one per world. Tangerine sweep, cream stone, a teal accent, a black and brass hero.
SWEEP = "#e8743b"
ACCENT = "#11606b"
CREAM = "#f6eee4"


def fetch(a, asset_id, kind, **kw):
    """Get an asset through assets.py, or None when offline or --builtin."""
    if a.builtin:
        return None
    try:
        import assets
        return str(assets.get(asset_id, kind, a.assets, **kw))
    except Exception as e:  # noqa: BLE001  any failure (offline, not found, server down) falls back to built parts
        K.log(f"asset {asset_id} not available ({e.__class__.__name__}: {str(e)[:120]}); using a built fallback")
        return None


def bottle(top):
    """Fallback hero: a glass bottle with amber liquid, a gold collar and a brushed cap."""
    import bpy

    def rounded(name, size, z, r, mat):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, z))
        ob = bpy.context.object
        ob.name = name
        ob.scale = size
        bpy.ops.object.transform_apply(scale=True)
        K.bevel(ob, r, 8, 30)
        K.smooth(ob, 30)
        ob.data.materials.append(mat)
        return ob

    def cyl(name, rad, h, z, mat, edge):
        bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=rad, depth=h, location=(0, 0, z))
        ob = bpy.context.object
        ob.name = name
        K.bevel(ob, edge, 4, 50)
        K.smooth(ob, 50)
        ob.data.materials.append(mat)
        return ob

    glass = K.pbr("glass", "#ffffff", kind="glass")
    # the liquid is glossy amber with subsurface, not a second refractive glass: EEVEE cannot refract
    # one glass through another, and this reads as liquid in both engines
    liquid = K.pbr("liquid", "#f39a2e", roughness=0.05, coat=1.0)
    liquid.node_tree.nodes["Principled BSDF"].inputs["Subsurface Weight"].default_value = 0.8
    gold = K.pbr("gold", "#e8b96a", kind="brushed", roughness=0.25)
    cap = K.pbr("cap", "#1b1a1f", kind="lacquer", roughness=0.3)
    rounded("bottle", (0.075, 0.05, 0.10), top + 0.05, 0.014, glass)
    rounded("liquid", (0.066, 0.041, 0.078), top + 0.045, 0.011, liquid)
    cyl("collar", 0.015, 0.012, top + 0.106, gold, 0.002)
    cyl("cap", 0.021, 0.04, top + 0.132, cap, 0.004)
    root = bpy.data.objects.new("hero", None)
    bpy.context.scene.collection.objects.link(root)
    for n in ("bottle", "liquid", "collar", "cap"):
        bpy.data.objects[n].parent = root
    return root


def main():
    a = K.args(lambda ap: ap.add_argument("--builtin", action="store_true", help="no downloads"),
               frames="1-90", shot="example_hero")
    K.reset()
    K.engine(a.engine, a.samples)
    K.color("Punchy", exposure=-0.3 if a.engine == "eevee" else -1.0)  # Cycles adds real bounce light

    hdri = fetch(a, "photo_studio_01", "hdri", res="2k")
    stone = fetch(a, "ambientcg:Travertine009", "texture", res="2k")
    model = fetch(a, "Camera_01", "model", res="2k")

    if hdri:
        K.world_hdri(hdri, strength=0.55 if a.engine == "eevee" else 0.35, rotation=70)
    else:
        K.world_color(CREAM, 0.6)

    # set: a sweep wall behind, a honed stone plinth for the hero, and a big teal disc standing
    # behind it that frames the hero like a halo and drifts with the camera (parallax)
    K.sweep(c=SWEEP, width=4.0, depth=3.0, height=2.5, radius=0.6).location = (0, 0.35, 0)
    top = 0.16
    plinth = K.pbr("stone", stone, scale=2.0, box=True, roughness=0.42, tint="#b5aa9c") if stone else K.pbr("plinth", CREAM, kind="ceramic")
    K.pedestal("plinth", radius=0.15, height=top, mat=plinth, edge=0.004)
    disc = K.pedestal("disc", radius=0.24, height=0.03, mat=K.pbr("teal", ACCENT, roughness=0.6), edge=0.008)
    disc.rotation_euler = (math.radians(90), 0, math.radians(-27))
    disc.location = (0.25, 0.6, 0.2)

    if model:
        hero = K.import_asset(model, location=(0, 0, top), rotation=25, drop=("strap",))
    else:
        hero = bottle(top)
    K.rests(hero)  # it must stand on the plinth: logs ok, FLOATS or SINKS with the gap
    lo, hi = K.bounds(hero)
    mid = (lo + hi) / 2
    front = (mid.x, lo.y + 0.25 * (hi.y - lo.y), mid.z + 0.08 * (hi.z - lo.z))

    # light: warm key from the left side and above, a top rim strip behind, a side rim, a cool fill
    # front-right, and a glow on the wall behind the hero so it stands out
    K.key(mid, (-0.62, -0.12, top + 0.45), power=50, size=0.6)
    K.area("wall_glow", (0, 0.25, 0.04), (0, 0.95, 0.45), 18, "#ffd2a6", size=0.35)
    K.rim(mid, (0.05, 0.3, top + 0.3), power=45, c="#fff1e0", size=0.08, length=0.5)
    K.rim(mid, (0.32, 0.1, top + 0.12), power=20, c="#ffd9b8", size=0.06, length=0.3).name = "rim_side"
    K.fill(mid, (0.5, -0.5, top + 0.08), power=8, size=0.8)
    K.flag(mid, (0.4, 0.05, top + 0.08), 0.3, 0.25)  # keeps the black body black on its shadow side

    # camera: a slow push in that arcs from the left three-quarter view toward the front
    def orbit(deg, r, z):
        t = math.radians(deg)
        return (mid.x + r * math.cos(t), mid.y + r * math.sin(t), z)

    cam = K.camera(orbit(-124, 0.62, top + 0.2), mid, lens=50, fstop=4.0, focus=front)
    K.move(cam, 1, 90,
           start={"loc": orbit(-124, 0.62, top + 0.2), "aim": mid + K.Vector((0, 0, 0.04)), "focus": front, "fstop": 4.5},
           end={"loc": orbit(-110, 0.47, top + 0.11), "aim": mid + K.Vector((0, 0, 0.03)), "focus": front, "fstop": 3.2},
           center=(mid.x, mid.y, 0))

    K.output(1080, 1920, 30, a.frames, a.out, scale=a.res, shot=a.shot, overwrite=a.overwrite)
    K.run(a)


main()
