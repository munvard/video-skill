"""kit3d: a small Blender kit for professional 3D shots (Blender 4.2 LTS and 5.x).

One shot = one short script that imports this module, builds one scene and renders PNG frames:

    import os, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import kit3d as K

    a = K.args()                                  # --engine --frames --out --res --samples --measure ...
    K.reset()
    K.engine(a.engine, a.samples)
    K.world_hdri(".video/assets/photo_studio_01/photo_studio_01_2k.hdr", strength=0.8, rotation=40)
    hero = K.import_asset(".video/assets/Camera_01/Camera_01_2k.gltf", size=0.15)
    K.key((0, 0, 0.05), (-0.6, -0.5, 0.6), 120)
    cam = K.camera((0.1, -0.6, 0.15), (0, 0, 0.05), lens=70, fstop=2.8)
    K.move(cam, 1, 90, start={...}, end={...}, center=(0, 0, 0))
    K.output(1080, 1920, 30, a.frames, a.out, scale=a.res, shot="hero", overwrite=a.overwrite)
    K.run(a)                                      # measure, or render with a log and a .done marker

Run it with:  blender -b -P shot.py -- --engine eevee --frames 1-90 --out renders/hero --res 0.5

Units are meters. Colors given as "#rrggbb" are sRGB and get converted; tuples are linear RGB.

Text and UI are never made in Blender. Type, captions, logos and app screens go in the HTML layer
on top of the rendered frames, so words stay sharp and easy to change.
"""
import argparse
import json
import math
import os
import shutil
import sys
import tempfile
import time

import bpy
from mathutils import Vector

WARM = (1.0, 0.86, 0.72)
NEUTRAL = (1.0, 0.97, 0.93)
COOL = (0.75, 0.85, 1.0)
_state = {"folder": None, "shot": None, "overwrite": False}


def log(msg):
    print(f"kit3d: {msg}", flush=True)


def hexc(h):
    """'#ff8800' (sRGB) -> linear RGB tuple for Blender."""
    h = h.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def _rgb(c):
    return hexc(c) if isinstance(c, str) else tuple(c)[:3]


# ---------------------------------------------------------------- arguments
def _frames(text):
    """'1-90' or '1,45,90' or '1-10,45' -> sorted list of frame numbers."""
    out = set()
    for part in text.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            out.update(range(int(a), int(b) + 1))
        elif part:
            out.add(int(part))
    return sorted(out)


def args(extra=None, frames="1-90", shot=None):
    """Parse the arguments after '--'. `extra(parser)` may add shot-specific flags."""
    name = shot or "shot"
    if not shot and "-P" in sys.argv:
        name = os.path.splitext(os.path.basename(sys.argv[sys.argv.index("-P") + 1]))[0]
    ap = argparse.ArgumentParser(prog=name)
    ap.add_argument("--engine", choices=("eevee", "cycles"), default="eevee")
    ap.add_argument("--frames", default=frames, help="1-90, or 1,45,90, or 1-10,45")
    ap.add_argument("--out", default=os.path.join("renders", name), help="frames folder (one shot per folder)")
    ap.add_argument("--res", type=float, default=1.0, help="size scale: 1 = full size, 0.5 = half (a test)")
    ap.add_argument("--samples", type=int, default=0, help="0 = the engine default (EEVEE 64, Cycles 256)")
    ap.add_argument("--measure", type=int, default=0, help="render N frames to a temp folder and print s/frame")
    ap.add_argument("--overwrite", action="store_true", help="allow re-rendering a finished folder")
    ap.add_argument("--assets", default=os.path.join(".video", "assets"), help="the project asset folder")
    ap.add_argument("--shot", default=name)
    if extra:
        extra(ap)
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    a = ap.parse_args(argv)
    a.frames = _frames(a.frames)
    return a


