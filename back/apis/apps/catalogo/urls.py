from fastapi import APIRouter, Request
from .api import GetFiguras, GetFigura, GetEtiquetas

router = APIRouter()


@router.get("/figuras")
async def get_figuras(request: Request):
    r = await GetFiguras(request=request).run()
    return r


@router.get("/figura")
async def get_figura(request: Request):
    r = await GetFigura(request=request).run()
    return r


@router.get("/etiquetas")
async def get_etiquetas(request: Request):
    r = await GetEtiquetas(request=request).run()
    return r
