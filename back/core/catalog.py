"""Read-only public catalog primitives shared by HTTP, REST and MCP.

The module deliberately has a small trust boundary: every query is fixed,
parameterized and constrained to public collections and their public media.
It does not read files, reactions, visitors, users or administration data.
"""

from __future__ import annotations

from contextlib import contextmanager
from datetime import date, datetime, time
from decimal import Decimal
import json
import math
import mimetypes
from pathlib import PurePosixPath
import re
import unicodedata
from typing import Any, Iterable, Mapping, Sequence
from urllib.parse import quote, unquote, urlsplit, urlunsplit
from uuid import UUID

from .bases.utils import ClassBase


DEFAULT_PAGE_SIZE = 24
MAX_PAGE_SIZE = 100
MAX_PAGE = 10_000
MAX_QUERY_LENGTH = 200
MAX_TAG_FILTERS = 20
MAX_DETAIL_MEDIA = 500

MEDIA_TYPES = frozenset({"resultado", "relacionado", "modelo_3d"})
_MEDIA_TYPE_ALIASES = {
    "result": "resultado",
    "resultado": "resultado",
    "related": "relacionado",
    "relacionado": "relacionado",
    "3d": "modelo_3d",
    "model": "modelo_3d",
    "model_3d": "modelo_3d",
    "modelo": "modelo_3d",
    "modelo_3d": "modelo_3d",
}
_UUID_SUFFIX_RE = re.compile(
    r"(?:^|--)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$",
    re.IGNORECASE,
)
# Ancla de las URLs de figura: un solo guion seguido del codigo corto de 6
# caracteres alfanumericos (nunca el UUID completo, para mantener el link legible).
_CODE_SUFFIX_RE = re.compile(r"-([0-9a-f]{6})$", re.IGNORECASE)
_PURE_SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]")
_LIKE_ESCAPE_RE = re.compile(r"([\\%_])")
_TRANSLITERATION = str.maketrans(
    {
        "Æ": "AE",
        "æ": "ae",
        "Ø": "O",
        "ø": "o",
        "Œ": "OE",
        "œ": "oe",
        "Ł": "L",
        "ł": "l",
        "Đ": "D",
        "đ": "d",
        "Ð": "D",
        "ð": "d",
        "Þ": "Th",
        "þ": "th",
        "ı": "i",
    }
)


def _ascii_text(value: Any) -> str:
    text = "" if value is None else str(value)
    text = text.translate(_TRANSLITERATION).casefold()
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")


def _slug_fragment(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "-", _ascii_text(value)).strip("-")


def slugify(value: Any, *, max_length: int = 180, fallback: str = "item") -> str:
    """Return a deterministic lowercase ASCII URL slug.

    Punctuation (including ``#``) becomes a separator. Characters that need
    Unicode decomposition are transliterated before the ASCII restriction.
    """

    if not isinstance(max_length, int) or isinstance(max_length, bool) or max_length < 1:
        raise ValueError("max_length must be a positive integer")
    slug = _slug_fragment(value)
    if not slug:
        slug = _slug_fragment(fallback) or "item"
    return slug[:max_length].rstrip("-") or "item"[:max_length]


def _tag_name(tag: Any) -> str:
    if isinstance(tag, Mapping):
        tag = tag.get("nombre", tag.get("name", ""))
    return str(tag or "").strip().lstrip("#").strip()


def collection_slug(name: Any, tags: Iterable[Any] | None = None, *, max_length: int = 180) -> str:
    """Build the current collection slug from its name and sorted tag names."""

    name_slug = slugify(name, max_length=max_length, fallback="figura")
    tag_slugs: set[str] = set()
    tag_values = [tags] if isinstance(tags, (str, bytes, Mapping)) else (tags or ())
    for tag in tag_values:
        clean_name = _tag_name(tag)
        if clean_name:
            fragment = _slug_fragment(clean_name)[:max_length].rstrip("-")
            if fragment:
                tag_slugs.add(fragment)
    parts = [name_slug, *sorted(tag for tag in tag_slugs if tag and tag != name_slug)]
    return slugify("-".join(parts), max_length=max_length, fallback="figura")


def normalize_uuid(value: Any) -> str:
    """Normalize a UUID or raise ``ValueError`` without querying the database."""

    try:
        return str(UUID(str(value).strip()))
    except (AttributeError, TypeError, ValueError) as exc:
        raise ValueError("invalid UUID") from exc


def canonical_identifier(name: Any, tags: Iterable[Any] | None, collection_id: Any) -> str:
    """Return ``{current-slug}-{code}``: readable, with the short code as anchor."""

    return f"{collection_slug(name, tags)}-{short_code(collection_id).lower()}"


def tag_identifier(name: Any, tag_id: Any) -> str:
    """Return the stable public identifier for a real catalog tag."""

    return f"{slugify(name, fallback='etiqueta')}--{normalize_uuid(tag_id)}"


def short_code(collection_id: Any) -> str:
    """Match the catalog's deterministic six-character public code."""

    return normalize_uuid(collection_id).replace("-", "")[:6].upper()


def normalize_pagination(
    page: Any = 1,
    page_size: Any = DEFAULT_PAGE_SIZE,
    *,
    default_page_size: int = DEFAULT_PAGE_SIZE,
) -> tuple[int, int]:
    """Coerce pagination to bounded, non-zero integers."""

    try:
        clean_page = int(page)
    except (TypeError, ValueError, OverflowError):
        clean_page = 1
    try:
        clean_size = int(page_size)
    except (TypeError, ValueError, OverflowError):
        clean_size = default_page_size
    return min(max(clean_page, 1), MAX_PAGE), min(max(clean_size, 1), MAX_PAGE_SIZE)


