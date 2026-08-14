import html
import json
import os
import re
import uuid

from fastapi import Request, FastAPI, APIRouter
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from apis.urls import apis, media
from core.bases.utils import ClassBase
from core.bases.utils import CODIGO_EXPR
from core.conf.settings import MEDIA_DIR, PUBLIC_BASE_URL
from core.home_preview import HOME_PREVIEW_RELATIVE_PATH, home_preview_path
from core.social_preview import generate_social_preview

urls_router = APIRouter()

urls_router.include_router(apis, prefix="/api")
urls_router.include_router(media, prefix="/media")


def public_base_url(request: Request) -> str:
    if PUBLIC_BASE_URL:
        return PUBLIC_BASE_URL
    forwarded_host = request.headers.get("x-forwarded-host", "").split(",")[0].strip()
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
    if forwarded_host:
        return f"{forwarded_proto or request.url.scheme}://{forwarded_host}".rstrip("/")
    return str(request.base_url).rstrip("/")


def clean_description(value: str | None, fallback: str, limit: int = 200) -> str:
    text = re.sub(r"\s+", " ", (value or fallback)).strip()
    return text if len(text) <= limit else f"{text[:limit - 1].rstrip()}…"


def figure_not_found(base: str) -> HTMLResponse:
    root = html.escape(f"{base}/", quote=True)
    content = (
        '<!DOCTYPE html><html lang="es-MX"><head><meta charset="utf-8" />'
        '<meta name="robots" content="noindex, follow" /><title>Figura no encontrada · Figuis</title>'
        f'</head><body><p>Figura no encontrada. <a href="{root}">Volver a Figuis</a></p></body></html>'
    )
    return HTMLResponse(content=content, status_code=404, headers={"Cache-Control": "no-store"})

# ---------   INDEX   ---------
@urls_router.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    with open(f"{MEDIA_DIR}/dist/index.html") as f:
        html_content = f.read()
    base = public_base_url(request)
    preview_file = home_preview_path()
    image_meta = ""
    if preview_file.is_file():
        image_url = f"{base}/media/{HOME_PREVIEW_RELATIVE_PATH}?v={int(preview_file.stat().st_mtime)}"
        safe_image = html.escape(image_url, quote=True)
        image_meta = (
            f'<meta property="og:image" content="{safe_image}" />\n'
            f'    <meta property="og:image:secure_url" content="{safe_image}" />\n'
            '    <meta property="og:image:type" content="image/jpeg" />\n'
            '    <meta property="og:image:width" content="1200" />\n'
            '    <meta property="og:image:height" content="630" />\n'
            '    <meta property="og:image:alt" content="Vista actual del catálogo de Figuis" />\n'
            f'    <meta name="twitter:image" content="{safe_image}" />'
        )
        html_content = html_content.replace(
            '<meta name="twitter:card" content="summary" />',
            '<meta name="twitter:card" content="summary_large_image" />',
        )
    root_meta = (
        f'<link rel="canonical" href="{html.escape(base, quote=True)}/" />\n'
        f'    <meta property="og:url" content="{html.escape(base, quote=True)}/" />\n'
        f'    {image_meta}'
    )
    html_content = html_content.replace("</head>", f"    {root_meta}\n</head>")
    return HTMLResponse(content=html_content, headers={"Cache-Control": "public, max-age=300"})


@urls_router.get("/robots.txt", response_class=PlainTextResponse)
async def robots(request: Request):
    base = public_base_url(request)
    return PlainTextResponse(
        f"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: {base}/sitemap.xml\n",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@urls_router.get("/sitemap.xml")
async def sitemap(request: Request):
    base = public_base_url(request)
    lookup = ClassBase()
    lookup.create_conexion()
    try:
        rows = lookup.conexion.consulta_asociativa(
            "SELECT id, updated_at FROM figuras WHERE estatus = 'publico' ORDER BY updated_at DESC"
        )
    finally:
        lookup.close_conexion()

    urls = [f"  <url><loc>{html.escape(base)}/</loc></url>"]
    for row in rows.to_dict(orient="records"):
        updated_at = row.get("updated_at")
        has_lastmod = updated_at is not None and str(updated_at) != "NaT"
        lastmod = f"<lastmod>{updated_at.date().isoformat()}</lastmod>" if has_lastmod else ""
        urls.append(
            f"  <url><loc>{html.escape(base)}/figura/{html.escape(str(row['id']))}</loc>{lastmod}</url>"
        )
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls)
    xml += "\n</urlset>"
    return Response(content=xml, media_type="application/xml", headers={"Cache-Control": "public, max-age=900"})

