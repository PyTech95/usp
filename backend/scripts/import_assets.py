"""Import the client-supplied photo set into the Media Library (idempotent).
Usage: cd /app/backend && python scripts/import_assets.py /app/assets_src/imgs
Originals are stored untouched; statuses follow the client's Photo Asset Guide. Nothing is approved for public use."""
import asyncio
import hashlib
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from PIL import Image, ImageChops  # noqa: E402
from core import db, now, new_id  # noqa: E402
from routes_media import store_file  # noqa: E402

# filename: (key, category, authenticity, permission, alt, caption, note)
CATALOG = {
    "Original4.jpeg": ("group", "craft", "original", "pending", "Eight women seated beneath a roof with basket-making materials around them.", "Women working with basket-making materials beneath a shaded roof.", "Preferred Home / Craft candidate (selection not final)."),
    "New8.png": ("ai_group", "private-reference", "ai_reference", "restricted", "", "", "AI reference only. Never public; not a retouching source."),
    "Original.jpeg": ("weaver", "craft", "original", "pending", "An older woman weaving a green-and-yellow basket, a walking stick beside her.", "A woman weaving a green-and-yellow basket.", ""),
    "New1.png": ("ai_weaver", "private-reference", "ai_reference", "restricted", "", "", "AI reference only. Adds baskets not in the original."),
    "WhatsApp Image 2026-09-21 at 12.58.20 AM.jpeg": ("dolls", "craft", "unverified", "pending", "A woman holding two dressed cloth dolls.", "A woman displaying two dressed cloth dolls.", "Unmarked source candidate."),
    "WhatsApp Image 2026-10-10 at 9.46.01 AM.jpeg": ("dolls_alt", "craft", "unverified", "pending", "A woman holding two dressed cloth dolls.", "A woman displaying two dressed cloth dolls.", "Near-duplicate of the 12.58.20 AM doll photo; not byte-identical. Do not show both."),
    "image(20261010-060344).png": ("dolls_marked", "private-reference", "unverified", "restricted", "", "", "Private editing instructions (red arrows). Never public."),
    "image(20261010-060354).png": ("basket_collection", "craft", "unverified", "pending", "Colourful woven baskets and handmade objects arranged on the ground, seen from above.", "Colourful woven baskets and handmade objects arranged for display.", "Confirm source status."),
    "WhatsApp Image 2026-10-10 at 10.10.24 AM.jpeg": ("reading", "learning", "unverified", "pending", "A group of people seated together reading printed materials.", "Participants reading together with printed materials.", "Theatre vs Workshops assignment, event and date unconfirmed."),
    "WhatsApp Image 2026-10-10 at 10.16.09 AM.jpeg": ("bowls", "craft", "unverified", "pending", "Women holding up decorated bowls.", "Decorated handmade bowls displayed by participants.", "Papier-mâché classification to be confirmed."),
    "image(20261010-060428).png": ("blue_basket", "craft", "unverified", "pending", "A blue woven basket.", "A blue woven basket.", "Low-resolution screenshot source; small module only."),
    "image(20261010-060445).png": ("textile", "craft", "unverified", "pending", "A framed textile wall hanging with animal and bird motifs against a brick wall.", "A textile wall hanging with animal and bird motifs.", "Attribution and permission needed."),
    "image(20261010-060504).png": ("mango_a", "craft", "unverified", "pending", "A green woven basket containing mangoes, close framing.", "A green woven basket containing mangoes.", "Provenance unresolved: differs from the wider version. Client to designate original."),
    "image(20261010-060511).png": ("mango_b", "craft", "unverified", "pending", "A green woven basket containing mangoes, wider view.", "A green woven basket containing mangoes.", "Provenance unresolved: differs from the close version. Client to designate original."),
    "WhatsApp Image 2026-10-10 at 10.22.40 AM.jpeg": ("brick_house", "owner-permission-required", "unverified", "restricted", "", "", "OWNER PERMISSION REQUIRED. Not a restoration project, USP property, venue or archaeological structure."),
    "image(20261010-060534).png": ("figures", "craft", "unverified", "pending", "Small handmade figures, bowls and other objects displayed on the ground.", "Small handmade figures and bowls on display.", "Papier-mâché candidate; no invented material specs."),
    "image(20261010-060550).png": ("door", "heritage", "unverified", "pending", "A carved wooden door with weathered surface detail.", "A carved wooden door with weathered surface detail.", "Canonical record for the two identical door uploads."),
    "image(20261010-060554).png": ("door_dup", None, None, None, None, None, None),
    "image(20261010-060607).png": ("tall_object", "craft", "unverified", "pending", "A tall handmade object with branching bowl-like forms.", "A tall handmade object with branching bowl-like forms.", "Papier-mâché candidate; name and function unconfirmed."),
    "image(20261010-060807).png": ("brief_screenshot", "private-reference", "unverified", "restricted", "", "", "WhatsApp brief screenshot. Private; never publish."),
}
REGISTER_LINKS = {"Women weaving under the roof": ["group", "ai_group"], "Older woman weaving green-and-yellow basket": ["weaver", "ai_weaver"],
                  "Woman with two cloth dolls": ["dolls", "dolls_alt", "dolls_marked"], "Basket collection": ["basket_collection"], "Blue basket": ["blue_basket"],
                  "Green basket with mangoes": ["mango_a", "mango_b"], "Reading circle": ["reading"], "Papier-mâché bowls, small figures, tall object": ["bowls", "figures", "tall_object"],
                  "Textile wall hanging": ["textile"], "Carved wooden door": ["door"], "Overgrown brick house": ["brick_house"]}


