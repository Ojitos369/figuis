"""Representaciones semánticas del catálogo para HTML, Markdown y JSON-LD.

Las funciones de este módulo no consultan la base de datos. Reciben únicamente
los diccionarios públicos producidos por :mod:`core.catalog`, de modo que la
misma información visible alimenta el HTML y los datos estructurados.
"""

from __future__ import annotations

import html
import json
import re
from typing import Any, Iterable


SITE_NAME = "Figuis"
SITE_DESCRIPTION = (
    "Catálogo público de colecciones, figuras, imágenes y modelos 3D para "
    "consulta e inspiración."
)


def value(record: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        candidate = record.get(key)
        if candidate not in (None, ""):
            return candidate
    return default


def plain_text(value: Any, fallback: str = "", limit: int | None = None) -> str:
    """Convierte contenido editorial en una sola línea de texto segura."""

    text = re.sub(r"\s+", " ", str(value or fallback)).strip()
    if limit and len(text) > limit:
        text = f"{text[: max(0, limit - 1)].rstrip()}…"
    return text


def json_ld(payload: Any) -> str:
    """Serializa JSON-LD sin permitir que datos cierren la etiqueta script."""

    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace(
        "<", "\\u003c"
    )


def _media_schema(media: dict[str, Any], collection: dict[str, Any]) -> dict[str, Any]:
    mime = plain_text(value(media, "mime_type", "encoding_format"))
    kind = value(media, "kind", "tipo", "type", default="media")
    if kind == "modelo_3d":
        type_name = "3DModel"
    elif mime.startswith("image/"):
        type_name = "ImageObject"
    else:
        type_name = "MediaObject"
    payload: dict[str, Any] = {
        "@type": type_name,
        "@id": media.get("url"),
        "name": plain_text(value(media, "name", "nombre"), f"{value(collection, 'name', 'nombre')} · {kind}"),
        "contentUrl": media.get("url"),
        "encodingFormat": mime or None,
        "isPartOf": {"@id": collection.get("canonical_url")},
    }
    return {key: value for key, value in payload.items() if value not in (None, "")}


def collection_json_ld(collection: dict[str, Any], base_url: str) -> dict[str, Any]:
    """JSON-LD honesto para una colección; deliberadamente no emite Offer."""

    canonical = collection["canonical_url"]
    tags = value(collection, "tags", "etiquetas", default=[]) or []
    media = collection.get("media") or []
    media_items = [_media_schema(item, collection) for item in media]
    description = plain_text(
        value(collection, "description", "descripcion"),
        f"Colección pública {value(collection, 'name', 'nombre')} en Figuis.",
        300,
    )
    creative_work: dict[str, Any] = {
        "@type": "CreativeWork",
        "@id": f"{canonical}#collection",
        "name": value(collection, "name", "nombre"),
        "description": description,
        "identifier": [
            identifier
            for identifier in (collection.get("id"), value(collection, "code", "codigo"))
            if identifier not in (None, "")
        ],
        "keywords": [value(tag, "name", "nombre") for tag in tags if value(tag, "name", "nombre")],
        "dateCreated": collection.get("created_at"),
        "dateModified": collection.get("updated_at"),
        "associatedMedia": media_items,
        "url": canonical,
    }
    creative_work = {
        key: value
        for key, value in creative_work.items()
        if value not in (None, "", [])
    }
    page: dict[str, Any] = {
        "@type": "CollectionPage",
        "@id": canonical,
        "url": canonical,
        "name": f"{value(collection, 'name', 'nombre')} · {SITE_NAME}",
        "description": description,
        "inLanguage": "es-MX",
        "dateModified": collection.get("updated_at"),
        "isPartOf": {"@id": f"{base_url}/#website"},
        "mainEntity": {"@id": f"{canonical}#collection"},
        "breadcrumb": {"@id": f"{canonical}#breadcrumb"},
    }
    images = [item for item in media_items if item.get("@type") == "ImageObject"]
    if images:
        page["primaryImageOfPage"] = {"@id": images[0].get("@id")}
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": f"{base_url}/#organization",
                "name": SITE_NAME,
                "url": f"{base_url}/",
            },
            {
                "@type": "WebSite",
                "@id": f"{base_url}/#website",
                "name": SITE_NAME,
                "url": f"{base_url}/",
                "inLanguage": "es-MX",
                "publisher": {"@id": f"{base_url}/#organization"},
            },
            page,
            creative_work,
            {
                "@type": "BreadcrumbList",
                "@id": f"{canonical}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Catálogo",
                        "item": f"{base_url}/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": value(collection, "name", "nombre"),
                        "item": canonical,
                    },
                ],
            },
            *media_items,
        ],
    }


