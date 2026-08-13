import html
import uuid

from fastapi import Request, FastAPI, APIRouter
from fastapi.responses import HTMLResponse
from apis.urls import apis, media
from core.bases.utils import ClassBase
from core.conf.settings import MEDIA_DIR

urls_router = APIRouter()

urls_router.include_router(apis, prefix="/api")
urls_router.include_router(media, prefix="/media")

# ---------   INDEX   ---------
@urls_router.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    with open(f"{MEDIA_DIR}/dist/index.html") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

# ---------   PREVIEW DE FIGURA (og:image para WhatsApp/redes)   ---------
# El front usa HashRouter (rutas tipo /#/figura/<id>): todo lo que va despues
# del "#" nunca llega al server, asi que un crawler de link-preview (WhatsApp,
# Facebook, etc) siempre ve el mismo index.html generico sin importar que
# figura se comparta. Esta ruta vive fuera del hash (/figura/<id>), sirve
# meta og:* especificas de esa figura (con su portada) para el crawler, y
# redirige (meta refresh + JS) al SPA real para un visitante humano.
@urls_router.get("/figura/{figura_id}", response_class=HTMLResponse)
async def figura_preview(request: Request, figura_id: str):
    base = str(request.base_url).rstrip('/')

    # el id siempre es un uuid (columna `figuras.id`): si no lo es, no hay
    # nada que buscar y ademas evita interpolar texto arbitrario del path
    # dentro del HTML/JS de abajo.
    try:
        figura_id = str(uuid.UUID(figura_id))
    except ValueError:
        return HTMLResponse(content='<meta http-equiv="refresh" content="0;url=/" />')

    app_url = f"{base}/#/figura/{figura_id}"

    lookup = ClassBase()
    lookup.create_conexion()
    try:
        res = lookup.conexion.consulta_asociativa(
            f"""
            SELECT f.nombre, f.descripcion,
                (
                    SELECT fa.archivo_url FROM figura_archivos fa
                    WHERE fa.figura_id = f.id AND fa.tipo = 'resultado'
                    ORDER BY fa.orden ASC, fa.created_at ASC LIMIT 1
                ) as portada
            FROM figuras f
            WHERE f.id = :id AND f.estatus = 'publico'
            """,
            {"id": figura_id}
        )
    finally:
        lookup.close_conexion()

    if res.empty:
        titulo = "Figuis · Catálogo"
        descripcion = "Catálogo de figuras coleccionables"
        imagen_tag = ""
    else:
        row = res.iloc[0].to_dict()
        titulo = f"{row.get('nombre') or 'Figuis'} · Figuis"
        descripcion = (row.get('descripcion') or 'Catálogo de figuras coleccionables').strip()
        portada = row.get('portada')
        if portada:
            imagen_url = portada if str(portada).startswith('http') else f"{base}/media/{portada}"
            imagen_tag = f'<meta property="og:image" content="{html.escape(imagen_url)}" />\n    <meta name="twitter:card" content="summary_large_image" />'
        else:
            imagen_tag = ""

    titulo = html.escape(titulo)
    descripcion = html.escape(descripcion)
    page_url = html.escape(f"{base}/figura/{figura_id}")

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url={app_url}" />
    <title>{titulo}</title>
    <meta name="description" content="{descripcion}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{titulo}" />
    <meta property="og:description" content="{descripcion}" />
    <meta property="og:url" content="{page_url}" />
    {imagen_tag}
</head>
<body>
    <script>location.replace({app_url!r});</script>
    <p>Redirigiendo a <a href="{app_url}">Figuis</a>…</p>
</body>
</html>"""
    return HTMLResponse(content=html_content)

# ---------   404   ---------
def add_404_handler(app: FastAPI):
    @app.exception_handler(404)
    async def custom_404_handler(request: Request, exc):
        with open(f"{MEDIA_DIR}/pages/p404.html") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content, status_code=404)

