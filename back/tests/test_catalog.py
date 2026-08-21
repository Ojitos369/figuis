from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
import importlib
import json
import math
import sys
import types
import unittest
from uuid import UUID


# Keep these unit tests independent from pandas/PostgreSQL. Production imports
# the real ClassBase; the repository accepts a connection for request-scoped use.
if "back.core.bases.utils" not in sys.modules:
    utils_stub = types.ModuleType("back.core.bases.utils")

    class ClassBase:
        def d2d(self, value):
            return value

        def create_conexion(self):  # pragma: no cover - injected in every test
            raise AssertionError("a real database connection was requested")

        def close_conexion(self):
            pass

    utils_stub.ClassBase = ClassBase
    sys.modules["back.core.bases.utils"] = utils_stub

catalog = importlib.import_module("back.core.catalog")


COLLECTION_ID = "123e4567-e89b-42d3-a456-426614174000"
SECOND_COLLECTION_ID = "123e4567-e89b-42d3-a456-426614174001"
MEDIA_ID = "223e4567-e89b-42d3-a456-426614174000"
SECOND_MEDIA_ID = "223e4567-e89b-42d3-a456-426614174001"
TAG_ID = "323e4567-e89b-42d3-a456-426614174000"
SECOND_TAG_ID = "323e4567-e89b-42d3-a456-426614174001"


class FakeConnection:
    def __init__(self, handler):
        self.handler = handler
        self.calls = []

    def consulta_asociativa(self, sql, params):
        self.calls.append((sql, dict(params)))
        return self.handler(sql, dict(params))


class SlugAndIdentifierTests(unittest.TestCase):
    def test_slugify_transliterates_and_normalizes_separators(self):
        self.assertEqual(
            catalog.slugify("  Niño Æther & Straße #Élite  "),
            "nino-aether-strasse-elite",
        )
        self.assertEqual(catalog.slugify("Łódź / Øresund"), "lodz-oresund")
        self.assertEqual(catalog.slugify("東京", fallback="figura"), "figura")

    def test_collection_slug_is_deterministic_and_has_no_hash(self):
        first = catalog.collection_slug(
            "Dragón Rojo",
            [{"nombre": "#ZBrush"}, {"name": " Fantasía "}, "#ZBrush"],
        )
        second = catalog.collection_slug("Dragón Rojo", ["Fantasía", "ZBrush"])
        self.assertEqual(first, "dragon-rojo-fantasia-zbrush")
        self.assertEqual(first, second)
        self.assertNotIn("#", first)

    def test_canonical_identifier_uses_short_readable_code(self):
        identifier = catalog.canonical_identifier("Robot", ["#Sci Fi"], COLLECTION_ID.upper())
        self.assertEqual(identifier, "robot-sci-fi-123e45")
        self.assertEqual(catalog.short_code(COLLECTION_ID), "123E45")
        self.assertNotIn(COLLECTION_ID, identifier)

    def test_tag_identifier_is_stable_and_contains_no_hash(self):
        identifier = catalog.tag_identifier("#K-pop / TWICE", TAG_ID.upper())
        self.assertEqual(identifier, f"k-pop-twice--{TAG_ID}")
        self.assertNotIn("#", identifier)


class UrlAndSerializationTests(unittest.TestCase):
    def test_urls_are_absolute_quoted_and_same_origin(self):
        base = catalog.normalize_base_url("HTTPS://Ejemplo.COM/catalogo/")
        self.assertEqual(base, "https://ejemplo.com/catalogo")
        self.assertEqual(
            catalog.build_public_url(base, "figura", "niño bonito"),
            "https://ejemplo.com/catalogo/figura/ni%C3%B1o%20bonito",
        )
        self.assertEqual(
            catalog.absolute_media_url(base, "figuras/robot final.webp"),
            "https://ejemplo.com/catalogo/media/figuras/robot%20final.webp",
        )
        self.assertIsNone(catalog.absolute_media_url(base, "https://evil.example/file.stl"))
        self.assertIsNone(catalog.media_public_path("../secret.env", base_url=base))
        with self.assertRaises(ValueError):
            catalog.normalize_base_url("javascript:alert(1)")
        with self.assertRaises(ValueError):
            catalog.normalize_base_url("https://user:secret@example.com")

    def test_json_serialization_is_strict_and_safe_for_json_ld(self):
        value = {
            "uuid": UUID(COLLECTION_ID),
            "when": datetime(2026, 8, 20, 12, 30, tzinfo=timezone.utc),
            "price": Decimal("12.340"),
            "nan": math.nan,
            "html": "</script><b>&",
        }
        safe = catalog.to_json_safe(value)
        self.assertIsNone(safe["nan"])
        payload = catalog.catalog_json_dumps(value)
        self.assertNotIn("</script>", payload)
        parsed = json.loads(payload)
        self.assertEqual(parsed["uuid"], COLLECTION_ID)
        self.assertEqual(parsed["price"], "12.340")

    def test_pagination_is_bounded(self):
        self.assertEqual(
            catalog.normalize_pagination(-20, 10_000),
            (1, catalog.MAX_PAGE_SIZE),
        )
        self.assertEqual(
            catalog.normalize_pagination(10**20, "bad"),
            (catalog.MAX_PAGE, catalog.DEFAULT_PAGE_SIZE),
        )