def catalog_json_ld(
    collections: Iterable[dict[str, Any]], base_url: str, total: int
) -> dict[str, Any]:
    entries = []
    for position, collection in enumerate(collections, start=1):
        entries.append(
            {
                "@type": "ListItem",
                "position": position,
                "url": collection.get("canonical_url"),
                "name": value(collection, "name", "nombre"),
            }
        )
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": f"{base_url}/#organization",
                "name": SITE_NAME,
                "url": f"{base_url}/",
            },
            {
                "@type": "WebSite",
                "@id": f"{base_url}/#website",
                "name": SITE_NAME,
                "url": f"{base_url}/",
                "inLanguage": "es-MX",
                "publisher": {"@id": f"{base_url}/#organization"},
            },
            {
                "@type": "CollectionPage",
                "@id": f"{base_url}/",
                "url": f"{base_url}/",
                "name": "Figuis · Catálogo de colecciones y modelos 3D",
                "description": SITE_DESCRIPTION,
                "inLanguage": "es-MX",
                "mainEntity": {
                    "@type": "ItemList",
                    "numberOfItems": total,
                    "itemListElement": entries,
                },
            },
        ],
    }


def mcp_info_payload(
    base_url: str, tools: Iterable[dict[str, Any]]
) -> dict[str, Any]:
    """Build the shared, public description of the registered MCP server."""

    base_url = base_url.rstrip("/")
    tool_records = [dict(tool) for tool in tools]
    example_arguments = {
        "search": {"query": "dragón articulado"},
        "fetch": {"id": "collection:nombre-etiquetas--UUID"},
        "list_collections": {"query": "robot", "tags": ["impresión 3D"], "page": 1, "limit": 24},
        "get_collection": {"identifier": "nombre-etiquetas--UUID"},
        "list_collection_media": {
            "identifier": "nombre-etiquetas--UUID",
            "media_type": "modelo_3d",
            "page": 1,
            "limit": 50,
        },
        "search_models": {"query": "robot", "page": 1, "limit": 24},
    }
    examples = [
        {"tool": tool["name"], "arguments": example_arguments[tool["name"]]}
        for tool in tool_records
        if tool.get("name") in example_arguments
    ]
    return {
        "name": "Servidor MCP público de Figuis",
        "description": (
            "Interfaz pública y de solo lectura para consultar colecciones, "
            "imágenes, material relacionado y modelos 3D publicados en Figuis."
        ),
        "canonical_url": f"{base_url}/mcp-info",
        "endpoint": f"{base_url}/mcp/",
        "protocol": "Model Context Protocol (MCP)",
        "transport": {
            "type": "Streamable HTTP",
            "request_method": "POST",
            "request_content_type": "application/json",
            "message_format": "JSON-RPC 2.0",
            "response_content_type": "application/json",
            "session_mode": "stateless",
        },
        "authentication": {
            "required": False,
            "type": "none",
            "description": (
                "No requiere credenciales para consultar datos públicos; el "
                "transporte valida Host y Origin permitidos."
            ),
        },
        "scope": {
            "mode": "read-only",
            "includes": [
                "Colecciones con estatus público",
                "Etiquetas públicas de esas colecciones",
                "Imágenes, material relacionado y modelos 3D asociados",
            ],
            "excludes": [
                "Usuarios, sesiones, administración, borradores y reacciones",
                "Consultas SQL, escritura y acceso arbitrario al sistema de archivos",
                "Precios, inventario, stock, pagos y disponibilidad de venta",
            ],
        },
        "tools": tool_records,
        "examples": examples,
        "connection_examples": {
            "generic_config": {
                "mcpServers": {
                    "figuis": {
                        "type": "streamable-http",
                        "url": f"{base_url}/mcp/",
                    }
                }
            },
            "inspector_web": (
                "npx @modelcontextprotocol/inspector "
                f"--server-url {base_url}/mcp/ --transport http"
            ),
            "inspector_list_tools": (
                "npx @modelcontextprotocol/inspector --cli "
                f"{base_url}/mcp/ --transport http --method tools/list"
            ),
            "inspector_call_search": (
                "npx @modelcontextprotocol/inspector --cli "
                f"{base_url}/mcp/ --transport http --method tools/call "
                "--tool-name search --tool-arg query=robot --format json"
            ),
        },
        "related_interfaces": [
            {
                "name": "Catálogo web",
                "url": f"{base_url}/",
                "format": "HTML, Markdown o JSON por negociación",
            },
            {
                "name": "API pública",
                "url": f"{base_url}/api/public/v1/collections",
                "format": "JSON",
            },
            {
                "name": "OpenAPI público",
                "url": f"{base_url}/api/public/openapi.json",
                "format": "OpenAPI JSON",
            },
        ],
    }