def normalize_base_url(base_url: str) -> str:
    """Validate an HTTP(S) public base URL and return it without a trailing slash."""

    if not isinstance(base_url, str) or not base_url.strip() or len(base_url) > 2_048:
        raise ValueError("base_url must be an absolute HTTP(S) URL")
    if _CONTROL_RE.search(base_url) or "\\" in base_url:
        raise ValueError("unsafe base_url")
    parts = urlsplit(base_url.strip())
    if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
        raise ValueError("base_url must be an absolute HTTP(S) URL")
    if parts.username is not None or parts.password is not None or parts.query or parts.fragment:
        raise ValueError("base_url must not contain credentials, query or fragment")
    try:
        port = parts.port
        host = parts.hostname.encode("idna").decode("ascii").lower()
    except (UnicodeError, ValueError) as exc:
        raise ValueError("invalid base_url host or port") from exc
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    authority = f"{host}:{port}" if port is not None else host
    raw_segments = [unquote(segment) for segment in parts.path.split("/") if segment]
    if any(segment in {".", ".."} or _CONTROL_RE.search(segment) for segment in raw_segments):
        raise ValueError("unsafe base_url path")
    path = "/" + "/".join(quote(segment, safe="-._~") for segment in raw_segments) if raw_segments else ""
    return urlunsplit((parts.scheme.lower(), authority, path, "", "")).rstrip("/")


def _origin(url: str) -> tuple[str, str, int | None]:
    parts = urlsplit(url)
    scheme = parts.scheme.lower()
    port = parts.port
    if port is None:
        port = 443 if scheme == "https" else 80 if scheme == "http" else None
    host = (parts.hostname or "").encode("idna").decode("ascii").lower()
    return scheme, host, port


def _safe_url_segments(path: str) -> list[str] | None:
    if _CONTROL_RE.search(path) or "\\" in path or len(path) > 4_096:
        return None
    try:
        decoded = unquote(path, errors="strict")
    except (UnicodeDecodeError, ValueError):
        return None
    segments = [segment for segment in decoded.split("/") if segment]
    if (
        not segments
        or "\\" in decoded
        or any(segment in {".", ".."} or _CONTROL_RE.search(segment) for segment in segments)
    ):
        return None
    return segments


def build_public_url(base_url: str, *path_parts: Any) -> str:
    """Join quoted path parts to a validated base URL without ``urljoin`` escapes."""

    base = normalize_base_url(base_url)
    encoded: list[str] = []
    for part in path_parts:
        segments = _safe_url_segments(str(part))
        if segments is None:
            raise ValueError("unsafe public URL path")
        encoded.extend(quote(segment, safe="-._~") for segment in segments)
    if not encoded:
        return base
    return f"{base}/{'/'.join(encoded)}"


def media_public_path(raw_path: Any, *, base_url: str = "") -> str | None:
    """Turn a stored media key into a quoted public path, never a filesystem path."""

    if raw_path is None:
        return None
    raw = str(raw_path).strip()
    if not raw or _CONTROL_RE.search(raw) or "\\" in raw:
        return None
    try:
        parts = urlsplit(raw)
    except ValueError:
        return None
    if parts.query or parts.fragment:
        return None
    if parts.scheme or parts.netloc:
        if not base_url:
            return None
        try:
            base = normalize_base_url(base_url)
        except ValueError:
            return None
        try:
            same_origin = _origin(raw) == _origin(base)
        except (UnicodeError, ValueError):
            return None
        if parts.scheme.lower() not in {"http", "https"} or not same_origin:
            return None
        raw = parts.path
    segments = _safe_url_segments(raw)
    if segments is None:
        return None
    if parts.scheme or parts.netloc:
        base_segments = _safe_url_segments(urlsplit(base).path) or []
        if base_segments and segments[: len(base_segments)] == base_segments:
            segments = segments[len(base_segments) :]
    if not segments:
        return None
    if segments[0].lower() == "media":
        segments = segments[1:]
    if not segments:
        return None
    return "/media/" + "/".join(quote(segment, safe="-._~") for segment in segments)


def absolute_media_url(base_url: str, raw_path: Any) -> str | None:
    """Return a same-origin absolute media URL or ``None`` for an unsafe key."""

    base = normalize_base_url(base_url)
    path = media_public_path(raw_path, base_url=base)
    if path is None:
        return None
    return f"{base}{path}"


