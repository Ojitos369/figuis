from pathlib import Path
from urllib.parse import unquote

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

from core.conf.settings import MEDIA_DIR

router = APIRouter()
MEDIA_ROOT = Path(MEDIA_DIR).resolve()
P404_PATH = MEDIA_ROOT / "pages" / "p404.html"


def resolve_media_path(ruta: str, media_root: Path = MEDIA_ROOT) -> Path | None:
    """Resolve a URL path inside the media root, including encoded traversal."""

    decoded = str(ruta)
    for _ in range(4):
        next_value = unquote(decoded)
        if next_value == decoded:
            break
        decoded = next_value
    try:
        root = media_root.resolve()
        candidate = (root / decoded).resolve()
        candidate.relative_to(root)
    except (OSError, RuntimeError, ValueError):
        return None
    return candidate


@router.get("/{ruta:path}", response_class=FileResponse)
async def gm(_request: Request, ruta: str):
    file = resolve_media_path(ruta)
    if file is None or not file.is_file():
        if P404_PATH.is_file():
            return HTMLResponse(content=P404_PATH.read_text(encoding="utf-8"), status_code=404)
        raise HTTPException(status_code=404, detail="File not found")
    headers = {
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
    }
    if file.name in ("social-preview.jpg", "home-preview.jpg"):
        headers["Cache-Control"] = "public, max-age=31536000"
    return FileResponse(file, headers=headers)
