from fastapi import APIRouter, Request
from .api import DownloadFiguraMedia, GetFiguras, GetFigura, GetEtiquetas, GetReacciones, ToggleReaccion

router = APIRouter()


@router.get("/figuras")
async def get_figuras(request: Request):
    r = await GetFiguras(request=request).run()
    return r


@router.get("/figura")
async def get_figura(request: Request):
    r = await GetFigura(request=request).run()
    return r


@router.get("/figura/descargar")
async def download_figura_media(request: Request):
    return await DownloadFiguraMedia(request=request).run()


@router.get("/etiquetas")
async def get_etiquetas(request: Request):
    r = await GetEtiquetas(request=request).run()
    return r


@router.get("/reacciones_disponibles")
async def get_reacciones_disponibles(request: Request):
    r = await GetReacciones(request=request).run()
    return r


@router.post("/toggle_reaccion")
async def toggle_reaccion(request: Request):
    r = await ToggleReaccion(request=request).run()
    return r
