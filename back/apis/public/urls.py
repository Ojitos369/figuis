"""REST público del catálogo.

Esta superficie replica únicamente datos que ya son visibles en las páginas
públicas. No comparte el mecanismo genérico de APIs administrativas y no
acepta consultas SQL ni rutas de archivos arbitrarias.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from core.catalog import (
    get_collection,
    get_public_tag,
    list_collection_media,
    list_collections,
    list_public_tags,
    search_models,
)
from core.http import public_base_url


router = APIRouter(tags=["public-catalog"])


def _response(payload: dict, *, max_age: int = 300) -> JSONResponse:
    return JSONResponse(
        content=payload,
        headers={
            "Cache-Control": f"public, max-age={max_age}, stale-while-revalidate=60",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/openapi.json", include_in_schema=False)
def public_openapi(_request: Request):
    """Esquema aislado: no anuncia rutas administrativas ni de sesión."""

    public_routes = [
        route
        for route in router.routes
        if str(getattr(route, "path", "")).startswith("/v1/")
    ]
    schema = get_openapi(
        title="Figuis 3D Public Catalog API",
        version="1.0.0",
        description=(
            "API de solo lectura de Figuis, también conocido como Figuis 3D, "
            "Figuis Ojitos369 o Figuis 369. Consulta colecciones, etiquetas "
            "públicas y su media; no contiene datos comerciales."
        ),
        routes=public_routes,
    )
    schema["paths"] = {
        f"/api/public{path}": operation
        for path, operation in schema.get("paths", {}).items()
    }
    return _response(schema, max_age=3600)


@router.get("/v1/collections", summary="Lista y busca colecciones públicas")
def public_collections(
    request: Request,
    query: str | None = Query(default=None, min_length=1, max_length=120),
    tags: str | None = Query(
        default=None,
        max_length=300,
        description="Nombres exactos de etiquetas separados por coma, sin #.",
    ),
    page: int = Query(default=1, ge=1, le=10_000),
    page_size: int = Query(default=24, ge=1, le=50),
):
    tag_names = [tag.strip() for tag in (tags or "").split(",") if tag.strip()][:10]
    result = list_collections(
        query,
        tags=tag_names or None,
        page=page,
        page_size=page_size,
        base_url=public_base_url(request),
    )
    return _response(result)


@router.get("/v1/tags", summary="Lista etiquetas de colecciones públicas")
def public_tags(
    request: Request,
    page: int = Query(default=1, ge=1, le=10_000),
    page_size: int = Query(default=24, ge=1, le=100),
):
    result = list_public_tags(
        page=page,
        page_size=page_size,
        base_url=public_base_url(request),
    )
    return _response(result)


@router.get("/v1/tags/{identifier}", summary="Obtiene una etiqueta pública")
def public_tag(identifier: str, request: Request):
    tag = get_public_tag(identifier, base_url=public_base_url(request))
    if tag is None:
        raise HTTPException(status_code=404, detail="Etiqueta no encontrada")
    response = _response({"data": tag})
    response.headers["Content-Location"] = tag["canonical_url"]
    response.headers["Link"] = f'<{tag["canonical_url"]}>; rel="canonical"'
    return response


@router.get("/v1/collections/{identifier}/media", summary="Lista la media de una colección pública")
def public_collection_media(
    identifier: str,
    request: Request,
    media_type: str | None = Query(
        default=None,
        pattern="^(resultado|relacionado|modelo_3d)$",
    ),
    page: int = Query(default=1, ge=1, le=10_000),
    page_size: int = Query(default=50, ge=1, le=50),
):
    result = list_collection_media(
        identifier,
        media_type=media_type,
        page=page,
        page_size=page_size,
        base_url=public_base_url(request),
    )
    if not result.get("collection"):
        raise HTTPException(status_code=404, detail="Colección no encontrada")
    return _response(result)


@router.get("/v1/collections/{identifier}", summary="Obtiene una colección pública")
def public_collection(identifier: str, request: Request):
    collection = get_collection(identifier, base_url=public_base_url(request))
    if collection is None:
        raise HTTPException(status_code=404, detail="Colección no encontrada")
    response = _response({"data": collection})
    response.headers["Content-Location"] = collection["canonical_url"]
    response.headers["Link"] = f'<{collection["canonical_url"]}>; rel="canonical"'
    return response


@router.get("/v1/models", summary="Busca modelos 3D publicados")
def public_models(
    request: Request,
    query: str | None = Query(default=None, min_length=1, max_length=120),
    page: int = Query(default=1, ge=1, le=10_000),
    page_size: int = Query(default=24, ge=1, le=50),
):
    result = search_models(
        query,
        page=page,
        page_size=page_size,
        base_url=public_base_url(request),
    )
    return _response(result)
