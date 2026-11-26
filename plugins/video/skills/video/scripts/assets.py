#!/usr/bin/env python3
"""Find and download free CC0 assets (HDRIs, 3D models, PBR textures) for Blender shots.

Sources (both publish every asset under CC0 1.0, checked November 26, 2026):
  Poly Haven  api.polyhaven.com          HDRIs, models, textures
  ambientCG   ambientcg.com/api/v3       PBR materials (textures)

Poly Haven's API terms ask every client to send its own User-Agent and to show users
where the content comes from. So this tool sends "video-skill", search output ends with
"Powered by Poly Haven", and every download adds a line to CREDITS.md.

Usage:
  python assets.py search --type model --q "vintage camera" [--limit 10] [--json]
  python assets.py get Camera_01 --type model [--res 2k] [--format gltf|blend] --dest <project>/.video/assets
  python assets.py get photo_studio_01 --type hdri [--format hdr|exr] --dest ...
  python assets.py get Metal009 --type texture --dest ...        (ambientCG ids work too)

Downloads land in a user cache shared by all projects (VIDEO_SKILL_CACHE overrides it):
  Windows %LOCALAPPDATA%/video-skill, macOS ~/Library/Caches/video-skill, Linux ~/.cache/video-skill
then get copied into <dest>/<id>/. The last line `get` prints is the path to load in Blender:
the .gltf, .blend or .hdr file, or the texture folder.

Exit codes: 0 ok, 1 not found or bad input, 2 offline or the server failed.
Standard library only.
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

USER_AGENT = "video-skill/1.0"
PH_API = "https://api.polyhaven.com"
ACG_API = "https://ambientcg.com/api/v3/assets"
PH_TYPES = {"hdri": "hdris", "model": "models", "texture": "textures"}
PH_MAPS = ["Diffuse", "Rough", "nor_gl", "Metal", "arm", "AO", "Displacement"]
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".exr", ".hdr", ".tif", ".tiff")
TIMEOUT = 30
RETRIES = 4


class NotFound(Exception):
    pass


class Offline(Exception):
    pass


# ---------------------------------------------------------------- cache and network
def cache_root():
    env = os.environ.get("VIDEO_SKILL_CACHE")
    if env:
        root = Path(env)
    elif sys.platform == "win32":
        root = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData/Local") / "video-skill"
    elif sys.platform == "darwin":
        root = Path.home() / "Library/Caches/video-skill"
    else:
        root = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache") / "video-skill"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _open(url):
    """Open a URL with retries. 404 raises NotFound; no network after all retries raises Offline."""
    last = None
    for attempt in range(RETRIES):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            return urllib.request.urlopen(req, timeout=TIMEOUT)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise NotFound(url)
            last = e
            wait = 2 ** attempt
            if e.code == 429:
                try:
                    wait = max(wait, int(e.headers.get("Retry-After", wait)))
                except ValueError:
                    pass
            elif e.code < 500:
                raise Offline(f"{url} answered HTTP {e.code}")
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last = e
            wait = 2 ** attempt
        if attempt < RETRIES - 1:
            time.sleep(min(wait, 30))
    host = urllib.parse.urlparse(url).netloc
    raise Offline(f"could not reach {host} after {RETRIES} tries ({last}). Check the internet connection.")


def get_json(url):
    with _open(url) as r:
        return json.loads(r.read().decode("utf-8"))


def download(url, path, size=None, md5=None):
    """Download url to path (atomic). Skips the download when the file is already there with the right size."""
    path = Path(path)
    if path.exists() and (size is None or path.stat().st_size == size):
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_name(path.name + ".part")
    for attempt in range(RETRIES):
        h = hashlib.md5()
        try:
            with _open(url) as r, open(part, "wb") as f:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk:
                        break
                    f.write(chunk)
                    h.update(chunk)
        except (OSError, urllib.error.URLError) as e:
            if attempt == RETRIES - 1:
                raise Offline(f"download of {url} failed: {e}")
            time.sleep(2 ** attempt)
            continue
        if md5 and h.hexdigest() != md5:
            if attempt == RETRIES - 1:
                raise Offline(f"download of {url} was corrupt (md5 mismatch) {RETRIES} times")
            continue
        os.replace(part, path)
        return path
    raise Offline(f"download of {url} failed")


# ---------------------------------------------------------------- search
def _ph_index(kind):
    """Poly Haven asset list for one type (names, authors), cached for a day."""
    f = cache_root() / f"polyhaven-{PH_TYPES[kind]}.json"
    if f.exists() and time.time() - f.stat().st_mtime < 86400:
        return json.loads(f.read_text(encoding="utf-8"))
    data = get_json(f"{PH_API}/assets?type={PH_TYPES[kind]}")
    f.write_text(json.dumps(data), encoding="utf-8")
    return data


def search(kind, q, limit=10):
    """Return [{source, id, name, note, url}], Poly Haven first, then ambientCG for textures."""
    out = []
    q = " ".join(q.split()).lower()
    query = urllib.parse.urlencode({"q": q, "t": PH_TYPES[kind], "limit": limit})
    slugs = [r["slug"] for r in get_json(f"{PH_API}/search?{query}").get("results", [])]
    try:
        index = _ph_index(kind)
    except Offline:
        index = {}
    for slug in slugs[:limit]:
        a = index.get(slug, {})
        note = ", ".join(a.get("categories", [])[:3])
        if kind == "model" and a.get("dimensions"):
            note += "  size " + "x".join(str(round(v)) for v in a["dimensions"]) + " mm"
        out.append({"source": "polyhaven", "id": slug, "name": a.get("name", slug), "note": note,
                    "url": f"https://polyhaven.com/a/{slug}"})
    if kind == "texture":
        query = urllib.parse.urlencode({"type": "material", "q": q, "limit": limit, "include": "title,tags"})
        try:
            for a in get_json(f"{ACG_API}?{query}").get("assets", []):
                out.append({"source": "ambientcg", "id": a["id"], "name": a.get("title") or a["id"],
                            "note": ", ".join(a.get("tags", [])[:4]),
                            "url": f"https://ambientcg.com/view?id={a['id']}"})
        except (Offline, NotFound) as e:
            print(f"note: ambientCG search failed: {e}", file=sys.stderr)
    return out


# ---------------------------------------------------------------- get
def _num(res):
    return int("".join(c for c in res if c.isdigit()) or 0)


def _pick_res(tree, res, what):
    """The asked resolution, else the biggest one below it, else the smallest there is."""
    if res in tree:
        return res
    have = sorted(tree, key=_num)
    if not have:
        raise NotFound(f"{what} has no files")
    lower = [r for r in have if _num(r) <= _num(res)]
    pick = lower[-1] if lower else have[0]
    print(f"note: {what} has no {res}; using {pick} (has {', '.join(have)})", file=sys.stderr)
    return pick


def _get_polyhaven(asset_id, kind, res, fmt):
    info = get_json(f"{PH_API}/info/{urllib.parse.quote(asset_id)}")
    want = {"hdri": 0, "texture": 1, "model": 2}[kind]
    if info.get("type") != want:
        raise NotFound(f"Poly Haven asset {asset_id} is not a {kind}")
    files = get_json(f"{PH_API}/files/{urllib.parse.quote(asset_id)}")
    if kind == "hdri":
        fmt = fmt or "hdr"
        res = _pick_res(files["hdri"], res, asset_id)
        folder = cache_root() / "polyhaven" / asset_id / res
        e = files["hdri"][res][fmt]
        main = download(e["url"], folder / e["url"].rsplit("/", 1)[1], e.get("size"), e.get("md5"))
    elif kind == "model":
        fmt = fmt or "gltf"
        if fmt not in files:
            raise NotFound(f"{asset_id} has no {fmt} file (has {', '.join(k for k in ('gltf', 'blend', 'fbx') if k in files)})")
        res = _pick_res(files[fmt], res, asset_id)
        folder = cache_root() / "polyhaven" / asset_id / res
        e = files[fmt][res][fmt]
        main = download(e["url"], folder / e["url"].rsplit("/", 1)[1], e.get("size"), e.get("md5"))
        for rel, inc in e.get("include", {}).items():
            target = (folder / rel).resolve()
            if folder.resolve() not in target.parents:
                raise NotFound(f"unsafe path in file list: {rel}")
            download(inc["url"], target, inc.get("size"), inc.get("md5"))
    else:
        maps = [m for m in PH_MAPS if m in files] or [k for k in files if k not in ("blend", "gltf", "mtlx")]
        res = _pick_res(files[maps[0]], res, asset_id)
        folder = cache_root() / "polyhaven" / asset_id / res
        for m in maps:
            if res not in files[m]:
                continue
            ext = "jpg" if "jpg" in files[m][res] else "png" if "png" in files[m][res] else next(iter(files[m][res]))
            e = files[m][res][ext]
            download(e["url"], folder / e["url"].rsplit("/", 1)[1], e.get("size"), e.get("md5"))
        main = folder
    meta = {"source": "Poly Haven", "id": asset_id, "name": info.get("name", asset_id),
            "author": ", ".join(info.get("authors", {})) or "Poly Haven",
            "url": f"https://polyhaven.com/a/{asset_id}", "main": str(Path(main).relative_to(folder))}
    return folder, meta


def _get_ambientcg(asset_id, res):
    query = urllib.parse.urlencode({"id": asset_id, "include": "title,downloads"})
    assets = get_json(f"{ACG_API}?{query}").get("assets", [])
    if not assets:
        raise NotFound(f"ambientCG has no asset {asset_id}")
    a = assets[0]
    by_attr = {d["attributes"]: d for d in a.get("downloads", []) if d.get("extension") == "zip"}
    want = [f"{res.upper()}-JPG", f"{res.upper()}-PNG", "2K-JPG", "1K-JPG"]
    attr = next((w for w in want if w in by_attr), None)
    if not attr:
        raise NotFound(f"ambientCG {asset_id} has no {res} download (has {', '.join(by_attr)})")
    d = by_attr[attr]
    folder = cache_root() / "ambientcg" / asset_id / attr
    if not any(p.suffix.lower() in IMAGE_EXT for p in folder.glob("*")):
        z = download(d["url"], folder / f"{asset_id}_{attr}.zip", d.get("size"))
        with zipfile.ZipFile(z) as zf:
            for name in zf.namelist():
                base = Path(name).name
                if base and Path(base).suffix.lower() in IMAGE_EXT:
                    with zf.open(name) as src, open(folder / base, "wb") as dst:
                        shutil.copyfileobj(src, dst)
        z.unlink()
    meta = {"source": "ambientCG", "id": asset_id, "name": a.get("title") or asset_id, "author": "ambientCG",
            "url": f"https://ambientcg.com/view?id={asset_id}", "main": "."}
    return folder, meta


def _cached(source, asset_id, kind, res):
    """The newest complete cache folder for this asset, used when the network is down."""
    base = cache_root() / source / asset_id
    for meta_file in sorted(base.glob("*/meta.json"), key=lambda p: (p.parent.name != res, -p.stat().st_mtime)):
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        if meta.get("kind") == kind:
            return meta_file.parent, meta
    return None


def credit(dest, meta):
    """Append one line per asset to <dest>/CREDITS.md (no duplicates)."""
    f = Path(dest) / "CREDITS.md"
    text = f.read_text(encoding="utf-8") if f.exists() else (
        "# Asset credits\n\nEvery asset below is CC0 1.0 (public domain), so credit is not required, but we keep it.\n"
        "Poly Haven assets were found with the Poly Haven API: Powered by Poly Haven (polyhaven.com).\n\n")
    if meta["url"] in text:
        return
    line = f"- {meta['name']} ({meta['id']}), by {meta['author']}, {meta['source']}, {meta['url']}, licence CC0 1.0\n"
    f.write_text(text + line, encoding="utf-8")


def get(asset_id, kind, dest, res="2k", fmt=None):
    """Download one asset (or reuse the cache), copy it into <dest>/<id>/, log the credit. Returns the path to load."""
    source = None
    if ":" in asset_id:
        source, asset_id = asset_id.split(":", 1)
        source = source.lower()
    if source not in (None, "polyhaven", "ambientcg"):
        raise NotFound(f"unknown source {source}: use polyhaven: or ambientcg:")
    if source == "ambientcg" and kind != "texture":
        raise NotFound("ambientCG is used for textures only here")
    try:
        if source == "ambientcg":
            folder, meta = _get_ambientcg(asset_id, res)
        else:
            try:
                folder, meta = _get_polyhaven(asset_id, kind, res, fmt)
            except NotFound:
                if source is None and kind == "texture":
                    folder, meta = _get_ambientcg(asset_id, res)
                else:
                    raise
        meta["kind"] = kind
        (folder / "meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    except Offline as e:
        hit = None
        for src in ([source] if source else ["polyhaven", "ambientcg"]):
            hit = hit or _cached(src, asset_id, kind, res)
        if not hit:
            raise Offline(f"{e}\nThe asset is not in the cache either ({cache_root()}).")
        folder, meta = hit
        print(f"note: offline, using the cached copy in {folder}", file=sys.stderr)
    dest = Path(dest)
    target = dest / meta["id"]
    shutil.copytree(folder, target, dirs_exist_ok=True, ignore=shutil.ignore_patterns("*.part", "*.zip"))
    credit(dest, meta)
    return (target / meta["main"]).resolve()


# ---------------------------------------------------------------- command line
def main(argv=None):
    ap = argparse.ArgumentParser(description="Free CC0 assets from Poly Haven and ambientCG.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search", help="find assets by words")
    s.add_argument("--type", required=True, choices=sorted(PH_TYPES))
    s.add_argument("--q", required=True, help="words, for example: brushed metal")
    s.add_argument("--limit", type=int, default=10)
    s.add_argument("--json", action="store_true", help="print JSON instead of a table")
    g = sub.add_parser("get", help="download one asset into the project")
    g.add_argument("id", help="asset id; prefix polyhaven: or ambientcg: to pick the source")
    g.add_argument("--type", required=True, choices=sorted(PH_TYPES))
    g.add_argument("--res", default="2k", help="1k, 2k, 4k ... (default 2k)")
    g.add_argument("--format", help="models: gltf (default) or blend; HDRIs: hdr (default) or exr")
    g.add_argument("--dest", required=True, help="<project>/.video/assets")
    a = ap.parse_args(argv)
    try:
        if a.cmd == "search":
            rows = search(a.type, a.q, a.limit)
            if a.json:
                print(json.dumps(rows, indent=1))
            else:
                for r in rows:
                    print(f"{r['source']}:{r['id']:<32} {r['name']:<34} {r['note']}")
                if not rows:
                    print("no results; try other words")
                if any(r["source"] == "polyhaven" for r in rows):
                    print("Powered by Poly Haven (polyhaven.com). All results are CC0.")
        else:
            print(get(a.id, a.type, a.dest, a.res, a.format))
    except NotFound as e:
        print(f"error: not found: {e}", file=sys.stderr)
        return 1
    except Offline as e:
        print(f"error: offline: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
