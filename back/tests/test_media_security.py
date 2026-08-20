from __future__ import annotations

import asyncio
import importlib.util
from pathlib import Path
import sys
import tempfile
import types
import unittest


def _load_media_urls():
    """Load the route module without requiring the deployment dependencies."""

    fastapi = types.ModuleType("fastapi")

    class APIRouter:
        def get(self, *_args, **_kwargs):
            return lambda function: function

    class HTTPException(Exception):
        def __init__(self, status_code, detail):
            self.status_code = status_code
            self.detail = detail

    fastapi.APIRouter = APIRouter
    fastapi.Request = object
    fastapi.HTTPException = HTTPException

    responses = types.ModuleType("fastapi.responses")

    class FileResponse:
        def __init__(self, path, headers=None, **_kwargs):
            self.path = path
            self.headers = headers or {}

    class HTMLResponse:
        def __init__(self, content, status_code=200, **_kwargs):
            self.content = content
            self.status_code = status_code

    responses.FileResponse = FileResponse
    responses.HTMLResponse = HTMLResponse

    settings = types.ModuleType("core.conf.settings")
    settings.MEDIA_DIR = "/tmp/figuis-test-media-root"

    replacements = {
        "fastapi": fastapi,
        "fastapi.responses": responses,
        "core.conf.settings": settings,
    }
    previous = {name: sys.modules.get(name) for name in replacements}
    sys.modules.update(replacements)
    try:
        path = Path(__file__).parents[1] / "apis" / "get_media" / "urls.py"
        spec = importlib.util.spec_from_file_location("_figuis_media_urls_test", path)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module
    finally:
        for name, original in previous.items():
            if original is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = original


media_urls = _load_media_urls()


class MediaPathSecurityTests(unittest.TestCase):
    def test_valid_public_file_stays_inside_media_root(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "media"
            public = root / "figuras" / "robot.webp"
            public.parent.mkdir(parents=True)
            public.write_bytes(b"public")
            self.assertEqual(
                media_urls.resolve_media_path("figuras/robot.webp", root),
                public.resolve(),
            )

    def test_plain_and_encoded_traversal_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "media"
            root.mkdir()
            secret = Path(directory) / "secret.txt"
            secret.write_text("secret", encoding="utf-8")
            for attack in (
                "../secret.txt",
                "%2e%2e/secret.txt",
                "%252e%252e%252fsecret.txt",
            ):
                with self.subTest(attack=attack):
                    self.assertIsNone(media_urls.resolve_media_path(attack, root))

    def test_symlink_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "media"
            outside = Path(directory) / "outside"
            root.mkdir()
            outside.mkdir()
            (outside / "secret.txt").write_text("secret", encoding="utf-8")
            try:
                (root / "escape").symlink_to(outside, target_is_directory=True)
            except OSError:
                self.skipTest("symlinks are unavailable")
            self.assertIsNone(media_urls.resolve_media_path("escape/secret.txt", root))

    def test_served_media_blocks_sniffing_and_active_document_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            public = Path(directory) / "public.png"
            public.write_bytes(b"image")
            original_resolver = media_urls.resolve_media_path
            media_urls.resolve_media_path = lambda _ruta: public
            try:
                response = asyncio.run(media_urls.gm(None, "public.png"))
            finally:
                media_urls.resolve_media_path = original_resolver

            self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
            self.assertEqual(
                response.headers["Content-Security-Policy"],
                "default-src 'none'; sandbox",
            )


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
