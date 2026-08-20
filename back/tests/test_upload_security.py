from __future__ import annotations

import asyncio
from io import BytesIO
from pathlib import Path
import struct
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from fastapi import Body, FastAPI, HTTPException, Request
from starlette.responses import PlainTextResponse
import starlette.formparsers

from apis.apps.admin.api import (
    AUDIO_UPLOAD_EXTENSIONS,
    MEDIA_UPLOAD_EXTENSIONS,
    MODEL_UPLOAD_EXTENSIONS,
    RASTER_UPLOAD_EXTENSIONS,
    VIDEO_UPLOAD_EXTENSIONS,
    SaveFiguraArchivo,
    UploadTooLargeError,
    copy_upload_limited,
    stl_archivo_esta_completo,
    validate_upload_extension,
)
from core.bases.apis import BaseApi, NoSession
from core.conf.settings import MAX_REQUEST_BODY_SIZE, MYE
from core.http import RequestSizeLimitMiddleware


def _http_scope(headers=()):
    return {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/upload",
        "raw_path": b"/upload",
        "root_path": "",
        "query_string": b"",
        "headers": list(headers),
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }


async def _run_asgi(app, scope, request_messages):
    messages = iter(request_messages)
    sent = []

    async def receive():
        return next(messages, {"type": "http.disconnect"})

    async def send(message):
        sent.append(message)

    await app(scope, receive, send)
    return sent


class RequestSizeLimitTests(unittest.TestCase):
    def test_rejects_content_length_before_calling_application(self):
        called = False

        async def inner(scope, receive, send):
            nonlocal called
            called = True

        middleware = RequestSizeLimitMiddleware(inner, max_body_size=4)
        sent = asyncio.run(
            _run_asgi(
                middleware,
                _http_scope([(b"content-length", b"5")]),
                [],
            )
        )

        self.assertFalse(called)
        self.assertEqual(sent[0]["status"], 413)
        self.assertEqual(sent[1]["body"], b'{"detail":"Request body too large"}')

    def test_streaming_guard_rejects_body_without_content_length(self):
        async def inner(scope, receive, send):
            request = Request(scope, receive)
            await request.body()
            await PlainTextResponse("ok")(scope, receive, send)

        middleware = RequestSizeLimitMiddleware(inner, max_body_size=4)
        sent = asyncio.run(
            _run_asgi(
                middleware,
                _http_scope(),
                [
                    {"type": "http.request", "body": b"123", "more_body": True},
                    {"type": "http.request", "body": b"45", "more_body": False},
                ],
            )
        )

        self.assertEqual(sent[0]["status"], 413)

    def test_fastapi_typed_body_preserves_413_without_content_length(self):
        app = FastAPI()

        @app.post("/upload")
        async def typed_body(payload: dict = Body(...)):
            return payload

        middleware = RequestSizeLimitMiddleware(app, max_body_size=4)
        sent = asyncio.run(
            _run_asgi(
                middleware,
                _http_scope([(b"content-type", b"application/json")]),
                [
                    {"type": "http.request", "body": b'{"a', "more_body": True},
                    {"type": "http.request", "body": b'":1}', "more_body": False},
                ],
            )
        )

        self.assertEqual(sent[0]["status"], 413)
        self.assertIn(b"Request body too large", sent[1]["body"])

    def test_interrupted_multipart_closes_spooled_temporary_file(self):
        boundary = b"figuis-boundary"
        header = (
            b"--" + boundary + b"\r\n"
            b'Content-Disposition: form-data; name="file"; filename="large.png"\r\n'
            b"Content-Type: image/png\r\n\r\n"
        )
        first = header + b"1234"
        second = b"567890\r\n--" + boundary + b"--\r\n"
        created_files = []
        real_spooled_file = starlette.formparsers.SpooledTemporaryFile

        def tracked_spooled_file(*args, **kwargs):
            file_obj = real_spooled_file(*args, **kwargs)
            created_files.append(file_obj)
            return file_obj

        async def inner(scope, receive, send):
            form = await Request(scope, receive).form()
            await form.close()
            await PlainTextResponse("ok")(scope, receive, send)

        middleware = RequestSizeLimitMiddleware(inner, max_body_size=len(first) + 2)
        headers = [(b"content-type", b"multipart/form-data; boundary=" + boundary)]
        with patch(
            "starlette.formparsers.SpooledTemporaryFile",
            side_effect=tracked_spooled_file,
        ):
            sent = asyncio.run(
                _run_asgi(
                    middleware,
                    _http_scope(headers),
                    [
                        {"type": "http.request", "body": first, "more_body": True},
                        {"type": "http.request", "body": second, "more_body": False},
                    ],
                )
            )

        self.assertEqual(sent[0]["status"], 413)
        self.assertTrue(created_files)
        self.assertTrue(all(file_obj.closed for file_obj in created_files))

    def test_main_application_registers_configured_limit(self):
        import main

        middleware = next(
            item
            for item in main.app.user_middleware
            if item.cls is RequestSizeLimitMiddleware
        )
        self.assertEqual(middleware.kwargs["max_body_size"], MAX_REQUEST_BODY_SIZE)