def to_json_safe(value: Any) -> Any:
    """Recursively convert database values to strict JSON-compatible values."""

    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, Mapping):
        return {str(key): to_json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [to_json_safe(item) for item in value]
    if hasattr(value, "item"):
        try:
            return to_json_safe(value.item())
        except (TypeError, ValueError):
            pass
    return str(value)


def catalog_json_dumps(value: Any, **kwargs: Any) -> str:
    """Serialize strict JSON and escape characters unsafe in embedded JSON-LD."""

    options = {"ensure_ascii": False, "allow_nan": False, "separators": (",", ":")}
    options.update(kwargs)
    options["allow_nan"] = False
    payload = json.dumps(to_json_safe(value), **options)
    return (
        payload.replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def _coerce_json(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    stripped = value.strip()
    if not stripped or stripped[0] not in "[{":
        return value
    try:
        return json.loads(stripped)
    except (TypeError, ValueError):
        return value


def _normalize_tags(value: Any) -> list[dict[str, Any]]:
    value = _coerce_json(value)
    if value is None:
        return []
    if isinstance(value, Mapping) or isinstance(value, str):
        value = [value]
    tags: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in value:
        if isinstance(item, Mapping):
            name = _tag_name(item)
            tag_id = str(item.get("id") or "")
            color = item.get("color")
        else:
            name = _tag_name(item)
            tag_id = ""
            color = None
        if not name:
            continue
        key = (name.casefold(), tag_id)
        if key in seen:
            continue
        seen.add(key)
        tag: dict[str, Any] = {"nombre": name, "name": name}
        if tag_id:
            tag["id"] = tag_id
        if color is not None:
            tag["color"] = color
        tags.append(tag)
    return sorted(tags, key=lambda tag: (str(tag["nombre"]).casefold(), str(tag.get("id", ""))))


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError, OverflowError):
        return default


def _clean_query(query: Any) -> str:
    clean = " ".join(str(query or "").split()).lstrip("#").lstrip()
    return clean[:MAX_QUERY_LENGTH]


def _escape_like(value: str) -> str:
    return _LIKE_ESCAPE_RE.sub(r"\\\1", value)


def _empty_page(page: int, page_size: int, **extra: Any) -> dict[str, Any]:
    return {"items": [], "page": page, "page_size": page_size, "total": 0, "pages": 0, **extra}


class CatalogRepository(ClassBase):
    """Read-only repository over ``consulta_asociativa``.

    Pass an existing connection to share a request transaction. Otherwise the
    repository opens lazily and must be used as a context manager or closed.
    """

    def __init__(self, connection: Any | None = None, *, base_url: str = "") -> None:
        self.base_url = normalize_base_url(base_url) if base_url else ""
        self._owns_connection = connection is None
        self._opened = connection is not None
        if connection is not None:
            self.conexion = connection

    def __enter__(self) -> "CatalogRepository":
        self._ensure_connection()
        return self

    def __exit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        self.close()

    def _ensure_connection(self) -> None:
        if not self._opened:
            self.create_conexion()
            self._opened = True

    def close(self) -> None:
        if self._owns_connection and self._opened:
            super().close_conexion()
            self._opened = False

    def _rows(self, result: Any) -> list[dict[str, Any]]:
        if result is None:
            return []
        converted = self.d2d(result)
        if converted is None:
            return []
        if isinstance(converted, Mapping):
            converted = [converted]
        if not isinstance(converted, Sequence) or isinstance(converted, (str, bytes)):
            return []
        return [dict(row) for row in converted if isinstance(row, Mapping)]

    def _query(self, sql: str, params: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
        self._ensure_connection()
        return self._rows(self.conexion.consulta_asociativa(sql, dict(params or {})))

    def _total(self, sql: str, params: Mapping[str, Any] | None = None) -> int:
        rows = self._query(sql, params)
        return max(_as_int(rows[0].get("total"), 0), 0) if rows else 0

    def _canonical_url(self, identifier: str) -> str | None:
        return build_public_url(self.base_url, "figura", identifier) if self.base_url else None

    def _tag_canonical_url(self, identifier: str) -> str | None:
        return build_public_url(self.base_url, "etiqueta", identifier) if self.base_url else None

    def _media_fields(self, raw_path: Any) -> tuple[str | None, str | None]:
        path = media_public_path(raw_path, base_url=self.base_url)
        url = absolute_media_url(self.base_url, raw_path) if self.base_url else None
        return path, url

    def _collection_reference(self, row: Mapping[str, Any]) -> dict[str, Any]:
        collection_id = normalize_uuid(row.get("id", row.get("figura_id")))
        name = str(row.get("nombre") or "").strip()
        description = row.get("descripcion")
        tags = [
            self._tag_reference(tag)
            for tag in _normalize_tags(
                row.get("tags", row.get("etiquetas", row.get("tag_names")))
            )
        ]
        identifier = canonical_identifier(name, tags, collection_id)
        url = self._canonical_url(identifier)
        code = short_code(collection_id)
        return {
            "resource_id": f"collection:{identifier}",
            "resource_type": "collection",
            "id": collection_id,
            "nombre": name,
            "name": name,
            "title": name,
            "descripcion": description,
            "description": description,
            "codigo": code,
            "code": code,
            "tags": tags,
            "etiquetas": list(tags),
            "slug": collection_slug(name, tags),
            "canonical_id": identifier,
            "identifier": identifier,
            "canonical_url": url,
            "url": url,
        }

    def _tag_reference(self, row: Mapping[str, Any]) -> dict[str, Any]:
        name = _tag_name(row)
        item: dict[str, Any] = {
            "nombre": name,
            "name": name,
            "title": name,
            "slug": slugify(name, fallback="etiqueta"),
        }
        tag_id = str(row.get("id") or "").strip()
        if tag_id:
            try:
                clean_id = normalize_uuid(tag_id)
            except ValueError:
                clean_id = ""
            if clean_id:
                identifier = tag_identifier(name, clean_id)
                canonical_url = self._tag_canonical_url(identifier)
                item.update(
                    {
                        "id": clean_id,
                        "canonical_id": identifier,
                        "identifier": identifier,
                        "canonical_url": canonical_url,
                        "url": canonical_url,
                    }
                )
        if row.get("color") is not None:
            item["color"] = row.get("color")
        return item

    def _tag_item(self, row: Mapping[str, Any]) -> dict[str, Any]:
        item = self._tag_reference(row)
        collection_count = max(_as_int(row.get("collection_count")), 0)
        model_count = max(_as_int(row.get("model_count")), 0)
        item.update(
            {
                "collection_count": collection_count,
                "model_count": model_count,
                "has_3d_model": model_count > 0,
                "updated_at": row.get("updated_at"),
            }
        )
        return item

    def _collection_item(self, row: Mapping[str, Any]) -> dict[str, Any]:
        item = self._collection_reference(row)
        cover_path, cover_url = self._media_fields(row.get("cover_path", row.get("portada")))
        result_count = max(_as_int(row.get("resultado_count")), 0)
        related_count = max(_as_int(row.get("relacionado_count")), 0)
        model_count = max(_as_int(row.get("modelo_3d_count")), 0)
        total = max(_as_int(row.get("media_count"), result_count + related_count + model_count), 0)
        item.update(
            {
                "orden": _as_int(row.get("orden")),
                "created_at": row.get("created_at"),
                "updated_at": row.get("updated_at"),
                "cover_path": cover_path,
                "cover_url": cover_url,
                "media_counts": {
                    "resultado": result_count,
                    "relacionado": related_count,
                    "modelo_3d": model_count,
                    "total": total,
                },
                "media_count": total,
                "model_count": model_count,
                "has_3d_model": model_count > 0,
            }
        )
        return item

    def _media_item(self, row: Mapping[str, Any], *, collection: Mapping[str, Any] | None = None) -> dict[str, Any] | None:
        media_id = normalize_uuid(row.get("id", row.get("media_id")))
        kind = str(row.get("tipo") or "")
        if kind not in MEDIA_TYPES:
            return None
        raw_path = row.get("archivo_url")
        path, url = self._media_fields(raw_path)
        if path is None:
            return None
        filename = unquote(PurePosixPath(urlsplit(path).path).name)
        mime_type = mimetypes.guess_type(filename)[0] or {
            ".stl": "model/stl",
            ".obj": "model/obj",
            ".3mf": "model/3mf",
        }.get(PurePosixPath(filename).suffix.lower(), "application/octet-stream")
        item: dict[str, Any] = {
            "resource_id": f"media:{media_id}",
            "resource_type": "media",
            "id": media_id,
            "tipo": kind,
            "kind": kind,
            "name": filename,
            "nombre": filename,
            "mime_type": mime_type,
            "orden": _as_int(row.get("orden")),
            "created_at": row.get("created_at"),
            "path": path,
            "url": url,
        }
        if collection is not None:
            item["collection"] = dict(collection)
        return item

    @staticmethod
    def _tag_sql() -> str:
        return """
            COALESCE((
                SELECT json_agg(
                    json_build_object('id', e.id::text, 'nombre', e.nombre, 'color', e.color)
                    ORDER BY lower(e.nombre), e.id
                )
                FROM figura_etiquetas fe
                JOIN etiquetas e ON e.id = fe.etiqueta_id
                WHERE fe.figura_id = f.id
            ), json_build_array()) AS tags
        """

    @classmethod
    def _collection_select_sql(cls) -> str:
        return f"""
            SELECT f.id, f.nombre, f.descripcion, f.orden, f.created_at, f.updated_at,
                {cls._tag_sql()},
                (
                    SELECT fa.archivo_url
                    FROM figura_archivos fa
                    WHERE fa.figura_id = f.id AND fa.tipo = 'resultado'
                      AND fa.archivo_url ~* '\\.(jpe?g|png|webp|gif|bmp|tiff?|avif)$'
                    ORDER BY fa.orden ASC, fa.created_at ASC, fa.id ASC
                    LIMIT 1
                ) AS cover_path,
                (SELECT COUNT(*) FROM figura_archivos fa WHERE fa.figura_id = f.id AND fa.tipo = 'resultado') AS resultado_count,
                (SELECT COUNT(*) FROM figura_archivos fa WHERE fa.figura_id = f.id AND fa.tipo = 'relacionado') AS relacionado_count,
                (SELECT COUNT(*) FROM figura_archivos fa WHERE fa.figura_id = f.id AND fa.tipo = 'modelo_3d') AS modelo_3d_count,
                (SELECT COUNT(*) FROM figura_archivos fa WHERE fa.figura_id = f.id AND fa.tipo IN ('resultado', 'relacionado', 'modelo_3d')) AS media_count
            FROM figuras f
        """

    def _filters(
        self,
        query: Any = None,
        tags: Iterable[Any] | None = None,
        tag_ids: Iterable[Any] | None = None,
    ) -> tuple[str, dict[str, Any]]:
        conditions = ["f.estatus = 'publico'"]
        params: dict[str, Any] = {}
        clean_query = _clean_query(query)
        if clean_query:
            params["search"] = f"%{_escape_like(clean_query)}%"
            conditions.append(
                """(
                    f.nombre ILIKE :search ESCAPE E'\\\\'
                    OR COALESCE(f.descripcion, '') ILIKE :search ESCAPE E'\\\\'
                    OR EXISTS (
                        SELECT 1 FROM figura_etiquetas fe_search
                        JOIN etiquetas e_search ON e_search.id = fe_search.etiqueta_id
                        WHERE fe_search.figura_id = f.id
                          AND e_search.nombre ILIKE :search ESCAPE E'\\\\'
                    )
                )"""
            )
        tag_values = (
            [tags]
            if isinstance(tags, (str, bytes, Mapping))
            else list(tags or ())
        )
        clean_tags = sorted({_tag_name(tag).lower() for tag in tag_values if _tag_name(tag)})[:MAX_TAG_FILTERS]
        if tag_values and not clean_tags:
            conditions.append("FALSE")
        for index, tag in enumerate(clean_tags):
            key = f"tag_{index}"
            params[key] = tag
            conditions.append(
                f"""EXISTS (
                    SELECT 1 FROM figura_etiquetas fe_filter_{index}
                    JOIN etiquetas e_filter_{index} ON e_filter_{index}.id = fe_filter_{index}.etiqueta_id
                    WHERE fe_filter_{index}.figura_id = f.id
                      AND lower(btrim(ltrim(btrim(e_filter_{index}.nombre), '#'))) = :{key}
                )"""
            )

        raw_tag_ids = (
            [tag_ids]
            if isinstance(tag_ids, (str, bytes, Mapping))
            else list(tag_ids or ())
        )
        clean_tag_ids: list[str] = []
        invalid_tag_id = False
        for raw_tag_id in raw_tag_ids[:MAX_TAG_FILTERS]:
            try:
                clean_tag_ids.append(normalize_uuid(raw_tag_id))
            except ValueError:
                invalid_tag_id = True
        if invalid_tag_id or (raw_tag_ids and not clean_tag_ids):
            conditions.append("FALSE")
        for index, tag_id in enumerate(sorted(set(clean_tag_ids))):
            key = f"tag_id_{index}"
            params[key] = tag_id
            conditions.append(
                f"""EXISTS (
                    SELECT 1 FROM figura_etiquetas fe_filter_id_{index}
                    WHERE fe_filter_id_{index}.figura_id = f.id
                      AND fe_filter_id_{index}.etiqueta_id = :{key}
                )"""
            )
        return " AND ".join(conditions), params

    def list_collections(
        self,
        query: Any = None,
        *,
        tags: Iterable[Any] | None = None,
        tag_ids: Iterable[Any] | None = None,
        page: Any = 1,
        page_size: Any = DEFAULT_PAGE_SIZE,
    ) -> dict[str, Any]:
        page, page_size = normalize_pagination(page, page_size)
        filters, params = self._filters(query, tags, tag_ids)
        total = self._total(
            f"""/* public_catalog.collection_list.count */
                SELECT COUNT(*) AS total FROM figuras f WHERE {filters}
            """,
            params,
        )
        query_params = {**params, "limit": page_size, "offset": (page - 1) * page_size}
        rows = self._query(
            f"""/* public_catalog.collection_list.items */
                {self._collection_select_sql()}
                WHERE {filters}
                ORDER BY f.orden ASC, f.created_at DESC, f.id ASC
                LIMIT :limit OFFSET :offset
            """,
            query_params,
        )
        items = [self._collection_item(row) for row in rows]
        return to_json_safe(
            {
                "items": items,
                "page": page,
                "page_size": page_size,
                "total": total,
                "pages": math.ceil(total / page_size) if total else 0,
            }
        )

    @staticmethod
    def _public_tag_select_sql() -> str:
        return """
            SELECT e.id, e.nombre, e.color,
                COUNT(DISTINCT f.id) AS collection_count,
                COALESCE(SUM((
                    SELECT COUNT(*)
                    FROM figura_archivos fa
                    WHERE fa.figura_id = f.id AND fa.tipo = 'modelo_3d'
                )), 0) AS model_count,
                MAX(f.updated_at) AS updated_at
            FROM etiquetas e
            JOIN figura_etiquetas fe ON fe.etiqueta_id = e.id
            JOIN figuras f ON f.id = fe.figura_id
            WHERE f.estatus = 'publico'
              AND btrim(ltrim(btrim(e.nombre), '#')) <> ''
        """

    def list_public_tags(
        self,
        *,
        page: Any = 1,
        page_size: Any = DEFAULT_PAGE_SIZE,
    ) -> dict[str, Any]:
        """List only tags that classify at least one public collection."""

        page, page_size = normalize_pagination(page, page_size)
        total = self._total(
            """/* public_catalog.tag_list.count */
                SELECT COUNT(DISTINCT e.id) AS total
                FROM etiquetas e
                JOIN figura_etiquetas fe ON fe.etiqueta_id = e.id
                JOIN figuras f ON f.id = fe.figura_id
                WHERE f.estatus = 'publico'
                  AND btrim(ltrim(btrim(e.nombre), '#')) <> ''
            """
        )
        rows = self._query(
            f"""/* public_catalog.tag_list.items */
                {self._public_tag_select_sql()}
                GROUP BY e.id, e.nombre, e.color
                ORDER BY COUNT(DISTINCT f.id) DESC, lower(e.nombre) ASC, e.id ASC
                LIMIT :limit OFFSET :offset
            """,
            {"limit": page_size, "offset": (page - 1) * page_size},
        )
        return to_json_safe(
            {
                "items": [self._tag_item(row) for row in rows],
                "page": page,
                "page_size": page_size,
                "total": total,
                "pages": math.ceil(total / page_size) if total else 0,
            }
        )

    def _tag_identity_by_uuid(self, tag_id: str) -> dict[str, Any] | None:
        rows = self._query(
            f"""/* public_catalog.tag_resolve.by_uuid */
                {self._public_tag_select_sql()}
                  AND e.id = :id
                GROUP BY e.id, e.nombre, e.color
            """,
            {"id": tag_id},
        )
        return rows[0] if rows else None

    def _all_tag_identities(self) -> list[dict[str, Any]]:
        return self._query(
            f"""/* public_catalog.tag_resolve.by_slug */
                {self._public_tag_select_sql()}
                GROUP BY e.id, e.nombre, e.color
                ORDER BY e.id ASC
            """
        )

    def _resolve_tag(self, identifier: Any) -> dict[str, Any] | None:
        raw = str(identifier or "").strip()
        if not raw or len(raw) > 512 or _CONTROL_RE.search(raw):
            return None
        identity: dict[str, Any] | None = None
        resolution = ""
        try:
            clean_id = normalize_uuid(raw)
            identity = self._tag_identity_by_uuid(clean_id)
            resolution = "uuid"
        except ValueError:
            suffix = _UUID_SUFFIX_RE.search(raw)
            if suffix:
                clean_id = normalize_uuid(suffix.group(1))
                identity = self._tag_identity_by_uuid(clean_id)
                resolution = "canonical"
            elif len(raw) <= 180 and _PURE_SLUG_RE.fullmatch(raw):
                matches = []
                for row in self._all_tag_identities():
                    if slugify(row.get("nombre"), fallback="etiqueta") == raw:
                        matches.append(row)
                        if len(matches) > 1:
                            return None
                identity = matches[0] if matches else None
                resolution = "slug"
        if identity is None:
            return None
        item = self._tag_item(identity)
        canonical = item.get("canonical_id")
        if not canonical:
            return None
        if resolution == "canonical" and raw != canonical:
            resolution = "stale"
        item.update(
            {
                "requested_identifier": raw,
                "resolution": resolution,
                "is_canonical": raw == canonical,
            }
        )
        return item

    def get_public_tag(self, identifier: Any) -> dict[str, Any] | None:
        resolved = self._resolve_tag(identifier)
        return to_json_safe(resolved) if resolved is not None else None

    def _identity_by_uuid(self, collection_id: str) -> dict[str, Any] | None:
        rows = self._query(
            """/* public_catalog.resolve.by_uuid */
                SELECT f.id, f.nombre,
                    ARRAY(
                        SELECT e.nombre FROM figura_etiquetas fe
                        JOIN etiquetas e ON e.id = fe.etiqueta_id
                        WHERE fe.figura_id = f.id
                        ORDER BY lower(e.nombre), e.id
                    ) AS tag_names
                FROM figuras f
                WHERE f.id = :id AND f.estatus = 'publico'
            """,
            {"id": collection_id},
        )
        return rows[0] if rows else None

    def _all_identities(self) -> list[dict[str, Any]]:
        return self._query(
            """/* public_catalog.resolve.by_slug */
                SELECT f.id, f.nombre,
                    ARRAY(
                        SELECT e.nombre FROM figura_etiquetas fe
                        JOIN etiquetas e ON e.id = fe.etiqueta_id
                        WHERE fe.figura_id = f.id
                        ORDER BY lower(e.nombre), e.id
                    ) AS tag_names
                FROM figuras f
                WHERE f.estatus = 'publico'
                ORDER BY f.id ASC
            """
        )

    def _identity_by_code(self, code: str) -> dict[str, Any] | None:
        rows = self._query(
            """/* public_catalog.resolve.by_code */
                SELECT f.id, f.nombre,
                    ARRAY(
                        SELECT e.nombre FROM figura_etiquetas fe
                        JOIN etiquetas e ON e.id = fe.etiqueta_id
                        WHERE fe.figura_id = f.id
                        ORDER BY lower(e.nombre), e.id
                    ) AS tag_names
                FROM figuras f
                WHERE f.estatus = 'publico'
                  AND lower(left(replace(f.id::text, '-', ''), 6)) = :code
            """,
            {"code": code},
        )
        # Una coincidencia ambigua (colision de codigo corto) no debe adivinar.
        return rows[0] if len(rows) == 1 else None

    def _resolve(self, identifier: Any) -> dict[str, Any] | None:
        raw = str(identifier or "").strip()
        if not raw or len(raw) > 512 or _CONTROL_RE.search(raw):
            return None
        identity: dict[str, Any] | None = None
        resolution = ""
        try:
            collection_id = normalize_uuid(raw)
            identity = self._identity_by_uuid(collection_id)
            resolution = "uuid"
        except ValueError:
            suffix = _CODE_SUFFIX_RE.search(raw)
            if suffix:
                identity = self._identity_by_code(suffix.group(1).lower())
                resolution = "canonical"
            elif len(raw) <= 180 and _PURE_SLUG_RE.fullmatch(raw):
                matches = []
                for row in self._all_identities():
                    tags = _normalize_tags(row.get("tag_names"))
                    if collection_slug(row.get("nombre"), tags) == raw:
                        matches.append(row)
                        if len(matches) > 1:
                            return None
                identity = matches[0] if matches else None
                resolution = "slug"
        if identity is None:
            return None
        reference = self._collection_reference(identity)
        canonical = reference["canonical_id"]
        if resolution == "canonical" and raw != canonical:
            resolution = "stale"
        reference.update(
            {
                "requested_identifier": raw,
                "resolution": resolution,
                "is_canonical": raw == canonical,
            }
        )
        return reference

    def resolve_collection(self, identifier: Any) -> dict[str, Any] | None:
        resolved = self._resolve(identifier)
        return to_json_safe(resolved) if resolved is not None else None

    def get_collection(self, identifier: Any) -> dict[str, Any] | None:
        resolved = self._resolve(identifier)
        if resolved is None:
            return None
        rows = self._query(
            f"""/* public_catalog.collection_detail */
                {self._collection_select_sql()}
                WHERE f.id = :id AND f.estatus = 'publico'
            """,
            {"id": resolved["id"]},
        )
        if not rows:
            return None
        item = self._collection_item(rows[0])
        media_rows = self._query(
            """/* public_catalog.collection_detail.media */
                SELECT fa.id, fa.archivo_url, fa.tipo, fa.orden, fa.created_at
                FROM figura_archivos fa
                JOIN figuras f ON f.id = fa.figura_id
                WHERE fa.figura_id = :id AND f.estatus = 'publico'
                  AND fa.tipo IN ('resultado', 'relacionado', 'modelo_3d')
                ORDER BY CASE fa.tipo
                    WHEN 'resultado' THEN 1
                    WHEN 'relacionado' THEN 2
                    WHEN 'modelo_3d' THEN 3
                    ELSE 4
                END, fa.orden ASC, fa.created_at ASC, fa.id ASC
                LIMIT :media_limit
            """,
            {"id": resolved["id"], "media_limit": MAX_DETAIL_MEDIA},
        )
        media = [media for row in media_rows if (media := self._media_item(row)) is not None]
        item.update(
            {
                "media": media,
                "resultado": [media_item for media_item in media if media_item["tipo"] == "resultado"],
                "relacionados": [media_item for media_item in media if media_item["tipo"] == "relacionado"],
                "modelos_3d": [media_item for media_item in media if media_item["tipo"] == "modelo_3d"],
                "requested_identifier": resolved["requested_identifier"],
                "resolution": resolved["resolution"],
                "is_canonical": resolved["is_canonical"],
                "media_truncated": item["media_count"] > len(media),
            }
        )
        return to_json_safe(item)

    @staticmethod
    def _normalize_media_type(media_type: Any) -> str | None:
        if media_type is None or str(media_type).strip() == "":
            return None
        normalized = _MEDIA_TYPE_ALIASES.get(str(media_type).strip().casefold())
        if normalized is None:
            raise ValueError(f"media_type must be one of: {', '.join(sorted(MEDIA_TYPES))}")
        return normalized

    def list_collection_media(
        self,
        identifier: Any,
        *,
        media_type: Any = None,
        page: Any = 1,
        page_size: Any = 50,
    ) -> dict[str, Any]:
        page, page_size = normalize_pagination(page, page_size, default_page_size=50)
        kind = self._normalize_media_type(media_type)
        resolved = self._resolve(identifier)
        if resolved is None:
            return to_json_safe(_empty_page(page, page_size, collection=None))
        kind_sql = " AND fa.tipo = :media_type" if kind else ""
        params: dict[str, Any] = {"id": resolved["id"]}
        if kind:
            params["media_type"] = kind
        total = self._total(
            f"""/* public_catalog.collection_media.count */
                SELECT COUNT(*) AS total
                FROM figura_archivos fa
                JOIN figuras f ON f.id = fa.figura_id
                WHERE fa.figura_id = :id AND f.estatus = 'publico'
                  AND fa.tipo IN ('resultado', 'relacionado', 'modelo_3d')
                  {kind_sql}
            """,
            params,
        )
        rows = self._query(
            f"""/* public_catalog.collection_media.items */
                SELECT fa.id, fa.archivo_url, fa.tipo, fa.orden, fa.created_at
                FROM figura_archivos fa
                JOIN figuras f ON f.id = fa.figura_id
                WHERE fa.figura_id = :id AND f.estatus = 'publico'
                  AND fa.tipo IN ('resultado', 'relacionado', 'modelo_3d')
                  {kind_sql}
                ORDER BY CASE fa.tipo
                    WHEN 'resultado' THEN 1
                    WHEN 'relacionado' THEN 2
                    WHEN 'modelo_3d' THEN 3
                    ELSE 4
                END, fa.orden ASC, fa.created_at ASC, fa.id ASC
                LIMIT :limit OFFSET :offset
            """,
            {**params, "limit": page_size, "offset": (page - 1) * page_size},
        )
        collection = {key: resolved[key] for key in (
            "resource_id", "resource_type", "id", "nombre", "name", "title", "codigo", "code",
            "slug", "canonical_id", "canonical_url", "url",
        )}
        items = [media for row in rows if (media := self._media_item(row, collection=collection)) is not None]
        return to_json_safe(
            {
                "items": items,
                "page": page,
                "page_size": page_size,
                "total": total,
                "pages": math.ceil(total / page_size) if total else 0,
                "collection": collection,
            }
        )

    def search_models(
        self,
        query: Any = None,
        *,
        page: Any = 1,
        page_size: Any = DEFAULT_PAGE_SIZE,
    ) -> dict[str, Any]:
        page, page_size = normalize_pagination(page, page_size)
        clean_query = _clean_query(query)
        search_sql = ""
        params: dict[str, Any] = {}
        if clean_query:
            params["search"] = f"%{_escape_like(clean_query)}%"
            search_sql = """AND (
                f.nombre ILIKE :search ESCAPE E'\\\\'
                OR COALESCE(f.descripcion, '') ILIKE :search ESCAPE E'\\\\'
                OR fa.archivo_url ILIKE :search ESCAPE E'\\\\'
                OR EXISTS (
                    SELECT 1 FROM figura_etiquetas fe_search
                    JOIN etiquetas e_search ON e_search.id = fe_search.etiqueta_id
                    WHERE fe_search.figura_id = f.id
                      AND e_search.nombre ILIKE :search ESCAPE E'\\\\'
                )
            )"""
        total = self._total(
            f"""/* public_catalog.model_search.count */
                SELECT COUNT(*) AS total
                FROM figura_archivos fa
                JOIN figuras f ON f.id = fa.figura_id
                WHERE f.estatus = 'publico' AND fa.tipo = 'modelo_3d' {search_sql}
            """,
            params,
        )
        rows = self._query(
            f"""/* public_catalog.model_search.items */
                SELECT fa.id AS media_id, fa.archivo_url, fa.tipo, fa.orden, fa.created_at,
                    f.id AS figura_id, f.nombre, f.descripcion,
                    ARRAY(
                        SELECT e.nombre FROM figura_etiquetas fe
                        JOIN etiquetas e ON e.id = fe.etiqueta_id
                        WHERE fe.figura_id = f.id
                        ORDER BY lower(e.nombre), e.id
                    ) AS tag_names
                FROM figura_archivos fa
                JOIN figuras f ON f.id = fa.figura_id
                WHERE f.estatus = 'publico' AND fa.tipo = 'modelo_3d' {search_sql}
                ORDER BY f.orden ASC, f.created_at DESC, fa.orden ASC, fa.id ASC
                LIMIT :limit OFFSET :offset
            """,
            {**params, "limit": page_size, "offset": (page - 1) * page_size},
        )
        items: list[dict[str, Any]] = []
        for row in rows:
            collection = self._collection_reference(
                {
                    "id": row.get("figura_id"),
                    "nombre": row.get("nombre"),
                    "descripcion": row.get("descripcion"),
                    "tag_names": row.get("tag_names"),
                }
            )
            media = self._media_item(row, collection=collection)
            if media is not None:
                items.append(media)
        return to_json_safe(
            {
                "items": items,
                "page": page,
                "page_size": page_size,
                "total": total,
                "pages": math.ceil(total / page_size) if total else 0,
            }
        )

    def get_media(self, media_id: Any) -> dict[str, Any] | None:
        try:
            clean_id = normalize_uuid(media_id)
        except ValueError:
            return None
        rows = self._query(
            """/* public_catalog.media_detail */
                SELECT fa.id AS media_id, fa.archivo_url, fa.tipo, fa.orden, fa.created_at,
                    f.id AS figura_id, f.nombre, f.descripcion,
                    ARRAY(
                        SELECT e.nombre FROM figura_etiquetas fe
                        JOIN etiquetas e ON e.id = fe.etiqueta_id
                        WHERE fe.figura_id = f.id
                        ORDER BY lower(e.nombre), e.id
                    ) AS tag_names
                FROM figura_archivos fa
                JOIN figuras f ON f.id = fa.figura_id
                WHERE fa.id = :id AND f.estatus = 'publico'
                  AND fa.tipo IN ('resultado', 'relacionado', 'modelo_3d')
            """,
            {"id": clean_id},
        )
        if not rows:
            return None
        row = rows[0]
        collection = self._collection_reference(
            {
                "id": row.get("figura_id"),
                "nombre": row.get("nombre"),
                "descripcion": row.get("descripcion"),
                "tag_names": row.get("tag_names"),
            }
        )
        item = self._media_item(row, collection=collection)
        return to_json_safe(item) if item is not None else None

    def get_catalog_resource(self, resource_id: Any) -> dict[str, Any] | None:
        raw = str(resource_id or "").strip()
        if not raw or len(raw) > 600 or _CONTROL_RE.search(raw):
            return None
        namespace, separator, identifier = raw.partition(":")
        if not separator:
            return self.get_collection(raw)
        if namespace == "collection":
            return self.get_collection(identifier)
        if namespace == "media":
            return self.get_media(identifier)
        return None


@contextmanager
def _repository(connection: Any | None, base_url: str):
    repository = CatalogRepository(connection=connection, base_url=base_url)
    try:
        yield repository
    finally:
        repository.close()


def list_collections(
    query: Any = None,
    *,
    tags: Iterable[Any] | None = None,
    tag_ids: Iterable[Any] | None = None,
    page: Any = 1,
    page_size: Any = DEFAULT_PAGE_SIZE,
    base_url: str = "",
    connection: Any | None = None,
) -> dict[str, Any]:
    with _repository(connection, base_url) as repository:
        return repository.list_collections(
            query,
            tags=tags,
            tag_ids=tag_ids,
            page=page,
            page_size=page_size,
        )


def list_public_tags(
    *,
    page: Any = 1,
    page_size: Any = DEFAULT_PAGE_SIZE,
    base_url: str = "",
    connection: Any | None = None,
) -> dict[str, Any]:
    with _repository(connection, base_url) as repository:
        return repository.list_public_tags(page=page, page_size=page_size)


def get_public_tag(
    identifier: Any,
    *,
    base_url: str = "",
    connection: Any | None = None,
) -> dict[str, Any] | None:
    with _repository(connection, base_url) as repository:
        return repository.get_public_tag(identifier)


def search_catalog(
    query: Any = None,
    *,
    tags: Iterable[Any] | None = None,
    page: Any = 1,
    page_size: Any = DEFAULT_PAGE_SIZE,
    base_url: str = "",
    connection: Any | None = None,
) -> dict[str, Any]:
    return list_collections(
        query,
        tags=tags,
        page=page,
        page_size=page_size,
        base_url=base_url,
        connection=connection,
    )


def resolve_collection(identifier: Any, *, base_url: str = "", connection: Any | None = None) -> dict[str, Any] | None:
    with _repository(connection, base_url) as repository:
        return repository.resolve_collection(identifier)


def get_collection(identifier: Any, *, base_url: str = "", connection: Any | None = None) -> dict[str, Any] | None:
    with _repository(connection, base_url) as repository:
        return repository.get_collection(identifier)


def list_collection_media(
    identifier: Any,
    *,
    media_type: Any = None,
    page: Any = 1,
    page_size: Any = 50,
    base_url: str = "",
    connection: Any | None = None,
) -> dict[str, Any]:
    with _repository(connection, base_url) as repository:
        return repository.list_collection_media(identifier, media_type=media_type, page=page, page_size=page_size)


def search_models(
    query: Any = None,
    *,
    page: Any = 1,
    page_size: Any = DEFAULT_PAGE_SIZE,
    base_url: str = "",
    connection: Any | None = None,
) -> dict[str, Any]:
    with _repository(connection, base_url) as repository:
        return repository.search_models(query, page=page, page_size=page_size)


def get_media(media_id: Any, *, base_url: str = "", connection: Any | None = None) -> dict[str, Any] | None:
    with _repository(connection, base_url) as repository:
        return repository.get_media(media_id)


def get_catalog_resource(resource_id: Any, *, base_url: str = "", connection: Any | None = None) -> dict[str, Any] | None:
    with _repository(connection, base_url) as repository:
        return repository.get_catalog_resource(resource_id)


__all__ = [
    "CatalogRepository",
    "DEFAULT_PAGE_SIZE",
    "MAX_PAGE",
    "MAX_PAGE_SIZE",
    "MEDIA_TYPES",
    "absolute_media_url",
    "build_public_url",
    "canonical_identifier",
    "catalog_json_dumps",
    "collection_slug",
    "get_catalog_resource",
    "get_collection",
    "get_media",
    "get_public_tag",
    "list_collection_media",
    "list_collections",
    "list_public_tags",
    "media_public_path",
    "normalize_base_url",
    "normalize_pagination",
    "normalize_uuid",
    "resolve_collection",
    "search_catalog",
    "search_models",
    "short_code",
    "slugify",
    "tag_identifier",
    "to_json_safe",
]