def mcp_info_markdown(info: dict[str, Any]) -> str:
    """Render the MCP information page as citable Markdown."""

    transport = info["transport"]
    authentication = info["authentication"]
    scope = info["scope"]
    lines = [
        f"# {plain_text(info['name'])}",
        "",
        plain_text(info["description"]),
        "",
        f"- URL canónica: {info['canonical_url']}",
        f"- Endpoint MCP: {info['endpoint']}",
        f"- Protocolo: {info['protocol']}",
        f"- Transporte: {transport['type']}",
        f"- Peticiones: {transport['request_method']} {transport['request_content_type']}",
        f"- Formato de mensaje: {transport['message_format']}",
        f"- Respuestas: {transport['response_content_type']}",
        f"- Sesiones: {transport['session_mode']}",
        f"- Autenticación: {'requerida' if authentication['required'] else 'no requerida'}",
        "",
        "## Configuración de conexión",
        "",
        "Configuración genérica `mcpServers`:",
        "",
        "```json",
        json.dumps(
            info["connection_examples"]["generic_config"],
            ensure_ascii=False,
            indent=2,
        ),
        "```",
        "",
        "MCP Inspector web:",
        "",
        "```bash",
        info["connection_examples"]["inspector_web"],
        "```",
        "",
        "Listar herramientas desde MCP Inspector CLI:",
        "",
        "```bash",
        info["connection_examples"]["inspector_list_tools"],
        "```",
        "",
        "## Alcance y seguridad",
        "",
        plain_text(authentication["description"]),
        "",
        f"Modo: {scope['mode']}.",
        "",
        "Incluye:",
        *[f"- {plain_text(item)}" for item in scope["includes"]],
        "",
        "No incluye:",
        *[f"- {plain_text(item)}" for item in scope["excludes"]],
        "",
        "## Herramientas registradas",
        "",
    ]
    for tool in info["tools"]:
        lines.extend(
            [
                f"### `{plain_text(tool['name'])}` — {plain_text(tool['title'])}",
                "",
                plain_text(tool["description"]),
                "",
                "Esquema de entrada:",
                "",
                "```json",
                json.dumps(tool["input_schema"], ensure_ascii=False, indent=2),
                "```",
                "",
            ]
        )
    lines.extend(["## Ejemplos", ""])
    for example in info["examples"]:
        lines.extend(
            [
                f"### `{plain_text(example['tool'])}`",
                "",
                "```json",
                json.dumps(example["arguments"], ensure_ascii=False, indent=2),
                "```",
                "",
            ]
        )
    lines.extend(["## Interfaces relacionadas", ""])
    for interface in info["related_interfaces"]:
        lines.append(
            f"- [{plain_text(interface['name'])}]({interface['url']}) — "
            f"{plain_text(interface['format'])}"
        )
    return "\n".join(lines).strip() + "\n"


