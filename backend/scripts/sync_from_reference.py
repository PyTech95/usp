"""Mirror published content, menus, theme and media of a reference USP deployment into this DB. Idempotent.
Usage: cd /app/backend && python scripts/sync_from_reference.py https://<reference-host>"""
import sys
import asyncio
import hashlib
from pathlib import Path
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core import db, now, put_object, PAGE_PATHS  # noqa: E402

REF = sys.argv[1].rstrip("/")
SITE_KEYS = ("site_name", "full_name", "tagline", "theme", "footer_text", "privacy_html", "contact", "social", "menus",
             "preview_banner", "indexing_enabled", "live_editor_enabled")


def get(path):
    r = requests.get(REF + path, timeout=60)
    r.raise_for_status()
    return r


def walk(o, found):
    if isinstance(o, dict):
        if o.get("media_id") and isinstance(o.get("media"), dict):
            found[o["media_id"]] = o["media"]
        out = {k: walk(v, found) for k, v in o.items() if k != "media"}
        return out
    if isinstance(o, list):
        return [walk(v, found) for v in o]
    return o


async def store_media(view, derived_from="", edit_log=""):
    mid = view["id"]
    if await db.media.find_one({"id": mid, "sync_ref": REF}):
        return
    derivs = []
    for s in view.get("srcs", []):
        r = get(s["url"].split("?")[0])
        ctype = r.headers.get("content-type", "image/jpeg").split(";")[0]
        path = f"uspindia/display/{mid}/sync-{s['w']}"
        await put_object(path, r.content, ctype)
        h = round(view["height"] * s["w"] / view["width"]) if view.get("width") else None
        derivs.append({"w": s["w"], "h": h, "path": path, "ctype": ctype})
        data, top_ctype = r.content, ctype
    orig_path = f"uspindia/originals/{mid}/sync"
    await put_object(orig_path, data, top_ctype)
    doc = {
        "id": mid, "filename": view.get("filename") or f"{mid}.jpg", "sha256": hashlib.sha256(data).hexdigest(), "size": len(data),
        "category": "synced", "title": "", "alt": view.get("alt", ""), "caption": view.get("caption", ""), "credit": view.get("credit", ""),
        "permitted_use": "", "authenticity": "edited_original" if derived_from else "original", "permission": "approved",
        "edit_approval": "approved", "permission_notes": f"Mirrored from approved public media on {REF}", "permission_expiry": "",
        "evidence_ref": "", "may_include_minors": False, "minor_approval_documented": False,
        "focal_desktop": view.get("focal_desktop") or {"x": 50, "y": 50}, "focal_mobile": view.get("focal_mobile") or {"x": 50, "y": 50},
        "version": 1, "versions": [], "derived_from": derived_from, "edit_log": edit_log, "archived_sources": [], "is_deleted": False,
        "uploaded_by": "sync from reference", "created_at": now(), "updated_at": now(), "kind": view.get("kind", "image"),
        "original_path": orig_path, "content_type": top_ctype, "width": view.get("width"), "height": view.get("height"),
        "derivs": derivs, "sync_ref": REF,
        "approval_log": [{"at": now(), "by": "sync from reference", "changes": {"permission": "approved", "edit_approval": "approved"}}],
    }
    await db.media.delete_many({"id": mid})
    await db.media.insert_one(doc)
    print("media", mid, doc["filename"])


async def store_all(found):
    for mid, view in found.items():
        o = view.get("original")
        if o:
            await store_media(o | {"filename": f"{mid}-original", "caption": view.get("caption", "")})
        await store_media(view, derived_from=o["id"] if o else "", edit_log=view.get("edit_note", ""))


async def main():
    site = get("/api/public/site").json()
    await db.settings.update_one({"key": "site"}, {"$set": {k: site[k] for k in SITE_KEYS if k in site} | {"updated_at": now()}})
    print("settings synced")
    for key in PAGE_PATHS:
        p = get(f"/api/public/pages/{key}").json()
        found = {}
        content = walk(p["content"], found)
        await store_all(found)
        await db.pages.update_one({"key": key}, {"$set": {"published": content, "draft": content, "status": "published",
                                                         "has_unpublished_changes": False, "updated_at": now(), "published_at": now()}})
        print("page", key)
    page, notes = 1, []
    while True:
        r = get(f"/api/public/notes?page={page}").json()
        items = r.get("items") or r.get("notes") or []
        notes += items
        if not items or page >= (r.get("pages") or 1):
            break
        page += 1
    for n in notes:
        full = get(f"/api/public/notes/{n['slug']}").json()
        note = full.get("note", full)
        found = {}
        clean = walk(note, found)
        await store_all(found)
        local = await db.notes.find_one({"slug": n["slug"]}, {"_id": 0, "id": 1})
        print("note", n["slug"], "exists" if local else "MISSING locally", list(clean.keys())[:20])

asyncio.run(main())
