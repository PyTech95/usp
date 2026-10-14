"""Place approved photographs into empty page modules (draft + published). Idempotent.
Usage: cd /app/backend && python scripts/place_photos.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core import db, now, new_id  # noqa: E402

FILES = {"WOMEN_WEAVING": "Original4.jpeg", "OLDER_WOMAN": "Original.jpeg", "DOLLS": "WhatsApp Image 2026-09-21 at 12.58.20 AM.jpeg",
         "BASKETS": "image(20261010-060354).png", "READING": "WhatsApp Image 2026-10-10 at 10.10.24 AM.jpeg", "BOWLS": "WhatsApp Image 2026-10-10 at 10.16.09 AM.jpeg",
         "BLUE_BASKET": "blue-basket-border-removed.png", "TEXTILE": "image(20261010-060445).png", "FIGURES": "image(20261010-060534).png",
         "DOOR": "image(20261010-060550).png", "TALL": "image(20261010-060607).png"}
WOMEN_WEAVING = OLDER_WOMAN = DOLLS = BASKETS = READING = BOWLS = BLUE_BASKET = TEXTILE = FIGURES = DOOR = TALL = ""
HERO = WORK = GALLERY = None


def build_maps():
    global HERO, WORK, GALLERY
    HERO = {"home": WOMEN_WEAVING, "about": READING, "our-work": BASKETS, "rakhigarhi": DOOR, "theatre": READING,
            "craft-livelihood": OLDER_WOMAN, "workshops-learning": BOWLS, "connect": TEXTILE, "field-notes": FIGURES}
    WORK = {"/our-work/rakhigarhi": DOOR, "/our-work/theatre": READING, "/our-work/craft-livelihood": BOWLS, "/our-work/workshops-learning": FIGURES}
    GALLERY = [BASKETS, BLUE_BASKET, FIGURES, TALL, DOOR]


def fill(key, content):
    for s in content["sections"]:
        d = s["data"]
        if s["type"] == "hero" and not d.get("image", {}).get("media_id"):
            d["image"] = {"media_id": HERO[key], "caption": ""}
        if s["type"] == "related_work":
            for it in d.get("items", []):
                if not it.get("image", {}).get("media_id"):
                    it["image"] = {"media_id": WORK.get(it.get("href"), ""), "caption": ""}
        if s["type"] == "gallery":
            for it, mid in zip(d.get("items", []), GALLERY):
                it["image"] = {**it.get("image", {}), "media_id": mid}
    if key == "home" and not any(s["type"] == "image" for s in content["sections"]):
        idx = next(i for i, s in enumerate(content["sections"]) if s["type"] == "related_work") + 1
        content["sections"].insert(idx, {"id": new_id(), "type": "image", "hidden": False, "data": {"image": {"media_id": BASKETS, "caption": ""}, "layout": "wide"}})
    if key == "about" and not any(s["type"] == "gallery" for s in content["sections"]):
        idx = next(i for i, s in enumerate(content["sections"]) if s["type"] == "contact_invite")
        content["sections"].insert(idx, {"id": new_id(), "type": "gallery", "hidden": False, "data": {"heading": "From the field", "items": [{"image": {"media_id": m, "caption": ""}} for m in [WOMEN_WEAVING, DOLLS, TEXTILE]]}})
    if key in ("theatre", "workshops-learning", "rakhigarhi") and not any(s["type"] == "image" for s in content["sections"]):
        mid = {"theatre": BOWLS, "workshops-learning": READING, "rakhigarhi": TEXTILE}[key]
        content["sections"].insert(2, {"id": new_id(), "type": "image", "hidden": False, "data": {"image": {"media_id": mid, "caption": ""}, "layout": "wide"}})
    return content


async def main():
    for var, fname in FILES.items():
        m = await db.media.find_one({"filename": fname, "is_deleted": False}, {"id": 1})
        globals()[var] = m["id"]
    build_maps()
    async for p in db.pages.find({}, {"_id": 0}):
        key = p["key"]
        if key not in HERO:
            continue
        draft, pub = fill(key, p["draft"]), fill(key, p["published"])
        await db.pages.update_one({"key": key}, {"$set": {"draft": draft, "published": pub, "updated_at": now()}})
        print("placed", key)


if __name__ == "__main__":
    asyncio.run(main())