def mcp_info_html(info: dict[str, Any]) -> str:
    """Render visible SSR content for agents, crawlers and people without JS."""

    def safe(value: Any, *, quote: bool = False) -> str:
        return html.escape(plain_text(value), quote=quote)

    tool_items = []
    for tool in info["tools"]:
        schema = tool.get("input_schema") or {}
        properties = schema.get("properties") or {}
        required = set(schema.get("required") or [])
        parameters = ", ".join(
            f"<code>{safe(name)}</code> ({'obligatorio' if name in required else 'opcional'})"
            for name in properties
        ) or "sin parámetros"
        tool_items.append(
            "<li><article>"
            f"<h3><code>{safe(tool['name'])}</code> — {safe(tool['title'])}</h3>"
            f"<p>{safe(tool['description'])}</p>"
            f"<p>Parámetros: {parameters}.</p>"
            "</article></li>"
        )
    example_items = []
    for example in info["examples"]:
        arguments = html.escape(
            json.dumps(example["arguments"], ensure_ascii=False, indent=2)
        )
        example_items.append(
            f"<li><h3><code>{safe(example['tool'])}</code></h3>"
            f"<pre><code>{arguments}</code></pre></li>"
        )
    related_items = "".join(
        f'<li><a href="{safe(item["url"], quote=True)}">{safe(item["name"])}</a>'
        f" — {safe(item['format'])}</li>"
        for item in info["related_interfaces"]
    )
    transport = info["transport"]
    authentication = info["authentication"]
    scope = info["scope"]
    connection = info["connection_examples"]
    generic_config = html.escape(
        json.dumps(connection["generic_config"], ensure_ascii=False, indent=2)
    )
    return f"""
<main data-agent-readable="true">
  <nav aria-label="Migas de pan"><a href="{safe(info['related_interfaces'][0]['url'], quote=True)}">Catálogo</a> / MCP</nav>
  <article>
    <h1>{safe(info['name'])}</h1>
    <p>{safe(info['description'])}</p>
    <section>
      <h2>¿Cómo se conecta un agente?</h2>
      <dl>
        <dt>Endpoint</dt><dd><code>{safe(info['endpoint'])}</code></dd>
        <dt>Protocolo</dt><dd>{safe(info['protocol'])}</dd>
        <dt>Transporte</dt><dd>{safe(transport['type'])}</dd>
        <dt>Peticiones</dt><dd>{safe(transport['request_method'])} · {safe(transport['request_content_type'])}</dd>
        <dt>Formato de mensaje</dt><dd>{safe(transport['message_format'])}</dd>
        <dt>Respuestas</dt><dd>{safe(transport['response_content_type'])}</dd>
        <dt>Sesiones</dt><dd>{safe(transport['session_mode'])}</dd>
        <dt>Autenticación</dt><dd>{'Requerida' if authentication['required'] else 'No requerida'}</dd>
      </dl>
      <p>{safe(authentication['description'])}</p>
    </section>
    <section>
      <h2>Configuración de conexión</h2>
      <h3>Configuración genérica <code>mcpServers</code></h3>
      <pre><code>{generic_config}</code></pre>
      <h3>MCP Inspector web</h3>
      <pre><code>{safe(connection['inspector_web'])}</code></pre>
      <h3>Listar herramientas desde MCP Inspector CLI</h3>
      <pre><code>{safe(connection['inspector_list_tools'])}</code></pre>
      <h3>Probar <code>search</code> desde MCP Inspector CLI</h3>
      <pre><code>{safe(connection['inspector_call_search'])}</code></pre>
    </section>
    <section>
      <h2>¿Qué información puede consultar?</h2>
      <p>El servidor opera en modo <strong>{safe(scope['mode'])}</strong>.</p>
      <h3>Incluye</h3><ul>{''.join(f'<li>{safe(item)}</li>' for item in scope['includes'])}</ul>
      <h3>No incluye</h3><ul>{''.join(f'<li>{safe(item)}</li>' for item in scope['excludes'])}</ul>
    </section>
    <section>
      <h2>¿Qué herramientas MCP están disponibles?</h2>
      <ul>{''.join(tool_items)}</ul>
    </section>
    <section>
      <h2>Ejemplos de argumentos</h2>
      <ul>{''.join(example_items)}</ul>
    </section>
    <section>
      <h2>Interfaces relacionadas</h2>
      <ul>{related_items}</ul>
    </section>
  </article>
</main>""".strip()