class BaseApiBodyOrderTests(unittest.TestCase):
    @staticmethod
    def _api(api_class, events):
        api = object.__new__(api_class)
        api.form = None
        api.response = {"ok": True}
        api.data = {}
        api.get_client_ip = lambda: None
        api.get_get_data = lambda: events.append("query")

        async def get_post_data():
            events.append("body")

        api.get_post_data = get_post_data
        api.validate_session = lambda: events.append("auth")
        api.main = lambda: events.append("main")
        api.close_conexion = lambda: events.append("close")
        api.errors = lambda exc: (_ for _ in ()).throw(exc)
        return api

    def test_protected_api_authenticates_before_parsing_body(self):
        events = []
        api = self._api(BaseApi, events)

        result = asyncio.run(api.run())

        self.assertEqual(result, {"ok": True})
        self.assertEqual(events, ["query", "auth", "body", "main", "close"])

    def test_failed_auth_never_parses_body(self):
        events = []
        api = self._api(BaseApi, events)

        def reject_auth():
            events.append("auth")
            raise PermissionError("invalid session")

        api.validate_session = reject_auth
        with self.assertRaises(PermissionError):
            asyncio.run(api.run())

        self.assertEqual(events, ["query", "auth", "close"])

    def test_auth_http_error_is_preserved_and_body_is_not_parsed(self):
        events = []
        api = self._api(BaseApi, events)
        api.extra_error = ""
        api.petition_ip = "127.0.0.1"
        api.errors = BaseApi.errors.__get__(api, BaseApi)

        def reject_auth():
            events.append("auth")
            raise HTTPException(status_code=401, detail="invalid session")

        api.validate_session = reject_auth
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(api.run())

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(events, ["query", "auth", "close"])

    def test_no_session_api_keeps_body_available_before_noop_validation(self):
        class PublicApi(NoSession, BaseApi):
            pass

        events = []
        api = self._api(PublicApi, events)

        asyncio.run(api.run())

        self.assertEqual(events, ["query", "body", "auth", "main", "close"])


