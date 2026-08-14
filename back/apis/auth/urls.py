from fastapi import APIRouter, Request, Response
from .api import (
    Login, ValidateLogin, CloseSession, GetSesiones, CloseSesionAdmin
)

router = APIRouter()

@router.post("/login")
async def login(request: Request, response: Response):
    r = await Login(request=request, response=response).run()
    return r

@router.get("/validate_login")
async def validate_login(request: Request):
    r = await ValidateLogin(request=request).run()
    return r

@router.get("/close_session")
async def close_session(request: Request, response: Response):
    r = await CloseSession(request=request, response=response).run()
    return r

@router.get("/sesiones")
async def get_sesiones(request: Request):
    r = await GetSesiones(request=request).run()
    return r

@router.delete("/sesiones")
async def cerrar_sesion_admin(request: Request):
    r = await CloseSesionAdmin(request=request).run()
    return r