def mcp_info_json_ld(info: dict[str, Any]) -> dict[str, Any]:
    canonical = info["canonical_url"]
    base_url = canonical.removesuffix("/mcp-info")
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": f"{base_url}/#organization",
                "name": SITE_NAME,
                "url": f"{base_url}/",
            },
            {
                "@type": "WebSite",
                "@id": f"{base_url}/#website",
                "name": SITE_NAME,
                "url": f"{base_url}/",
                "inLanguage": "es-MX",
                "publisher": {"@id": f"{base_url}/#organization"},
            },
            {
                "@type": "WebPage",
                "@id": canonical,
                "url": canonical,
                "name": info["name"],
                "description": info["description"],
                "inLanguage": "es-MX",
                "isPartOf": {"@id": f"{base_url}/#website"},
                "mainEntity": {"@id": f"{canonical}#service"},
            },
            {
                "@type": "Service",
                "@id": f"{canonical}#service",
                "name": info["name"],
                "description": info["description"],
                "serviceType": f"{info['protocol']} · {info['transport']['type']}",
                "url": info["endpoint"],
                "provider": {"@id": f"{base_url}/#organization"},
                "availableChannel": {
                    "@type": "ServiceChannel",
                    "serviceUrl": info["endpoint"],
                },
                "audience": {
                    "@type": "Audience",
                    "audienceType": "Agentes de IA y desarrolladores",
                },
            },
        ],
    }


def mcp_info_document(info: dict[str, Any], spa_document: str) -> str:
    """Inject MCP SSR content and metadata into the existing public SPA shell."""

    return inject_spa_document(
        spa_document,
        title=f"{plain_text(info['name'])} · {SITE_NAME}",
        description=plain_text(info["description"], limit=220),
        canonical_url=info["canonical_url"],
        body_html=mcp_info_html(info),
        structured_data=mcp_info_json_ld(info),
    )


def _tag_names(collection: dict[str, Any]) -> list[str]:
    tags = value(collection, "tags", "etiquetas", default=[]) or []
    return [plain_text(value(tag, "name", "nombre")) for tag in tags if value(tag, "name", "nombre")]


def collection_summary(collection: dict[str, Any]) -> str:
    counts = collection.get("media_counts") or {}
    total = int(
        collection.get("media_count")
        or counts.get("total")
        or sum(int(counts.get(key) or 0) for key in ("resultado", "relacionado", "modelo_3d"))
    )
    models = int(counts.get("modelo_3d") or collection.get("model_count") or 0)
    tags = _tag_names(collection)
    answer = f"{value(collection, 'name', 'nombre')} es una colección pública de Figuis con {total} archivo"
    answer += "s" if total != 1 else ""
    answer += f", incluidos {models} modelo"
    answer += "s" if models != 1 else ""
    answer += " 3D"
    if tags:
        answer += f". Está clasificada con {', '.join(tags)}"
    return f"{answer}."


def collection_html(collection: dict[str, Any], base_url: str) -> str:
    """Contenido HTML visible antes de hidratar React y sin depender de JS."""

    canonical = html.escape(collection["canonical_url"], quote=True)
    name = html.escape(plain_text(value(collection, "name", "nombre")))
    description = html.escape(
        plain_text(value(collection, "description", "descripcion"), collection_summary(collection))
    )
    summary = html.escape(collection_summary(collection))
    tags = _tag_names(collection)
    tag_html = "".join(f"<li>#{html.escape(tag)}</li>" for tag in tags)
    media_html = []
    models = []
    for item in collection.get("media") or []:
        url = html.escape(str(item.get("url") or ""), quote=True)
        kind = value(item, "kind", "tipo", "type", default="media")
        label = html.escape(plain_text(value(item, "name", "nombre"), kind or "Media"))
        if kind == "modelo_3d":
            models.append(label)
        if str(value(item, "mime_type", "encoding_format", default="")).startswith("image/"):
            media_html.append(
                f'<li><figure><img src="{url}" alt="{label}" loading="lazy" />'
                f"<figcaption>{label}</figcaption></figure></li>"
            )
        else:
            media_html.append(f'<li><a href="{url}">{label}</a></li>')
    models_answer = (
        f"Sí. La colección incluye {len(models)} modelo(s) 3D: {', '.join(models)}."
        if models
        else "No hay un modelo 3D publicado en esta colección por ahora."
    )
    return f"""
<main data-agent-readable="true">
  <nav aria-label="Migas de pan"><a href="{html.escape(base_url, quote=True)}/">Catálogo</a> / {name}</nav>
  <article>
    <h1>{name}</h1>
    <p>{summary}</p>
    <p>{description}</p>
    {f'<ul aria-label="Etiquetas">{tag_html}</ul>' if tag_html else ''}
    <section>
      <h2>¿Qué media contiene esta colección?</h2>
      <p>Estos son los archivos públicos asociados actualmente.</p>
      <ul>{''.join(media_html) or '<li>No hay media publicada por ahora.</li>'}</ul>
    </section>
    <section>
      <h2>¿Hay modelos 3D en esta colección?</h2>
      <p>{html.escape(models_answer)}</p>
    </section>
    <p><a href="{canonical}">Enlace permanente de esta colección</a></p>
  </article>
</main>""".strip()


