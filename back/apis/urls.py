from fastapi import APIRouter
from .base.urls import router as base_router
from .auth.urls import router as auth_router
from .sockets.urls import router as socket_router
from .get_media.urls import router as get_media_router
from .apps.catalogo.urls import router as catalogo_router
from .apps.admin.urls import router as admin_router
from .public.urls import router as public_router

apis = APIRouter()
media = APIRouter()

media.include_router(get_media_router, prefix="")
apis.include_router(base_router, prefix="/base")
apis.include_router(auth_router, prefix="/auth")
apis.include_router(socket_router, prefix="/ws")
apis.include_router(catalogo_router, prefix="/catalogo")
apis.include_router(admin_router, prefix="/admin")
apis.include_router(public_router, prefix="/public")