def trim_border(data):
    """Conservative screenshot-border removal: crops uniform edge colour only."""
    im = Image.open(io.BytesIO(data)).convert("RGB")
    bg = Image.new("RGB", im.size, im.getpixel((0, 0)))
    box = ImageChops.difference(im, bg).point(lambda p: 255 if p > 18 else 0).getbbox()
    if not box or box == (0, 0) + im.size:
        return None, None
    buf = io.BytesIO()
    im.crop(box).save(buf, "PNG")
    return buf.getvalue(), box


async def main(folder):
    ids = {}
    for fname, (key, cat, auth, perm, alt, cap, note) in CATALOG.items():
        data = (Path(folder) / fname).read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        existing = await db.media.find_one({"sha256": sha, "is_deleted": False})
        if existing:
            if key == "door_dup" and not any(a["filename"] == fname for a in existing.get("archived_sources", [])):
                await db.media.update_one({"id": existing["id"]}, {"$push": {"archived_sources": {"filename": fname, "uploaded_at": now(), "by": "import", "sha256": sha}}})
            ids[key] = existing["id"]
            continue
        mid = new_id()
        stored = await store_file(mid, data, fname, 1)
        await db.media.insert_one({"id": mid, "filename": fname, "sha256": sha, "size": len(data), "category": cat, "title": key.replace("_", " "),
                                   "alt": alt, "caption": cap, "credit": "", "permitted_use": "", "authenticity": auth, "permission": perm, "edit_approval": "pending",
                                   "permission_notes": note, "permission_expiry": "", "evidence_ref": "", "may_include_minors": False, "minor_approval_documented": False,
                                   "focal_desktop": {"x": 50, "y": 50}, "focal_mobile": {"x": 50, "y": 50}, "version": 1, "versions": [], "derived_from": "",
                                   "archived_sources": [], "is_deleted": False, "uploaded_by": "import (client photo set)", "created_at": now(), "updated_at": now(), **stored})
        ids[key] = mid
        print("imported", fname)

    if not await db.media.find_one({"derived_from": ids["blue_basket"]}):
        data, box = trim_border((Path(folder) / "image(20261010-060428).png").read_bytes())
        if data:
            nid = new_id()
            stored = await store_file(nid, data, "blue-basket-border-removed.png", 1)
            src = await db.media.find_one({"id": ids["blue_basket"]}, {"_id": 0})
            await db.media.insert_one({**{k: src[k] for k in ("category", "alt", "caption", "credit", "permitted_use", "permission", "permission_notes", "focal_desktop", "focal_mobile", "may_include_minors", "minor_approval_documented", "permission_expiry", "evidence_ref")},
                                       "id": nid, "filename": "blue-basket-border-removed.png", "sha256": hashlib.sha256(data).hexdigest(), "size": len(data), "title": "blue basket (border removed)",
                                       "authenticity": "edited_original", "edit_approval": "pending", "edit_log": f"Removed uniform screenshot border only (crop box {box}). No retouching, no resizing.",
                                       "derived_from": ids["blue_basket"], "version": 1, "versions": [], "archived_sources": [], "is_deleted": False, "uploaded_by": "import", "created_at": now(), "updated_at": now(), **stored})
            ids["blue_basket_edit"] = nid
            print("derivative created for blue basket", box)
    else:
        ids["blue_basket_edit"] = (await db.media.find_one({"derived_from": ids["blue_basket"]}))["id"]

    for subject, keys in REGISTER_LINKS.items():
        await db.register.update_one({"subject": subject}, {"$set": {"media_ids": [ids[k] for k in keys if k in ids], "status": "uploaded — awaiting permission"}})

    await place(ids)
    print("done")


