"""Upload exported media files into Emergent object storage at their recorded paths."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import core  # noqa: E402

MEDIA_ROOT = Path("/tmp/usp_extract/usp-india/export/media")


def ctype_of(data: bytes) -> str:
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:5] == b"%PDF-":
        return "application/pdf"
    return "application/octet-stream"


def main():
    core.init_storage()
    total = ok = skip = err = 0
    for f in MEDIA_ROOT.rglob("*"):
        if not f.is_file() or f.name == "sync":
            continue
        rel = str(f.relative_to(MEDIA_ROOT))
        data = f.read_bytes()
        if not data:
            skip += 1
            continue
        total += 1
        try:
            core._put(rel, data, ctype_of(data))
            ok += 1
        except Exception as e:
            print("ERR", rel, e)
            err += 1
    print(f"done: total={total} uploaded={ok} skipped_empty={skip} errors={err}")


if __name__ == "__main__":
    main()
