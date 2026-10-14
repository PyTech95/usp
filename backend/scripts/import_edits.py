"""Import client-supplied edited versions (Oct 2026) as approved edited derivatives and swap their placements. Idempotent.
Usage: cd /app/backend && python scripts/import_edits.py /app/assets_src/edited"""
import asyncio
import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core import db, now, new_id  # noqa: E402
from routes_media import store_file  # noqa: E402

EDITS = {
    "11.webp": ("Original.jpeg", "weaver (edited)", "Client-supplied edited version: neighbouring person at the left edge removed; woman, basket and walking stick unchanged."),
    "22.webp": ("Original4.jpeg", "women weaving (edited)", "Client-supplied edited version: peripheral clean-up and exposure balance; all eight women, roof and both pillars retained."),
    "33.webp": ("WhatsApp Image 2026-09-21 at 12.58.20 AM.jpeg", "cloth dolls (edited)", "Client-supplied edited version: peripheral people and distractions removed; woman and both dolls unchanged."),
}
COPY = ("category", "alt", "caption", "credit", "permitted_use", "permission", "permission_notes", "focal_desktop", "focal_mobile",
        "may_include_minors", "minor_approval_documented", "permission_expiry", "evidence_ref")


def swap(node, mapping):
    if isinstance(node, dict):
        if node.get("media_id") in mapping:
            node["media_id"] = mapping[node["media_id"]]
        for v in node.values():
            swap(v, mapping)
    elif isinstance(node, list):
        for v in node:
            swap(v, mapping)


async def main(folder):
    mapping = {}
    for fname, (src_name, title, log) in EDITS.items():
        src = await db.media.find_one({"filename": src_name, "is_deleted": False, "derived_from": ""}, {"_id": 0})
        data = (Path(folder) / fname).read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        existing = await db.media.find_one({"sha256": sha, "is_deleted": False})
        if existing:
            mapping[src["id"]] = existing["id"]
            continue
        nid = new_id()
        stored = await store_file(nid, data, f"{Path(src_name).stem}-edited.webp", 1)
        await db.media.insert_one({**{k: src.get(k) for k in COPY}, "id": nid, "filename": f"{Path(src_name).stem}-edited.webp", "sha256": sha, "size": len(data),
                                   "title": title, "authenticity": "edited_original", "edit_approval": "approved", "edit_log": log, "derived_from": src["id"],
                                   "version": 1, "versions": [], "archived_sources": [], "is_deleted": False, "uploaded_by": "client (edited set, Oct 2026)",
                                   "approval_log": [{"at": now(), "by": "client confirmation (recorded by build agent)", "changes": {"edit_approval": "approved"}}],
                                   "created_at": now(), "updated_at": now(), **stored})
        mapping[src["id"]] = nid
        print("imported", fname, "->", nid)
    async for p in db.pages.find({}, {"_id": 0}):
        swap(p["draft"], mapping)
        swap(p["published"], mapping)
        await db.pages.update_one({"key": p["key"]}, {"$set": {"draft": p["draft"], "published": p["published"], "updated_at": now()}})
    print("placements swapped", len(mapping))


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))