async def place(ids):
    """Propose placements in drafts AND published content. Ineligible photos never render publicly; they show only in private preview."""
    plan = {
        "home": {("hero", 0): ids["group"], ("image_text", 0): ids["weaver"]},
        "craft-livelihood": {("hero", 0): ids["weaver"], ("image_text", 0): ids["basket_collection"], ("image_text", 1): ids["dolls"],
                             ("image_text", 2): ids["bowls"], ("image_text", 3): ids["textile"]},
        "our-work": {("hero", 0): ids["group"]},
    }
    for key, slots in plan.items():
        p = await db.pages.find_one({"key": key}, {"_id": 0})
        changed = False
        for ver in ("draft", "published"):
            counts = {}
            for s in p[ver]["sections"]:
                n = counts.get(s["type"], 0)
                counts[s["type"]] = n + 1
                mid = slots.get((s["type"], n))
                if mid and not s["data"].get("image", {}).get("media_id"):
                    s["data"]["image"] = {"media_id": mid, "caption": ""}
                    changed = True
        if key == "craft-livelihood" and not any(s["type"] == "gallery" for s in p["draft"]["sections"]):
            gal = {"id": new_id(), "type": "gallery", "hidden": False, "data": {"heading": "Objects and details", "items": [
                {"image": {"media_id": ids["mango_b"], "caption": ""}}, {"image": {"media_id": ids["blue_basket_edit"], "caption": "", "size": "small"}},
                {"image": {"media_id": ids["figures"], "caption": ""}}, {"image": {"media_id": ids["tall_object"], "caption": ""}}, {"image": {"media_id": ids["door"], "caption": ""}}]}}
            for ver in ("draft", "published"):
                p[ver]["sections"].insert(len(p[ver]["sections"]) - 1, gal)
            changed = True
        if changed:
            await db.pages.update_one({"key": key}, {"$set": {"draft": p["draft"], "published": p["published"]}})
            print("placed photos on", key)


async def regen_derivatives():
    """Rebuild display derivatives from protected originals (originals untouched)."""
    from core import get_object, put_object, process_image
    async for m in db.media.find({"kind": "image", "is_deleted": False}, {"_id": 0}):
        info = process_image(await get_object(m["original_path"]))
        derivs = []
        for d in info["derivs"]:
            p = await put_object(f"uspindia/display/{m['id']}/v{m.get('version', 1)}-{d['w']}", d["bytes"], d["ctype"])
            derivs.append({"w": d["w"], "h": d["h"], "path": p, "ctype": d["ctype"]})
        await db.media.update_one({"id": m["id"]}, {"$set": {"derivs": derivs}})
        print("regenerated", m["filename"], [d["w"] for d in derivs])


if __name__ == "__main__":
    if sys.argv[1] == "--regen":
        asyncio.run(regen_derivatives())
    else:
        asyncio.run(main(sys.argv[1]))