class UploadFileValidationTests(unittest.TestCase):
    def test_model_only_accepts_stl_and_media_excludes_active_content(self):
        self.assertEqual(validate_upload_extension("modelo_3d", "MODEL.STL"), ".stl")
        self.assertEqual(MODEL_UPLOAD_EXTENSIONS, {".stl"})

        for ext in RASTER_UPLOAD_EXTENSIONS | VIDEO_UPLOAD_EXTENSIONS | AUDIO_UPLOAD_EXTENSIONS:
            self.assertEqual(validate_upload_extension("resultado", f"media{ext}"), ext)
            self.assertEqual(validate_upload_extension("relacionado", f"media{ext}"), ext)

        for filename in ("model.obj", "model.3mf", "model.png"):
            with self.assertRaises(ValueError):
                validate_upload_extension("modelo_3d", filename)
        for filename in ("payload.svg", "payload.html", "payload.htm", "no-extension"):
            with self.assertRaises(ValueError):
                validate_upload_extension("resultado", filename)
        self.assertNotIn(".svg", MEDIA_UPLOAD_EXTENSIONS)
        self.assertNotIn(".html", MEDIA_UPLOAD_EXTENSIONS)

    def test_copy_is_bounded_and_removes_partial_file_on_overflow(self):
        with tempfile.TemporaryDirectory() as directory:
            exact = Path(directory) / "exact.upload"
            overflow = Path(directory) / "overflow.upload"

            self.assertEqual(copy_upload_limited(BytesIO(b"1234"), exact, max_bytes=4), 4)
            self.assertEqual(exact.read_bytes(), b"1234")
            with self.assertRaises(UploadTooLargeError):
                copy_upload_limited(BytesIO(b"12345"), overflow, max_bytes=4)
            self.assertFalse(overflow.exists())
            with self.assertRaises(ValueError):
                copy_upload_limited(BytesIO(b"x"), overflow, max_bytes=0)

    def test_copy_does_not_delete_preexisting_destination(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "existing.upload"
            destination.write_bytes(b"keep")

            with self.assertRaises(FileExistsError):
                copy_upload_limited(BytesIO(b"new"), destination, max_bytes=4)

            self.assertEqual(destination.read_bytes(), b"keep")

    def test_stl_validation_reads_file_without_whole_file_buffer(self):
        valid_binary = b"\0" * 80 + struct.pack("<I", 1) + b"\0" * 50
        with tempfile.TemporaryDirectory() as directory:
            valid = Path(directory) / "valid.stl"
            truncated = Path(directory) / "truncated.stl"
            valid.write_bytes(valid_binary)
            truncated.write_bytes(valid_binary[:-1])

            self.assertTrue(stl_archivo_esta_completo(valid))
            self.assertFalse(stl_archivo_esta_completo(truncated))

    def test_save_removes_installed_file_if_database_insert_fails(self):
        class ExistingFigure:
            empty = False

        class FailingConnection:
            def __init__(self):
                self.rolled_back = False

            def consulta_asociativa(self, query, params):
                return ExistingFigure()

            def ejecutar(self, query, params):
                return False

            def rollback(self):
                self.rolled_back = True

        with tempfile.TemporaryDirectory() as directory:
            connection = FailingConnection()
            api = object.__new__(SaveFiguraArchivo)
            api.data = {
                "figura_id": "123e4567-e89b-42d3-a456-426614174000",
                "tipo": "resultado",
                "file": SimpleNamespace(filename="image.png", file=BytesIO(b"png")),
            }
            api.conexion = connection
            api.MYE = MYE
            api.show_me = lambda: None

            with patch("apis.apps.admin.api.MEDIA_DIR", directory):
                with self.assertRaises(MYE):
                    api.main()

            self.assertTrue(connection.rolled_back)
            self.assertEqual(list(Path(directory).rglob("*.*")), [])

    def test_per_file_overflow_returns_413_and_removes_temporary_file(self):
        class ExistingFigure:
            empty = False

        class Connection:
            def consulta_asociativa(self, query, params):
                return ExistingFigure()

        with tempfile.TemporaryDirectory() as directory:
            api = object.__new__(SaveFiguraArchivo)
            api.data = {
                "figura_id": "123e4567-e89b-42d3-a456-426614174000",
                "tipo": "resultado",
                "file": SimpleNamespace(filename="image.png", file=BytesIO(b"png")),
            }
            api.conexion = Connection()
            api.MYE = MYE
            api.show_me = lambda: None

            with (
                patch("apis.apps.admin.api.MEDIA_DIR", directory),
                patch(
                    "apis.apps.admin.api.copy_upload_limited",
                    side_effect=UploadTooLargeError,
                ),
                self.assertRaises(HTTPException) as raised,
            ):
                api.main()

            self.assertEqual(raised.exception.status_code, 413)
            self.assertEqual(list(Path(directory).rglob("*.*")), [])

    def test_empty_upload_is_rejected_and_temporary_file_is_removed(self):
        class ExistingFigure:
            empty = False

        class Connection:
            def consulta_asociativa(self, query, params):
                return ExistingFigure()

        with tempfile.TemporaryDirectory() as directory:
            api = object.__new__(SaveFiguraArchivo)
            api.data = {
                "figura_id": "123e4567-e89b-42d3-a456-426614174000",
                "tipo": "resultado",
                "file": SimpleNamespace(filename="empty.png", file=BytesIO()),
            }
            api.conexion = Connection()
            api.MYE = MYE
            api.show_me = lambda: None

            with (
                patch("apis.apps.admin.api.MEDIA_DIR", directory),
                self.assertRaises(MYE) as raised,
            ):
                api.main()

            self.assertIn("vacío", str(raised.exception))
            self.assertEqual(list(Path(directory).rglob("*.*")), [])


if __name__ == "__main__":
    unittest.main()
