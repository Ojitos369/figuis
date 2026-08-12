from fastapi import APIRouter, Request
from .api import (
    GetFigurasAdmin, GetFiguraAdmin, SaveFigura, DeleteFigura,
    SaveFiguraArchivo, DeleteFiguraArchivo,
    SaveEtiqueta, DeleteEtiqueta,
)

router = APIRouter()


@router.get("/figuras")
async def get_figuras_admin(request: Request):
    r = await GetFigurasAdmin(request=request).run()
    return r


@router.get("/figura")
async def get_figura_admin(request: Request):
    r = await GetFiguraAdmin(request=request).run()
    return r


@router.post("/save_figura")
async def save_figura(request: Request):
    r = await SaveFigura(request=request).run()
    return r


@router.delete("/delete_figura")
async def delete_figura(request: Request):
    r = await DeleteFigura(request=request).run()
    return r


@router.post("/save_figura_archivo")
async def save_figura_archivo(request: Request):
    r = await SaveFiguraArchivo(request=request).run()
    return r


@router.delete("/delete_figura_archivo")
async def delete_figura_archivo(request: Request):
    r = await DeleteFiguraArchivo(request=request).run()
    return r


@router.post("/save_etiqueta")
async def save_etiqueta(request: Request):
    r = await SaveEtiqueta(request=request).run()
    return r


@router.delete("/delete_etiqueta")
async def delete_etiqueta(request: Request):
    r = await DeleteEtiqueta(request=request).run()
    return r