# ---------------------------------------------------------------- scene, engine, color
def reset():
    """An empty scene with factory settings (no cube, light or camera)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def gpu(scene=None):
    """Pick the best Cycles GPU backend for this machine and print it. Returns the backend name or 'CPU'."""
    scene = scene or bpy.context.scene
    prefs = bpy.context.preferences.addons["cycles"].preferences
    order = ["METAL"] if sys.platform == "darwin" else ["OPTIX", "CUDA", "HIP", "ONEAPI"]
    for backend in order:
        try:
            prefs.compute_device_type = backend
        except (TypeError, ValueError):
            continue  # this Blender build has no such backend
        prefs.refresh_devices()
        found = [d for d in prefs.get_devices_for_type(backend) if d.type == backend]
        if not found:
            continue
        for d in prefs.devices:
            d.use = d.type == backend
        scene.cycles.device = "GPU"
        log(f"gpu {backend}: {', '.join(d.name for d in found)}")
        return backend
    try:
        prefs.compute_device_type = "NONE"
    except (TypeError, ValueError):
        pass
    scene.cycles.device = "CPU"
    log("gpu: none found, Cycles renders on the CPU (slow)")
    return "CPU"


def engine(kind="eevee", samples=0, scene=None):
    """EEVEE with ray tracing (most shots) or Cycles on the GPU (2 or 3 hero shots). Motion blur and AgX on."""
    s = scene or bpy.context.scene
    if kind == "eevee":
        names = bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys()
        s.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in names else "BLENDER_EEVEE"
        e = s.eevee
        e.taa_render_samples = samples or 64
        e.use_raytracing = True
        e.ray_tracing_method = "SCREEN"
        o = e.ray_tracing_options
        o.resolution_scale = "1"
        o.trace_max_roughness = 0.6
        o.use_denoise = True
        e.use_fast_gi = True
        e.fast_gi_method = "GLOBAL_ILLUMINATION"
        e.use_shadows = True
        e.shadow_ray_count = 2
        e.shadow_step_count = 8
        e.clamp_surface_indirect = 10.0
        e.use_bokeh_jittered = True  # true depth of field over the samples: no halo around the sharp hero
        e.bokeh_overblur = 2.0
        e.use_overscan = True  # screen-space effects keep working at the frame edges
        log(f"engine EEVEE ({s.render.engine}), {e.taa_render_samples} samples, ray tracing on")
    elif kind == "cycles":
        s.render.engine = "CYCLES"
        gpu(s)
        c = s.cycles
        c.samples = samples or 256
        c.use_adaptive_sampling = True
        c.adaptive_threshold = 0.02
        c.use_denoising = True
        try:
            c.denoiser = "OPENIMAGEDENOISE"
            c.denoising_use_gpu = True
        except (TypeError, AttributeError):
            pass
        c.max_bounces = 10
        c.diffuse_bounces = 3
        c.glossy_bounces = 4
        c.transmission_bounces = 8
        c.transparent_max_bounces = 8
        c.caustics_reflective = False
        c.caustics_refractive = False
        c.blur_glossy = 0.5
        c.sample_clamp_indirect = 10.0
        log(f"engine Cycles, {c.samples} samples, adaptive 0.02, denoiser on")
    else:
        raise ValueError("engine is eevee or cycles")
    s.render.use_motion_blur = True
    s.render.motion_blur_shutter = 0.5
    color(scene=s)
    return s


def color(look="Medium High Contrast", exposure=0.0, scene=None):
    """AgX view transform with a look: Punchy, High Contrast, Medium High Contrast, Base Contrast ..."""
    s = scene or bpy.context.scene
    s.view_settings.view_transform = "AgX"
    for name in (f"AgX - {look}", look, "None"):
        try:
            s.view_settings.look = name
            break
        except TypeError:
            continue
    s.view_settings.exposure = exposure


# ---------------------------------------------------------------- world
def world_hdri(path, strength=1.0, rotation=0.0, visible=True, background="#f2efe9"):
    """Light the scene with an HDRI (.hdr or .exr). rotation in degrees turns it around Z.
    visible=False keeps its light and reflections but the camera sees the flat `background` color."""
    w = bpy.data.worlds.new("world")
    bpy.context.scene.world = w
    w.use_nodes = True
    N, L = w.node_tree.nodes, w.node_tree.links
    bg = N["Background"]
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(rotation))
    env = N.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.abspath(path), check_existing=True)
    L.new(tc.outputs["Generated"], mp.inputs["Vector"])
    L.new(mp.outputs["Vector"], env.inputs["Vector"])
    L.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    if not visible:
        lp = N.new("ShaderNodeLightPath")
        flat = N.new("ShaderNodeBackground")
        flat.inputs["Color"].default_value = (*_rgb(background), 1)
        mix = N.new("ShaderNodeMixShader")
        L.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
        L.new(bg.outputs["Background"], mix.inputs[1])
        L.new(flat.outputs["Background"], mix.inputs[2])
        L.new(mix.outputs["Shader"], N["World Output"].inputs["Surface"])
    return w


def world_color(c="#f2efe9", strength=1.0):
    """A plain colored world (no HDRI): soft and even, good under a studio sweep."""
    w = bpy.data.worlds.new("world")
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*_rgb(c), 1)
    bg.inputs["Strength"].default_value = strength
    return w


# ---------------------------------------------------------------- materials
KINDS = {
    # name:     defaults for pbr(); explicit arguments win
    "glass": {"roughness": 0.02, "transmission": 1.0, "ior": 1.5},
    "brushed": {"roughness": 0.3, "metal": 1.0},
    "metal": {"roughness": 0.18, "metal": 1.0},
    "lacquer": {"roughness": 0.4, "coat": 1.0},
    "ceramic": {"roughness": 0.3, "coat": 0.7},
    "fabric": {"roughness": 0.9},
    "plastic": {"roughness": 0.35},
}
_MAPS = [  # (slot, name tokens) in match order; Poly Haven and ambientCG names both work
    ("skip", ("normaldx", "nor_dx", "preview")),
    ("color", ("color", "diff", "diffuse", "albedo", "basecolor", "base_color")),
    ("normal", ("normalgl", "nor_gl", "normal")),
    ("rough", ("roughness", "rough")),
    ("arm", ("arm",)),
    ("disp", ("displacement", "disp", "height")),
    ("skip", ("ao", "ambientocclusion", "spec", "opacity")),
    ("metal", ("metalness", "metallic", "metal")),
]


def texture_maps(folder):
    """{slot: path} for the image maps in a PBR texture folder (Poly Haven or ambientCG)."""
    folder = os.path.abspath(folder)
    prefix = os.path.basename(folder.rstrip("/\\")).lower()
    found = {}
    for f in sorted(os.listdir(folder)):
        low = f.lower()
        if not low.endswith((".jpg", ".jpeg", ".png", ".exr", ".tif", ".tiff")):
            continue
        rest = low.removeprefix(prefix)
        tokens = rest.replace("-", "_").replace(".", "_").split("_")
        for slot, names in _MAPS:
            if any(n in tokens for n in names):
                if slot != "skip":
                    found.setdefault(slot, os.path.join(folder, f))
                break
    return found


def pbr(name, src="#cccccc", roughness=None, metal=None, coat=None, transmission=None, ior=None,
        kind=None, scale=1.0, box=False, normal=1.0, coat_roughness=0.03, tint=None):
    """A Principled material.
    src: a color ('#rrggbb' or linear tuple) or a PBR texture folder from assets.py.
    kind: glass, brushed, metal, lacquer, ceramic, fabric or plastic (sets good defaults).
    scale: texture repeats; box=True projects textures from 3 sides (for objects without good UVs).
    With a texture folder, an explicit roughness replaces the roughness map, and tint (a color)
    multiplies the color map: darken a stone so it does not blow out, or pull it into the palette."""
    d = dict(KINDS.get(kind, {}))
    for k, v in (("roughness", roughness), ("metal", metal), ("coat", coat), ("transmission", transmission), ("ior", ior)):
        if v is not None:
            d[k] = v
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = d.get("roughness", 0.4)
    b.inputs["Metallic"].default_value = d.get("metal", 0.0)
    b.inputs["Coat Weight"].default_value = d.get("coat", 0.0)
    b.inputs["Coat Roughness"].default_value = coat_roughness
    b.inputs["Transmission Weight"].default_value = d.get("transmission", 0.0)
    b.inputs["IOR"].default_value = d.get("ior", 1.5)
    if isinstance(src, str) and os.path.isdir(src):
        maps = texture_maps(src)
        if roughness is not None:
            maps.pop("rough", None)  # an explicit roughness wins over the map (for example honed stone)
            maps.pop("arm", None)
        _texture(m, b, maps, scale, box, normal, d, tint)
    else:
        b.inputs["Base Color"].default_value = (*_rgb(src), 1)
    if kind == "brushed":
        _brushed(m, b, d.get("roughness", 0.3))
    if kind == "fabric":
        b.inputs["Sheen Weight"].default_value = 0.8
        b.inputs["Sheen Roughness"].default_value = 0.4
        _fine_bump(m, b, 900.0, 0.12)
    if kind == "ceramic":
        b.inputs["Coat Roughness"].default_value = 0.08
        b.inputs["Subsurface Weight"].default_value = 0.05
        b.inputs["Subsurface Scale"].default_value = 0.01
    if d.get("transmission", 0) > 0 and hasattr(m, "use_raytrace_refraction"):
        m.use_raytrace_refraction = True  # EEVEE: real refraction through glass
        m.surface_render_method = "DITHERED"
    return m


def _texture(m, b, maps, scale, box, normal, d, tint=None):
    N, L = m.node_tree.nodes, m.node_tree.links
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    L.new(tc.outputs["Object" if box else "UV"], mp.inputs["Vector"])

    def img(path, data):
        t = N.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(path, check_existing=True)
        t.image.colorspace_settings.name = "Non-Color" if data else "sRGB"
        if box:
            t.projection = "BOX"
            t.projection_blend = 0.25
        L.new(mp.outputs["Vector"], t.inputs["Vector"])
        return t

    if "color" in maps:
        col = img(maps["color"], False).outputs["Color"]
        if tint is not None:
            mul = N.new("ShaderNodeMix")
            mul.data_type = "RGBA"
            mul.blend_type = "MULTIPLY"
            mul.inputs["Factor"].default_value = 1.0
            L.new(col, mul.inputs["A"])
            mul.inputs["B"].default_value = (*_rgb(tint), 1)
            col = mul.outputs["Result"]
        L.new(col, b.inputs["Base Color"])
    if "rough" in maps:
        L.new(img(maps["rough"], True).outputs["Color"], b.inputs["Roughness"])
    if "metal" in maps:
        L.new(img(maps["metal"], True).outputs["Color"], b.inputs["Metallic"])
    if "arm" in maps and ("rough" not in maps or "metal" not in maps):
        sep = N.new("ShaderNodeSeparateColor")
        L.new(img(maps["arm"], True).outputs["Color"], sep.inputs["Color"])
        if "rough" not in maps:
            L.new(sep.outputs["Green"], b.inputs["Roughness"])
        if "metal" not in maps and d.get("metal") is None:
            L.new(sep.outputs["Blue"], b.inputs["Metallic"])
    if "normal" in maps:
        nm = N.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = normal
        L.new(img(maps["normal"], True).outputs["Color"], nm.inputs["Color"])
        L.new(nm.outputs["Normal"], b.inputs["Normal"])
    elif "disp" in maps:
        bump = N.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.2 * normal
        L.new(img(maps["disp"], True).outputs["Color"], bump.inputs["Height"])
        L.new(bump.outputs["Normal"], b.inputs["Normal"])


def _brushed(m, b, rough):
    """Fine brushed lines: stretched noise drives roughness and a small bump."""
    N, L = m.node_tree.nodes, m.node_tree.links
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (2000.0, 6.0, 6.0)
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 4.0
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    L.new(mp.outputs["Vector"], nz.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = max(0.0, rough - 0.08)
    mr.inputs["To Max"].default_value = rough + 0.08
    L.new(nz.outputs["Fac"], mr.inputs["Value"])
    if not b.inputs["Roughness"].is_linked:
        L.new(mr.outputs["Result"], b.inputs["Roughness"])
    b.inputs["Anisotropic"].default_value = 0.7
    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.04
    L.new(nz.outputs["Fac"], bump.inputs["Height"])
    if not b.inputs["Normal"].is_linked:
        L.new(bump.outputs["Normal"], b.inputs["Normal"])


def _fine_bump(m, b, scale, strength):
    N, L = m.node_tree.nodes, m.node_tree.links
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = 2.0
    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    L.new(nz.outputs["Fac"], bump.inputs["Height"])
    if not b.inputs["Normal"].is_linked:
        L.new(bump.outputs["Normal"], b.inputs["Normal"])


def assign(ob, mat):
    """Give an object (and its mesh children) one material."""
    for o in [ob] + list(ob.children_recursive):
        if o.type == "MESH":
            o.data.materials.clear()
            o.data.materials.append(mat)
    return ob


# ---------------------------------------------------------------- objects
def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def smooth(ob, angle=35):
    """Smooth shading with sharp edges kept above `angle` degrees."""
    ob.data.shade_smooth()
    if hasattr(ob.data, "set_sharp_from_angle"):
        ob.data.set_sharp_from_angle(angle=math.radians(angle))
    return ob


def bevel(ob, width, segments=4, angle=40):
    """A real rounded edge (bevel modifier). Every hard edge in a hero shot needs one."""
    m = ob.modifiers.new("bevel", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(angle)
    m.harden_normals = False
    return ob


def bounds(ob):
    """World-space (min, max) corners of an object and all its mesh children."""
    bpy.context.view_layer.update()
    pts = []
    for o in [ob] + list(ob.children_recursive):
        if o.type == "MESH":
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    if not pts:
        return Vector(ob.location), Vector(ob.location)
    return (Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)]))


def import_asset(path, size=None, location=(0, 0, 0), rotation=0.0, drop=(), name=None):
    """Import a .gltf, .glb or .blend (all its objects) under one parent empty and return the empty.
    size: scale so the largest side is this many meters. The asset then sits on `location`
    (bottom centre). rotation: degrees around Z. drop: skip objects whose name contains any of these words."""
    path = os.path.abspath(path)
    before = set(bpy.data.objects)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".gltf", ".glb"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".blend":
        with bpy.data.libraries.load(path, link=False) as (src, dst):
            dst.objects = list(src.objects)
        for o in dst.objects:
            if o is not None and not o.users_collection:
                _link(o)
    else:
        raise ValueError(f"import_asset: use .gltf, .glb or .blend, not {ext}")
    new = [o for o in bpy.data.objects if o not in before]
    for o in list(new):
        if any(w.lower() in o.name.lower() for w in drop):
            new.remove(o)
            bpy.data.objects.remove(o)
    root = _link(bpy.data.objects.new(name or os.path.splitext(os.path.basename(path))[0], None))
    for o in new:
        if o.parent is None or o.parent not in new:
            o.parent = root
    root.rotation_euler[2] = math.radians(rotation)
    lo, hi = bounds(root)
    dims = hi - lo
    k = size / max(dims) if size and max(dims) > 0 else 1.0
    root.scale = (k, k, k)
    root.location = Vector(location) - k * Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    bpy.context.view_layer.update()
    log(f"imported {os.path.basename(path)}: {len(new)} objects, {dims.x * k:.3f} x {dims.y * k:.3f} x {dims.z * k:.3f} m")
    return root


def sweep(name="sweep", c="#e9e4dc", width=6.0, depth=4.0, height=3.0, radius=1.2, mat=None):
    """A studio sweep (cyclorama): floor that curves up into a back wall, no corner line.
    The floor is at z=0, the curve starts at y=0 and the wall stands at y=radius."""
    import bmesh
    prof = [(-depth, 0.0), (0.0, 0.0)]
    for i in range(1, 25):
        a = math.pi / 2 * i / 24
        prof.append((radius * math.sin(a), radius * (1 - math.cos(a))))
    prof.append((radius, height))
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rows = [[bm.verts.new((x, y, z)) for (y, z) in prof] for x in (-width / 2, width / 2)]
    for i in range(len(prof) - 1):
        bm.faces.new((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.shade_smooth()
    me.materials.append(mat or pbr(name, c, roughness=0.6))
    return ob


def pedestal(name="pedestal", radius=0.2, height=0.12, mat=None, edge=0.006, location=(0, 0, 0)):
    """A round plinth with softly rounded edges; the top is at location z + height."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=radius, depth=height,
                                        location=(location[0], location[1], location[2] + height / 2))
    ob = bpy.context.object
    ob.name = name
    bevel(ob, edge, 5, 50)
    smooth(ob, 50)
    ob.data.materials.append(mat or pbr(name, "#f4f1ec", kind="ceramic"))
    return ob


