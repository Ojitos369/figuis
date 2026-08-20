import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from urls import urls_router, add_404_handler
from mcp_server import catalog_mcp, catalog_mcp_app

from core.conf.settings import (
    HOME_PREVIEW_REFRESH_SECONDS,
    MAX_REQUEST_BODY_SIZE,
    allow_credentials,
    allow_headers,
    allow_methods,
    allow_origin_regex,
    allow_origins,
)
from core.home_preview import generate_home_preview
from core.http import RequestSizeLimitMiddleware


async def refresh_home_preview_loop():
    await asyncio.sleep(5)
    while True:
        await asyncio.to_thread(generate_home_preview)
        await asyncio.sleep(max(HOME_PREVIEW_REFRESH_SECONDS, 300))


@asynccontextmanager
async def lifespan(app: FastAPI):
    preview_task = asyncio.create_task(refresh_home_preview_loop())
    async with catalog_mcp.session_manager.run():
        try:
            yield
        finally:
            preview_task.cancel()
            with suppress(asyncio.CancelledError):
                await preview_task


app = FastAPI(
    title="Figuis Public Catalog",
    description=(
        "Catálogo público de colecciones y media. No representa inventario, "
        "precios ni disponibilidad de venta."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    RequestSizeLimitMiddleware,
    max_body_size=MAX_REQUEST_BODY_SIZE,
)
app.add_middleware(
    CORSMiddleware, 
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=allow_credentials,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
    expose_headers=["Mcp-Session-Id", "Content-Location", "Link"],
)

app.include_router(urls_router, prefix="")
app.mount("/mcp", catalog_mcp_app, name="figuis-mcp")

add_404_handler(app)


# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# uvicorn main:app --host 0.0.0.0 --port 8369 --reload

""" 

"""