def catalog_html(collections: Iterable[dict[str, Any]], base_url: str, total: int) -> str:
    collections = list(collections)
    items = []
    model_items = []
    for collection in collections:
        url = html.escape(str(collection.get("canonical_url") or ""), quote=True)
        name = html.escape(plain_text(value(collection, "name", "nombre")))
        description = html.escape(
            plain_text(value(collection, "description", "descripcion"), collection_summary(collection), 220)
        )
        image = collection.get("cover_url")
        image_html = (
            f'<img src="{html.escape(str(image), quote=True)}" alt="{name}" loading="lazy" />'
            if image
            else ""
        )
        items.append(
            f'<li><article>{image_html}<h2><a href="{url}">{name}</a></h2><p>{description}</p></article></li>'
        )
        model_count = int(
            (collection.get("media_counts") or {}).get("modelo_3d")
            or collection.get("model_count")
            or 0
        )
        if model_count:
            noun = "modelo" if model_count == 1 else "modelos"
            model_items.append(
                f'<li><a href="{url}">{name}</a>: {model_count} {noun} 3D</li>'
            )
    return f"""
<main data-agent-readable="true">
  <h1>Catálogo público de Figuis</h1>
  <p>Figuis reúne {total} colección{'es' if total != 1 else ''} pública{'s' if total != 1 else ''} con imágenes, referencias y modelos 3D.</p>
  <p>Actualmente es un catálogo informativo y no ofrece compra en línea.</p>
  <section>
    <h2>¿Qué colecciones y modelos hay?</h2>
    <ul>{''.join(items) or '<li>Aún no hay colecciones públicas.</li>'}</ul>
  </section>
  <section>
    <h2>¿Qué modelos 3D están publicados?</h2>
    <p>Estas colecciones de la página actual incluyen archivos de modelo 3D.</p>
    <ul>{''.join(model_items) or '<li>No hay modelos 3D publicados en esta página por ahora.</li>'}</ul>
  </section>
  <section>
    <h2>¿Cómo consultar el catálogo desde un agente?</h2>
    <p>Usa la <a href="{html.escape(base_url, quote=True)}/api/public/v1/collections">API pública</a> o consulta la <a href="{html.escape(base_url, quote=True)}/mcp-info">información de conexión y herramientas del servidor MCP</a>.</p>
  </section>
</main>""".strip()


def collection_markdown(collection: dict[str, Any]) -> str:
    tags = " ".join(f"#{plain_text(value(tag, 'name', 'nombre')).replace(' ', '')}" for tag in value(collection, "tags", "etiquetas", default=[]) or [])
    lines = [
        f"# {plain_text(value(collection, 'name', 'nombre'))}",
        "",
        collection_summary(collection),
        "",
        plain_text(value(collection, "description", "descripcion"), "Sin descripción publicada."),
        "",
        f"- URL canónica: {collection.get('canonical_url')}",
        f"- Identificador: {collection.get('id')}",
        f"- Código: {collection.get('code') or 'No publicado'}",
        f"- Etiquetas: {tags or 'Sin etiquetas'}",
        "",
        "## ¿Qué media contiene esta colección?",
        "",
    ]
    media = collection.get("media") or []
    if not media:
        lines.append("No hay media publicada por ahora.")
    for item in media:
        kind = value(item, "kind", "tipo", "type", default="media")
        label = plain_text(value(item, "name", "nombre"), kind)
        lines.append(f"- [{label}]({item.get('url')}) — {kind}, {value(item, 'mime_type', 'encoding_format', default='tipo desconocido')}")
    lines.extend(
        [
            "",
            "## Disponibilidad comercial",
            "",
            "Esta ficha es informativa. No publica precio, inventario ni disponibilidad de compra.",
        ]
    )
    return "\n".join(lines).strip() + "\n"


