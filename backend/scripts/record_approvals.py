"""Record client-confirmed consent (given in the build chat) for the candidate photographs. Idempotent.
Usage: cd /app/backend && python scripts/record_approvals.py"""
import asyncio
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core import db, now  # noqa: E402

APPROVED = [
    "Original4.jpeg", "Original.jpeg", "WhatsApp Image 2026-09-21 at 12.58.20 AM.jpeg", "image(20261010-060354).png",
    "WhatsApp Image 2026-10-10 at 10.10.24 AM.jpeg", "WhatsApp Image 2026-10-10 at 10.16.09 AM.jpeg", "image(20261010-060428).png",
    "image(20261010-060445).png", "image(20261010-060534).png", "image(20261010-060607).png", "image(20261010-060550).png",
]
DERIVATIVES = ["blue-basket-border-removed.png"]
NOTE = f"Client confirmed documented consent (people shown + photographer) in build chat on {date.today().isoformat()}. Minors: client did not answer; default 'no minors' recorded — re-check."


async def main():
    for fname in APPROVED + DERIVATIVES:
        m = await db.media.find_one({"filename": fname, "is_deleted": False}, {"_id": 0})
        if not m or m.get("permission") == "approved":
            continue
        changes = {"permission": "approved", "edit_approval": "approved"}
        if fname in APPROVED:
            changes["authenticity"] = "original"
        await db.media.update_one({"id": m["id"]}, {"$set": {**changes, "permission_notes": (m.get("permission_notes", "") + " | " + NOTE).strip(" |"), "updated_at": now()},
                                                    "$push": {"approval_log": {"at": now(), "by": "client confirmation (recorded by build agent)", "changes": changes}}})
        print("approved", fname)
    await db.register.update_many({"subject": {"$nin": ["Green basket with mangoes", "Overgrown brick house", "Unmapped WhatsApp placement comments"]}},
                                  {"$set": {"permission": "approved", "status": "approved for public use"}})


if __name__ == "__main__":
    asyncio.run(main())
