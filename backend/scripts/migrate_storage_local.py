"""One-time migration: pull every stored media object from Emergent object
storage down to the local filesystem (STORAGE_DIR). Run this ONCE while the
Emergent storage is still reachable, before switching core.py to local storage.
"""
import os
import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core import db  # noqa: E402
import core  # noqa: E402

STORAGE_DIR = Path(os.environ.get("STORAGE_DIR") or (Path(__file__).resolve().parent.parent / "storage")).resolve()


def collect_paths(m):
    paths = set()
    if m.get("original_path"):
        paths.add(m["original_path"])
    for d in (m.get("derivs") or []):
        if d.get("path"):
            paths.add(d["path"])
    for v in (m.get("versions") or []):
        if isinstance(v, dict):
            if v.get("original_path"):
                paths.add(v["original_path"])
            for d in (v.get("derivs") or []):
                if d.get("path"):
                    paths.add(d["path"])
    for a in (m.get("archived_sources") or []):
        if isinstance(a, dict) and a.get("path"):
            paths.add(a["path"])
        elif isinstance(a, str):
            paths.add(a)
    return paths


async def main():
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    total, ok, miss, skip = 0, 0, 0, 0
    async for m in db.media.find({}):
        for path in collect_paths(m):
            total += 1
            dest = (STORAGE_DIR / path.lstrip("/")).resolve()
            if dest.exists() and dest.stat().st_size > 0:
                skip += 1
                continue
            try:
                data = core._get(path)  # pulls from Emergent storage
            except Exception as e:
                print("ERR", path, e)
                miss += 1
                continue
            if not data:
                print("MISS", path)
                miss += 1
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            ok += 1
    print(f"done: total={total} downloaded={ok} skipped={skip} missing={miss} dir={STORAGE_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