# ---------------------------------------------------------------- lights
def aim(ob, target):
    ob.rotation_euler = (Vector(target) - ob.location).to_track_quat("-Z", "Y").to_euler()


def area(name, loc, target, power, c=NEUTRAL, size=1.0, size_y=None, spread=180):
    """An area light (power in watts) aimed at target, hidden from the camera."""
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power
    ld.color = _rgb(c)
    ld.shape = "RECTANGLE" if size_y else "SQUARE"
    ld.size = size
    if size_y:
        ld.size_y = size_y
    ld.spread = math.radians(spread)
    ob = _link(bpy.data.objects.new(name, ld))
    ob.location = loc
    ob.visible_camera = False
    aim(ob, target)
    return ob


def key(target, loc, power=200, c=WARM, size=1.0):
    """The main light: big, soft, warm, 30 to 50 degrees to the side and above."""
    return area("key", loc, target, power, c, size)


def rim(target, loc, power=300, c=NEUTRAL, size=0.25, length=1.2):
    """A strip light behind the hero that draws a bright edge around it. Use one per world."""
    return area("rim", loc, target, power, c, size, length, spread=60)


def fill(target, loc, power=40, c=COOL, size=2.0):
    """A weak, big, cool light on the other side so shadows are not black."""
    return area("fill", loc, target, power, c, size)