class RepositoryTests(unittest.TestCase):
    @staticmethod
    def identity(collection_id=COLLECTION_ID, name="Niño Robot", tags=None):
        return {
            "id": collection_id,
            "nombre": name,
            "tag_names": tags if tags is not None else ["Sci Fi", "Impresión 3D"],
        }

    def test_resolves_uuid_stale_identifier_and_unique_current_slug(self):
        code = catalog.short_code(COLLECTION_ID).lower()

        def handler(sql, params):
            if "resolve.by_uuid" in sql:
                return [self.identity()] if params["id"] == COLLECTION_ID else []
            if "resolve.by_code" in sql:
                return [self.identity()] if params["code"] == code else []
            if "resolve.by_slug" in sql:
                return [self.identity()]
            return []

        connection = FakeConnection(handler)
        repository = catalog.CatalogRepository(connection, base_url="https://figuis.example")
        canonical = f"nino-robot-impresion-3d-sci-fi-{code}"

        by_uuid = repository.resolve_collection(COLLECTION_ID)
        self.assertEqual(by_uuid["id"], COLLECTION_ID)
        self.assertEqual(by_uuid["resolution"], "uuid")
        self.assertFalse(by_uuid["is_canonical"])

        stale = repository.resolve_collection(f"nombre-anterior-{code}")
        self.assertEqual(stale["canonical_id"], canonical)
        self.assertEqual(stale["resolution"], "stale")

        by_slug = repository.resolve_collection("nino-robot-impresion-3d-sci-fi")
        self.assertEqual(by_slug["id"], COLLECTION_ID)
        self.assertEqual(by_slug["resolution"], "slug")
        self.assertEqual(by_slug["canonical_url"], f"https://figuis.example/figura/{canonical}")

    def test_ambiguous_short_code_does_not_guess(self):
        def handler(sql, _params):
            if "resolve.by_code" in sql:
                return [
                    self.identity(COLLECTION_ID, "Robot", ["3D"]),
                    self.identity(SECOND_COLLECTION_ID, "Robot", ["3D"]),
                ]
            return []

        repository = catalog.CatalogRepository(FakeConnection(handler))
        self.assertIsNone(repository.resolve_collection("robot-3d-123e45"))

    def test_ambiguous_pure_slug_does_not_guess(self):
        def handler(sql, _params):
            if "resolve.by_slug" in sql:
                return [
                    self.identity(COLLECTION_ID, "Robot", ["3D"]),
                    self.identity(SECOND_COLLECTION_ID, "Robot", ["3D"]),
                ]
            return []

        repository = catalog.CatalogRepository(FakeConnection(handler))
        self.assertIsNone(repository.resolve_collection("robot-3d"))

    def test_lists_and_resolves_only_tags_used_by_public_collections(self):
        row = {
            "id": TAG_ID,
            "nombre": "twice",
            "color": "#fff",
            "collection_count": 39,
            "updated_at": datetime(2026, 8, 20),
        }

        def handler(sql, params):
            if "tag_list.count" in sql:
                return [{"total": 1}]
            if "tag_list.items" in sql:
                return [row]
            if "tag_resolve.by_uuid" in sql:
                return [row] if params["id"] == TAG_ID else []
            if "tag_resolve.by_slug" in sql:
                return [row]
            return []

        connection = FakeConnection(handler)
        repository = catalog.CatalogRepository(
            connection,
            base_url="https://figuis.example",
        )
        page = repository.list_public_tags(page=-1, page_size=500)
        item = page["items"][0]
        canonical = f"twice--{TAG_ID}"

        self.assertEqual((page["page"], page["page_size"]), (1, catalog.MAX_PAGE_SIZE))
        self.assertEqual(item["canonical_id"], canonical)
        self.assertEqual(item["canonical_url"], f"https://figuis.example/etiqueta/{canonical}")
        self.assertEqual(item["collection_count"], 39)

        by_uuid = repository.get_public_tag(TAG_ID)
        by_slug = repository.get_public_tag("twice")
        stale = repository.get_public_tag(f"old-name--{TAG_ID}")
        self.assertEqual(by_uuid["resolution"], "uuid")
        self.assertEqual(by_slug["resolution"], "slug")
        self.assertEqual(stale["resolution"], "stale")
        self.assertEqual(stale["canonical_id"], canonical)

        for sql, _params in connection.calls:
            if "public_catalog.tag_" in sql:
                self.assertIn("f.estatus = 'publico'", sql)
                self.assertIn("btrim(ltrim(btrim(e.nombre), '#')) <> ''", sql)

    def test_ambiguous_tag_slug_does_not_guess(self):
        def handler(sql, _params):
            if "tag_resolve.by_slug" in sql:
                return [
                    {"id": TAG_ID, "nombre": "K pop", "collection_count": 1},
                    {"id": SECOND_TAG_ID, "nombre": "K-pop", "collection_count": 1},
                ]
            return []

        repository = catalog.CatalogRepository(FakeConnection(handler))
        self.assertIsNone(repository.get_public_tag("k-pop"))

    def test_cover_selects_only_images_but_counts_all_public_media(self):
        sql = " ".join(catalog.CatalogRepository._collection_select_sql().split())

        self.assertIn("fa.archivo_url ~*", sql)
        self.assertIn("jpe?g|png|webp|gif|bmp|tiff?|avif", sql)
        self.assertIn(
            "(SELECT COUNT(*) FROM figura_archivos fa WHERE fa.figura_id = f.id AND fa.tipo = 'resultado') AS resultado_count",
            sql,
        )
        self.assertIn(
            "fa.tipo IN ('resultado', 'relacionado')) AS media_count",
            sql,
        )

    def test_list_is_public_parameterized_bounded_and_has_expected_aliases(self):
        attack = "robot%' OR TRUE --"
        row = {
            "id": COLLECTION_ID,
            "nombre": "Robot",
            "descripcion": "Modelo articulado",
            "orden": 2,
            "created_at": datetime(2026, 8, 20),
            "updated_at": datetime(2026, 8, 20),
            "tags": [{"id": SECOND_COLLECTION_ID, "nombre": "#Sci Fi", "color": "#fff"}],
            "cover_path": "covers/robot final.webp",
            "resultado_count": 2,
            "relacionado_count": 2,
            "media_count": 4,
        }

        def handler(sql, _params):
            if "collection_list.count" in sql:
                return [{"total": 1}]
            if "collection_list.items" in sql:
                return [row]
            return []

        connection = FakeConnection(handler)
        result = catalog.list_collections(
            attack,
            tags=["#Sci Fi"],
            page=-5,
            page_size=9_999,
            base_url="https://figuis.example",
            connection=connection,
        )
        self.assertEqual((result["page"], result["page_size"]), (1, catalog.MAX_PAGE_SIZE))
        item = result["items"][0]
        self.assertEqual(item["name"], item["nombre"])
        self.assertEqual(item["description"], item["descripcion"])
        self.assertEqual(item["code"], item["codigo"])
        self.assertEqual(item["resource_id"], f"collection:{item['canonical_id']}")
        self.assertEqual(item["media_counts"]["total"], 4)
        self.assertTrue(item["cover_url"].startswith("https://figuis.example/media/"))

        for sql, _params in connection.calls:
            self.assertIn("f.estatus = 'publico'", sql)
            self.assertNotIn(attack, sql)
        self.assertEqual(connection.calls[0][1]["search"], "%robot\\%' OR TRUE --%")
        self.assertEqual(connection.calls[-1][1]["limit"], catalog.MAX_PAGE_SIZE)

    def test_search_normalizes_a_leading_visible_hashtag(self):
        def handler(sql, _params):
            if "collection_list.count" in sql:
                return [{"total": 0}]
            return []

        connection = FakeConnection(handler)
        catalog.list_collections("  #twice  ", connection=connection)

        self.assertEqual(connection.calls[0][1]["search"], "%twice%")
        self.assertNotIn("#twice", connection.calls[0][0])

    def test_tag_landing_filter_uses_uuid_and_empty_tag_never_lists_everything(self):
        def handler(sql, _params):
            if "collection_list.count" in sql:
                return [{"total": 0}]
            return []

        by_id = FakeConnection(handler)
        catalog.list_collections(tag_ids=[TAG_ID], connection=by_id)
        count_sql, count_params = by_id.calls[0]
        self.assertIn("fe_filter_id_0.etiqueta_id = :tag_id_0", count_sql)
        self.assertEqual(count_params["tag_id_0"], TAG_ID)

        empty_name = FakeConnection(handler)
        catalog.list_collections(tags=["#"], connection=empty_name)
        self.assertIn(" AND FALSE", empty_name.calls[0][0])

        invalid_id = FakeConnection(handler)
        catalog.list_collections(tag_ids=["not-a-uuid"], connection=invalid_id)
        self.assertIn(" AND FALSE", invalid_id.calls[0][0])

    def test_detail_has_tags_and_safe_grouped_media_without_raw_path(self):
        detail_row = {
            "id": COLLECTION_ID,
            "nombre": "Robot",
            "descripcion": "Modelo",
            "tags": [{"nombre": "3D"}],
            "cover_path": "resultados/robot.png",
            "resultado_count": 1,
            "relacionado_count": 2,
            "media_count": 3,
        }
        media_rows = [
            {"id": MEDIA_ID, "archivo_url": "resultados/robot.png", "tipo": "resultado", "orden": 0},
            {"id": SECOND_MEDIA_ID, "archivo_url": "relacionados/robot-ref.png", "tipo": "relacionado", "orden": 1},
            {
                "id": "223e4567-e89b-42d3-a456-426614174002",
                "archivo_url": "../private.env",
                "tipo": "relacionado",
                "orden": 2,
            },
        ]

        def handler(sql, _params):
            if "resolve.by_uuid" in sql:
                return [self.identity(name="Robot", tags=["3D"])]
            if "collection_detail.media" in sql:
                return media_rows
            if "collection_detail" in sql:
                return [detail_row]
            return []

        connection = FakeConnection(handler)
        detail = catalog.get_collection(
            COLLECTION_ID,
            base_url="https://figuis.example",
            connection=connection,
        )
        self.assertEqual(len(detail["media"]), 2)
        self.assertEqual(len(detail["resultado"]), 1)
        self.assertEqual(len(detail["relacionados"]), 1)
        self.assertTrue(detail["media_truncated"])
        serialized = json.dumps(detail)
        self.assertNotIn("archivo_url", serialized)
        self.assertNotIn("private.env", serialized)
        for sql, _params in connection.calls:
            self.assertNotIn("reacciones", sql)
            self.assertNotIn("usuarios", sql)

    def test_media_listing_validates_type_and_stays_public(self):
        def handler(sql, _params):
            if "resolve.by_uuid" in sql:
                return [self.identity(name="Robot", tags=["3D"])]
            if "collection_media.count" in sql:
                return [{"total": 1}]
            if "collection_media.items" in sql:
                return [{"id": MEDIA_ID, "archivo_url": "relacionados/robot.png", "tipo": "relacionado"}]
            return []

        connection = FakeConnection(handler)
        repository = catalog.CatalogRepository(connection, base_url="https://figuis.example")
        with self.assertRaises(ValueError):
            repository.list_collection_media(COLLECTION_ID, media_type="relacionado; DROP TABLE figuras")

        media_page = repository.list_collection_media(COLLECTION_ID, media_type="related")
        self.assertEqual(media_page["items"][0]["kind"], "relacionado")
        for sql, _params in connection.calls:
            if "collection_media" in sql:
                self.assertIn("f.estatus = 'publico'", sql)


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