# ---------   PREVIEW DE FIGURA (og:image para WhatsApp/redes)   ---------
# El front usa HashRouter (rutas tipo /#/figura/<id>): todo lo que va despues
# del "#" nunca llega al server, asi que un crawler de link-preview (WhatsApp,
# Facebook, etc) siempre ve el mismo index.html generico sin importar que
# figura se comparta. Esta ruta vive fuera del hash (/figura/<id>), sirve
# meta og:* especificas de esa figura (con su portada) para el crawler, y
# redirige con JavaScript al SPA real para un visitante humano.
@urls_router.get("/figura/{figura_id}", response_class=HTMLResponse)
async def figura_preview(request: Request, figura_id: str):
    base = public_base_url(request)

    # el id siempre es un uuid (columna `figuras.id`): si no lo es, no hay
    # nada que buscar y ademas evita interpolar texto arbitrario del path
    # dentro del HTML/JS de abajo.
    try:
        figura_id = str(uuid.UUID(figura_id))
    except ValueError:
        return figure_not_found(base)

    app_url = f"{base}/#/figura/{figura_id}"

    lookup = ClassBase()
    lookup.create_conexion()
    try:
        res = lookup.conexion.consulta_asociativa(
            f"""
            SELECT f.nombre, f.descripcion, {CODIGO_EXPR} as codigo,
                (
                    SELECT fa.archivo_url FROM figura_archivos fa
                    WHERE fa.figura_id = f.id AND fa.tipo = 'resultado'
                      AND fa.archivo_url ~* '\\.(jpe?g|png|webp|gif|bmp|tiff?)$'
                    ORDER BY fa.orden ASC, fa.created_at ASC LIMIT 1
                ) as portada,
                (
                    SELECT string_agg(e.nombre, ', ' ORDER BY e.nombre)
                    FROM figura_etiquetas fe
                    JOIN etiquetas e ON e.id = fe.etiqueta_id
                    WHERE fe.figura_id = f.id
                ) as etiquetas
            FROM figuras f
            WHERE f.id = :id AND f.estatus = 'publico'
            """,
            {"id": figura_id}
        )
    finally:
        lookup.close_conexion()

    if res.empty:
        return figure_not_found(base)

    structured_image = None
    row = res.iloc[0].to_dict()
    titulo = f"{row.get('nombre') or 'Figuis'} · Figuis"
    descripcion = clean_description(
        row.get('descripcion'),
        f"Descubre {row.get('nombre') or 'esta figura'} en el catálogo de Figuis.",
    )
    codigo = str(row.get('codigo') or '')
    etiquetas = str(row.get('etiquetas') or '')
    portada = row.get('portada')
    if portada:
        social_path = generate_social_preview(figura_id, portada)
        if social_path:
            version = int(os.path.getmtime(os.path.join(MEDIA_DIR, social_path)))
            imagen_url = f"{base}/media/{social_path}?v={version}"
            image_dimensions = (
                '<meta property="og:image:width" content="1200" />\n'
                '    <meta property="og:image:height" content="630" />\n'
                '    <meta property="og:image:type" content="image/jpeg" />'
            )
        else:
            imagen_url = portada if str(portada).startswith('http') else f"{base}/media/{portada}"
            image_dimensions = ""
        safe_image = html.escape(imagen_url, quote=True)
        structured_image = imagen_url
        safe_alt = html.escape(f"Portada de {row.get('nombre') or 'Figuis'}", quote=True)
        imagen_tag = (
            f'<meta property="og:image" content="{safe_image}" />\n'
            f'    <meta property="og:image:secure_url" content="{safe_image}" />\n'
            f'    <meta property="og:image:alt" content="{safe_alt}" />\n'
            f'    {image_dimensions}\n'
            f'    <meta name="twitter:image" content="{safe_image}" />\n'
            f'    <meta name="twitter:image:alt" content="{safe_alt}" />'
        )
    else:
        imagen_tag = ""

    raw_title = titulo
    raw_description = descripcion
    titulo = html.escape(titulo, quote=True)
    descripcion = html.escape(descripcion, quote=True)
    page_url_raw = f"{base}/figura/{figura_id}"
    page_url = html.escape(page_url_raw, quote=True)
    app_url_attr = html.escape(app_url, quote=True)
    keywords = html.escape(", ".join(filter(None, [etiquetas, "figuras 3D", "impresión 3D", "coleccionables"])), quote=True)
    structured_payload = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": raw_title.removesuffix(" · Figuis"),
        "description": raw_description,
        "identifier": codigo,
        "url": page_url_raw,
        "isPartOf": {"@type": "WebSite", "name": "Figuis", "url": base},
    }
    if structured_image:
        structured_payload["image"] = structured_image
    structured_data = json.dumps(structured_payload, ensure_ascii=False).replace("<", "\\u003c")
    app_url_js = json.dumps(app_url).replace("<", "\\u003c")

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <title>{titulo}</title>
    <meta name="description" content="{descripcion}" />
    <meta name="keywords" content="{keywords}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="{page_url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Figuis" />
    <meta property="og:locale" content="es_MX" />
    <meta property="og:title" content="{titulo}" />
    <meta property="og:description" content="{descripcion}" />
    <meta property="og:url" content="{page_url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{titulo}" />
    <meta name="twitter:description" content="{descripcion}" />
    {imagen_tag}
    <script type="application/ld+json">{structured_data}</script>
</head>
<body>
    <main>
        <h1>{titulo}</h1>
        <p>{descripcion}</p>
        <p><a href="{app_url_attr}">Ver figura en Figuis</a></p>
    </main>
    <script>location.replace({app_url_js});</script>
</body>
</html>"""
    return HTMLResponse(content=html_content, headers={"Cache-Control": "public, max-age=300"})

# ---------   404   ---------
def add_404_handler(app: FastAPI):
    @app.exception_handler(404)
    async def custom_404_handler(request: Request, exc):
        with open(f"{MEDIA_DIR}/pages/p404.html") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content, status_code=404)