def flag(target, loc, w=0.4, h=0.4, name="flag"):
    """Negative fill: a black card the camera cannot see. It stops a dark or glossy hero from turning
    grey by reflecting a bright set (Cycles shows this much more than EEVEE)."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = (w, h, 1)
    ob.visible_camera = False
    ob.visible_shadow = False
    aim(ob, target)
    ob.data.materials.append(pbr(name, (0.0, 0.0, 0.0), roughness=1.0))
    return ob


# ---------------------------------------------------------------- camera and motion
def camera(loc, target, lens=50, fstop=2.8, focus=None, name="cam"):
    """A camera aimed at `target` (an empty it tracks), with depth of field focused on `focus`
    (a point; default the target). Returns the camera; move() animates it."""
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = 36
    ob = _link(bpy.data.objects.new(name, cd))
    ob.location = loc
    t = _link(bpy.data.objects.new(f"{name}_aim", None))
    t.location = target
    f = _link(bpy.data.objects.new(f"{name}_focus", None))
    f.location = focus if focus is not None else target
    c = ob.constraints.new("TRACK_TO")
    c.target = t
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = fstop
    cd.dof.aperture_blades = 9
    cd.dof.focus_object = f
    bpy.context.scene.camera = ob
    return ob


def ease(t, kind="smooth"):
    """smooth: slow start and end (the default for camera moves). in: slow start. out: slow end."""
    t = min(1.0, max(0.0, t))
    if kind == "smooth":
        return t * t * t * (t * (t * 6 - 15) + 10)
    if kind == "in":
        return t * t * t
    if kind == "out":
        return 1 - (1 - t) ** 3
    raise ValueError("ease is smooth, in or out")


def _lerp(a, b, t):
    return Vector(a).lerp(Vector(b), t)


def animate(ob, path, f0, f1, v0, v1, kind="smooth"):
    """Key `ob.<path>` on every frame from f0 to f1, eased from v0 to v1 (numbers or vectors)."""
    for f in range(f0, f1 + 1):
        t = ease((f - f0) / max(1, f1 - f0), kind)
        v = v0 + (v1 - v0) * t if isinstance(v0, (int, float)) else tuple(_lerp(v0, v1, t))
        setattr(ob, path, v)
        ob.keyframe_insert(path, frame=f)


def move(cam, f0, f1, start, end, center=None, kind="smooth", handheld=0.0):
    """A motivated camera move, keyed on every frame with an ease (no linear robot moves).
    start and end: dicts with loc, and optional aim, focus, lens, fstop.
    center: when given, the camera travels on an arc around it (angle, distance and height
    blend separately), so a push in plus an orbit reads as one smooth move.
    handheld: off by default; 0.002 (meters) adds a slight, slow hand-held drift."""
    aim_ob = cam.constraints[0].target
    focus_ob = cam.data.dof.focus_object
    c = Vector(center) if center is not None else None

    def polar(p):
        d = Vector(p) - c
        return math.hypot(d.x, d.y), math.atan2(d.y, d.x), d.z

    if c is not None:
        r0, a0, z0 = polar(start["loc"])
        r1, a1, z1 = polar(end["loc"])
        if a1 - a0 > math.pi:
            a1 -= 2 * math.pi
        elif a0 - a1 > math.pi:
            a1 += 2 * math.pi
    for f in range(f0, f1 + 1):
        t = ease((f - f0) / max(1, f1 - f0), kind)
        if c is None:
            cam.location = _lerp(start["loc"], end["loc"], t)
        else:
            r, a, z = r0 + (r1 - r0) * t, a0 + (a1 - a0) * t, z0 + (z1 - z0) * t
            cam.location = c + Vector((r * math.cos(a), r * math.sin(a), z))
        cam.keyframe_insert("location", frame=f)
        for ob, k in ((aim_ob, "aim"), (focus_ob, "focus")):
            if k in start and k in end:
                ob.location = _lerp(start[k], end[k], t)
                ob.keyframe_insert("location", frame=f)
        for k, owner, attr in (("lens", cam.data, "lens"), ("fstop", cam.data.dof, "aperture_fstop")):
            if k in start and k in end:
                setattr(owner, attr, start[k] + (end[k] - start[k]) * t)
                owner.keyframe_insert(attr, frame=f)
    if handheld > 0:
        for fc in fcurves(aim_ob):
            if fc.data_path == "location":
                n = fc.modifiers.new("NOISE")
                n.scale = 40.0
                n.strength = handheld * 2
                n.phase = 13.0 * fc.array_index + 1.0


def fcurves(ob_or_data):
    """All F-curves of an object or datablock (works with Blender 4.x actions and 5.x layered actions)."""
    ad = getattr(ob_or_data, "animation_data", None)
    out = []
    if ad and ad.action:
        for layer in getattr(ad.action, "layers", []):
            for strip in layer.strips:
                for bag in strip.channelbags:
                    out += list(bag.fcurves)
        if not out:
            out = list(getattr(ad.action, "fcurves", []) or [])
    return out


# ---------------------------------------------------------------- output and render
def output(w=1080, h=1920, fps=30, frames=(1, 90), folder="renders/shot", scale=1.0, shot="shot", overwrite=False):
    """Set size, frame rate, range and PNG output into `folder`.
    Refuses a folder that already holds frames from another shot, a test render (scale < 1) into
    a final folder or the other way round, and a finished render unless overwrite is set."""
    s = bpy.context.scene
    s.render.resolution_x, s.render.resolution_y = w, h
    s.render.resolution_percentage = max(1, round(scale * 100))
    s.render.fps = fps
    s.frame_start, s.frame_end = min(frames), max(frames)
    st = s.render.image_settings
    st.file_format = "PNG"
    st.color_mode = "RGB"
    st.color_depth = "8"
    st.compression = 15
    folder = os.path.abspath(folder)
    kind = "final" if scale >= 1 else "test"
    marker = os.path.join(folder, ".shot.json")
    has_frames = os.path.isdir(folder) and any(f.endswith(".png") for f in os.listdir(folder))
    if has_frames:
        if not os.path.exists(marker):
            raise SystemExit(f"kit3d: {folder} already holds frames from an unknown shot. Use a new folder.")
        with open(marker, encoding="utf-8") as fh:
            m = json.load(fh)
        if m.get("shot") != shot:
            raise SystemExit(f"kit3d: {folder} holds frames of shot '{m.get('shot')}', not '{shot}'. Use a new folder.")
        if m.get("kind") != kind:
            raise SystemExit(f"kit3d: {folder} holds {m.get('kind')} frames; this is a {kind} render "
                             "(test renders and final frames never share a folder). Use another folder.")
        if os.path.exists(os.path.join(folder, ".done")) and not overwrite:
            raise SystemExit(f"kit3d: {folder} is a finished render. Keep drafts: render into a new folder, "
                             "or pass --overwrite.")
    os.makedirs(folder, exist_ok=True)
    with open(marker, "w", encoding="utf-8") as fh:
        json.dump({"shot": shot, "kind": kind, "size": [w, h], "scale": scale, "fps": fps}, fh)
    _state.update(folder=folder, shot=shot, overwrite=overwrite)
    return folder


def _render_one(folder, f):
    s = bpy.context.scene
    s.frame_set(f)
    s.render.filepath = os.path.join(folder, f"f{f:04d}.png")
    t = time.time()
    bpy.ops.render.render(write_still=True)
    return time.time() - t


def render(frames=None):
    """Render frames into the output() folder. Skips frames already there (so a stopped render
    resumes), logs each frame to render.log, and writes a .done marker at the end."""
    folder = _state["folder"]
    if not folder:
        raise SystemExit("kit3d: call output() before render()")
    s = bpy.context.scene
    frames = list(frames or range(s.frame_start, s.frame_end + 1))
    done = os.path.join(folder, ".done")
    if os.path.exists(done):
        os.remove(done)
        if _state["overwrite"]:
            for f in os.listdir(folder):
                if f.endswith(".png"):
                    os.remove(os.path.join(folder, f))
    times = []
    with open(os.path.join(folder, "render.log"), "a", encoding="utf-8") as lg:
        lg.write(f"start {time.strftime('%Y-%m-%d %H:%M:%S')} shot {_state['shot']} engine {s.render.engine} "
                 f"{s.render.resolution_x}x{s.render.resolution_y} at {s.render.resolution_percentage}%\n")
        for i, f in enumerate(frames):
            if os.path.exists(os.path.join(folder, f"f{f:04d}.png")):
                continue
            sec = _render_one(folder, f)
            times.append(sec)
            line = f"frame {f} {sec:.1f} s ({i + 1}/{len(frames)})"
            lg.write(line + "\n")
            lg.flush()
            log(line)
        mean = sum(times) / len(times) if times else 0.0
        lg.write(f"done {len(frames)} frames, {mean:.2f} s/frame\n")
    with open(done, "w", encoding="utf-8") as fh:
        fh.write(f"{len(frames)} frames, {mean:.2f} s/frame\n")
    log(f"done: {len(frames)} frames in {folder}, {mean:.2f} s/frame")
    return mean


def measure(n=10, total=None):
    """Render n frames into a temp folder (never the final one) and print seconds per frame.
    The first frame also compiles shaders, so it is reported apart."""
    s = bpy.context.scene
    old = s.render.filepath
    tmp = tempfile.mkdtemp(prefix="kit3d-measure-")
    frames = list(range(s.frame_start, s.frame_end + 1))
    step = max(1, len(frames) // n)
    pick = frames[::step][:n]
    times = [_render_one(tmp, f) for f in pick]
    shutil.rmtree(tmp, ignore_errors=True)
    s.render.filepath = old
    steady = times[1:] or times
    per = sum(steady) / len(steady)
    total = total or len(frames)
    log(f"measure: first frame {times[0]:.1f} s (shader compile), then {per:.2f} s/frame over {len(steady)} frames")
    log(f"measure: the full shot ({total} frames) takes about {per * total / 60:.1f} min")
    return per


def run(a):
    """Finish a shot script: --measure N measures, else render a.frames."""
    if a.measure:
        return measure(a.measure)
    return render(a.frames)