def catalog_markdown(collections: Iterable[dict[str, Any]], total: int, base_url: str) -> str:
    collections = list(collections)
    lines = [
        "# Catálogo público de Figuis",
        "",
        f"Figuis contiene {total} colección(es) pública(s) con imágenes y modelos 3D.",
        "El catálogo es informativo; no representa inventario ni disponibilidad de venta.",
        "",
        "## Colecciones",
        "",
    ]
    for collection in collections:
        lines.append(
            f"- [{plain_text(value(collection, 'name', 'nombre'))}]({collection.get('canonical_url')}): "
            f"{plain_text(value(collection, 'description', 'descripcion'), collection_summary(collection), 220)}"
        )
    lines.extend(["", "## ¿Qué modelos 3D están publicados?", ""])
    model_collections = [
        collection
        for collection in collections
        if int(
            (collection.get("media_counts") or {}).get("modelo_3d")
            or collection.get("model_count")
            or 0
        )
    ]
    if not model_collections:
        lines.append("No hay modelos 3D publicados en esta página por ahora.")
    for collection in model_collections:
        model_count = int(
            (collection.get("media_counts") or {}).get("modelo_3d")
            or collection.get("model_count")
            or 0
        )
        lines.append(
            f"- [{plain_text(value(collection, 'name', 'nombre'))}]({collection.get('canonical_url')}): "
            f"{model_count} modelo{'s' if model_count != 1 else ''} 3D."
        )
    lines.extend(
        [
            "",
            "## Interfaces para agentes",
            "",
            f"- API JSON: {base_url}/api/public/v1/collections",
            f"- Información y herramientas MCP: {base_url}/mcp-info",
            f"- MCP de solo lectura: {base_url}/mcp/",
        ]
    )
    return "\n".join(lines).strip() + "\n"


_GENERIC_HEAD_PATTERNS = [
    r"\s*<title>.*?</title>",
    r"\s*<meta\s+name=[\"'](?:description|robots|keywords|twitter:[^\"']+)[\"'][^>]*?/?>",
    r"\s*<meta\s+property=[\"']og:[^\"']+[\"'][^>]*?/?>",
    r"\s*<link\s+rel=[\"']canonical[\"'][^>]*?/?>",
]


def inject_spa_document(
    document: str,
    *,
    title: str,
    description: str,
    canonical_url: str,
    body_html: str,
    structured_data: dict[str, Any],
    image_url: str | None = None,
    indexable: bool = True,
) -> str:
    """Inyecta SEO y contenido inicial en el bundle SPA sin duplicar metadata."""

    for pattern in _GENERIC_HEAD_PATTERNS:
        document = re.sub(pattern, "", document, flags=re.IGNORECASE | re.DOTALL)
    safe_title = html.escape(plain_text(title), quote=True)
    safe_description = html.escape(plain_text(description, limit=220), quote=True)
    safe_canonical = html.escape(canonical_url, quote=True)
    robots = (
        "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
        if indexable
        else "noindex,nofollow"
    )
    image_meta = ""
    if image_url:
        safe_image = html.escape(image_url, quote=True)
        image_meta = (
            f'<meta property="og:image" content="{safe_image}" />\n'
            f'<meta property="og:image:secure_url" content="{safe_image}" />\n'
            f'<meta name="twitter:image" content="{safe_image}" />\n'
        )
    head = f"""
<title>{safe_title}</title>
<meta name="description" content="{safe_description}" />
<meta name="robots" content="{robots}" />
<link rel="canonical" href="{safe_canonical}" />
<link rel="alternate" type="text/markdown" href="{safe_canonical}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="{SITE_NAME}" />
<meta property="og:locale" content="es_MX" />
<meta property="og:title" content="{safe_title}" />
<meta property="og:description" content="{safe_description}" />
<meta property="og:url" content="{safe_canonical}" />
<meta name="twitter:card" content="{'summary_large_image' if image_url else 'summary'}" />
<meta name="twitter:title" content="{safe_title}" />
<meta name="twitter:description" content="{safe_description}" />
{image_meta}<script type="application/ld+json">{json_ld(structured_data)}</script>
""".strip()
    document = document.replace("</head>", f"{head}\n</head>", 1)
    root_pattern = r'<div\s+id=["\']root["\']\s*>\s*</div>'
    replacement = f'<div id="root">{body_html}</div>'
    document, count = re.subn(root_pattern, replacement, document, count=1)
    if count == 0:
        document = document.replace("<body>", f"<body>{replacement}", 1)
    return document
