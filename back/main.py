import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from urls import urls_router, add_404_handler

from core.conf.settings import allow_origins, allow_origin_regex, allow_credentials, allow_methods, allow_headers, MEDIA_DIR, HOME_PREVIEW_REFRESH_SECONDS
from core.home_preview import generate_home_preview


async def refresh_home_preview_loop():
    await asyncio.sleep(5)
    while True:
        await asyncio.to_thread(generate_home_preview)
        await asyncio.sleep(max(HOME_PREVIEW_REFRESH_SECONDS, 300))


@asynccontextmanager
async def lifespan(app: FastAPI):
    preview_task = asyncio.create_task(refresh_home_preview_loop())
    try:
        yield
    finally:
        preview_task.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, 
    # allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=allow_credentials,
    allow_methods=allow_methods,
    allow_headers=allow_headers
)

app.include_router(urls_router, prefix="")

add_404_handler(app)


# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# uvicorn main:app --host 0.0.0.0 --port 8369 --reload

""" 

"""
