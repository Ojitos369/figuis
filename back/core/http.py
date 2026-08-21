"""Helpers HTTP compartidos por páginas, API pública y MCP."""

from __future__ import annotations

from fastapi import HTTPException, Request

from core.catalog import normalize_base_url
from core.conf.settings import PUBLIC_BASE_URL


class RequestBodyTooLarge(HTTPException, OSError):
    """Raised by the ASGI receive guard when a body exceeds its configured cap.

    Starlette's multipart parser closes any temporary files when its input
    stream raises ``OSError``.  Keeping this exception in that hierarchy makes
    an interrupted oversized upload clean up the spooled files it already
    created.  It is also an ``HTTPException`` so FastAPI's automatic body
    parser preserves 413 instead of translating the receive error into 400.
    """

    def __init__(self):
        super().__init__(
            status_code=413,
            detail="Request body too large",
            headers={
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )


class RequestSizeLimitMiddleware:
    """Bound HTTP request bodies even when ``Content-Length`` is absent.

    This is a small ASGI middleware instead of ``BaseHTTPMiddleware`` so the
    body remains streamed and is never buffered here.
    """

    def __init__(self, app, max_body_size: int | None):
        if max_body_size is not None and max_body_size < 1:
            raise ValueError("max_body_size must be positive or None (unlimited)")
        self.app = app
        self.max_body_size = int(max_body_size) if max_body_size is not None else None

    @staticmethod
    async def _reject(send) -> None:
        body = b'{"detail":"Request body too large"}'
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                    (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        if self.max_body_size is None:
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or ())
        raw_length = headers.get(b"content-length")
        if raw_length is not None:
            try:
                if int(raw_length) > self.max_body_size:
                    await self._reject(send)
                    return
            except (TypeError, ValueError):
                # The HTTP server normally rejects malformed framing. The
                # streaming guard below remains authoritative regardless.
                pass

        received = 0
        response_started = False

        async def limited_receive():
            nonlocal received
            message = await receive()
            if message.get("type") == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_body_size:
                    raise RequestBodyTooLarge
            return message

        async def tracked_send(message):
            nonlocal response_started
            if message.get("type") == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracked_send)
        except RequestBodyTooLarge:
            if response_started:
                raise
            await self._reject(send)


def public_base_url(request: Request) -> str:
    """Obtiene el origen público, priorizando la configuración de despliegue."""

    if PUBLIC_BASE_URL:
        return normalize_base_url(PUBLIC_BASE_URL)
    # Uvicorn actualiza scheme/server en el scope únicamente para proxies de
    # confianza. Leer X-Forwarded-* aquí volvería a confiar en cualquier cliente.
    return normalize_base_url(str(request.base_url))
