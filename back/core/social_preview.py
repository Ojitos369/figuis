import os
import uuid
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

from core.conf.settings import MEDIA_DIR


SOCIAL_PREVIEW_FILENAME = "social-preview.jpg"
SOCIAL_PREVIEW_SIZE = (1200, 630)
SOCIAL_PREVIEW_QUALITY = 82


def social_preview_relative_path(figura_id: str) -> str:
    return f"figuras/{figura_id}/{SOCIAL_PREVIEW_FILENAME}"


def remove_social_preview(figura_id: str) -> None:
    preview_path = Path(MEDIA_DIR) / social_preview_relative_path(figura_id)
    try:
        preview_path.unlink(missing_ok=True)
    except OSError:
        pass


def generate_social_preview(figura_id: str, portada_url: str, force: bool = False) -> str | None:
    """Crea una portada social ligera sin registrarla como archivo de galería."""
    if not portada_url or str(portada_url).startswith(("http://", "https://")):
        remove_social_preview(figura_id)
        return None

    source_path = Path(MEDIA_DIR) / str(portada_url)
    output_path = Path(MEDIA_DIR) / social_preview_relative_path(figura_id)
    if not source_path.is_file():
        remove_social_preview(figura_id)
        return None

    if not force and output_path.is_file() and output_path.stat().st_mtime >= source_path.stat().st_mtime:
        return social_preview_relative_path(figura_id)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_name(f".{output_path.stem}-{uuid.uuid4().hex}.tmp.jpg")

    try:
        with Image.open(source_path) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            background = ImageOps.fit(image, SOCIAL_PREVIEW_SIZE, method=Image.Resampling.LANCZOS)
            background = background.filter(ImageFilter.GaussianBlur(radius=24))
            background = Image.blend(background, Image.new("RGB", SOCIAL_PREVIEW_SIZE, "#111118"), 0.22)

            foreground = ImageOps.contain(image, (1120, 590), method=Image.Resampling.LANCZOS)
            x = (SOCIAL_PREVIEW_SIZE[0] - foreground.width) // 2
            y = (SOCIAL_PREVIEW_SIZE[1] - foreground.height) // 2
            background.paste(foreground, (x, y))
            background.save(
                temp_path,
                format="JPEG",
                quality=SOCIAL_PREVIEW_QUALITY,
                optimize=True,
                progressive=True,
            )
        os.replace(temp_path, output_path)
        return social_preview_relative_path(figura_id)
    except (OSError, ValueError):
        try:
            temp_path.unlink(missing_ok=True)
        except OSError:
            pass
        remove_social_preview(figura_id)
        return None
