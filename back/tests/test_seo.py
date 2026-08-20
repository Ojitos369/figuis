import json
import re
import unittest

from core.seo import (
    HOME_TITLE,
    SITE_ALTERNATE_NAMES,
    SITE_INSTAGRAM_URL,
    catalog_html,
    catalog_json_ld,
    catalog_markdown,
    collection_json_ld,
    collection_markdown,
    collection_meta_description,
    collection_title,
    inject_spa_document,
    tag_html,
    tag_json_ld,
    tag_markdown,
    tag_page_title,
)


COLLECTION = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Niño Dragón",
    "description": "Una colección de prueba.",
    "canonical_id": "nino-dragon-fantasia--123e4567-e89b-12d3-a456-426614174000",
    "canonical_url": "https://figuis.example/figura/nino-dragon-fantasia--123e4567-e89b-12d3-a456-426614174000",
    "tags": [
        {
            "id": "323e4567-e89b-42d3-a456-426614174000",
            "name": "Fantasía",
            "canonical_url": "https://figuis.example/etiqueta/fantasia--323e4567-e89b-42d3-a456-426614174000",
        }
    ],
    "media_counts": {"resultado": 1, "relacionado": 0, "modelo_3d": 1, "total": 2},
    "media": [
        {
            "id": "media-1",
            "kind": "resultado",
            "name": "Vista principal",
            "url": "https://figuis.example/media/dragon.webp",
            "mime_type": "image/webp",
        },
        {
            "id": "media-2",
            "kind": "modelo_3d",
            "name": "Modelo STL",
            "url": "https://figuis.example/media/dragon.stl",
            "mime_type": "model/stl",
        },
    ],
}
TAG = {
    "id": "323e4567-e89b-42d3-a456-426614174001",
    "name": "twice",
    "canonical_id": "twice--323e4567-e89b-42d3-a456-426614174001",
    "canonical_url": "https://figuis.example/etiqueta/twice--323e4567-e89b-42d3-a456-426614174001",
    "collection_count": 39,
    "model_count": 2,
    "updated_at": "2026-08-20T10:00:00+00:00",
}


class SeoRepresentationsTests(unittest.TestCase):
    def test_json_ld_describes_visible_collection_without_fake_commerce(self):
        payload = collection_json_ld(COLLECTION, "https://figuis.example")
        encoded = json.dumps(payload)
        self.assertIn("CollectionPage", encoded)
        self.assertIn("ImageObject", encoded)
        self.assertIn("3DModel", encoded)
        self.assertNotIn('"Offer"', encoded)
        self.assertNotIn('"Product"', encoded)
        self.assertNotIn('"price"', encoded)
        self.assertIn('"alternateName": ["Figuis 3D", "Figuis Ojitos369", "Figuis 369"]', json.dumps(payload))

    def test_collection_title_uses_two_non_redundant_tags_and_brand(self):
        collection = {
            "name": "Momo IG 010725",
            "description": "Galería pública.",
            "tags": [
                {"name": "momo"},
                {"name": "Instagram"},
                {"name": "twice"},
                {"name": "tif tour"},
            ],
        }
        self.assertEqual(
            collection_title(collection),
            "Momo IG 010725 · Instagram, twice | Figuis 3D",
        )
        description = collection_meta_description(collection)
        self.assertIn("clasificada en momo, Instagram, twice, tif tour", description)
        self.assertIn("Figuis 3D", description)

    def test_markdown_states_non_commercial_scope(self):
        markdown = collection_markdown(COLLECTION)
        self.assertIn(COLLECTION["canonical_url"], markdown)
        self.assertIn("No publica precio", markdown)
        self.assertIn("Modelo STL", markdown)
        self.assertIn("[#Fantasía](https://figuis.example/etiqueta/fantasia--", markdown)

    def test_home_representations_expose_brand_aliases_and_real_tag_links(self):
        html_page = catalog_html([COLLECTION], "https://figuis.example", 1)
        markdown = catalog_markdown([COLLECTION], 1, "https://figuis.example")
        structured = catalog_json_ld([COLLECTION], "https://figuis.example", 1)
        encoded = json.dumps(structured)

        self.assertEqual(HOME_TITLE, "Figuis 3D · Figuras 3D, K-pop y coleccionables")
        self.assertIn("Figuis es el catálogo de Ojitos369", html_page)
        self.assertIn("[#Fantasía]", markdown)
        self.assertIn(COLLECTION["tags"][0]["canonical_url"], html_page)
        self.assertNotIn("/etiqueta/#", html_page)
        for alias in SITE_ALTERNATE_NAMES:
            self.assertIn(alias, encoded)
        for term in ("Funko", "chibi", "Hipper", "Sonny Angel", "figuras kpop", "figuras coleccionables"):
            self.assertIn(term, html_page)
            self.assertIn(term, markdown)
        for term in ("Funkos", "Hipper", "Sonny Angel", "Sony Angel", "Chibi", "Figuras kpop"):
            self.assertIn(term, encoded)
        self.assertIn(SITE_INSTAGRAM_URL, html_page)
        self.assertIn(SITE_INSTAGRAM_URL, markdown)
        self.assertIn(SITE_INSTAGRAM_URL, encoded)

    def test_tag_representations_are_indexable_without_invented_categories(self):
        html_page = tag_html(TAG, [COLLECTION], "https://figuis.example", 39)
        markdown = tag_markdown(TAG, [COLLECTION], 39)
        structured = tag_json_ld(TAG, [COLLECTION], "https://figuis.example", 39)
        encoded = json.dumps(structured)

        self.assertEqual(
            tag_page_title(TAG),
            "Twice: figuras y colecciones 3D | Figuis 3D",
        )
        self.assertIn("<h1>#Twice: figuras y colecciones 3D</h1>", html_page)
        self.assertIn("Término de búsqueda: twice (sin #)", markdown)
        self.assertIn('"@type": "DefinedTerm"', encoded)
        self.assertIn('"numberOfItems": 1', encoded)
        self.assertIn("Hay 39 colecciones públicas", html_page)
        self.assertIn("Colecciones mostradas en esta representación: 1", markdown)
        self.assertNotIn('"Product"', encoded)
        self.assertNotIn("funko", (html_page + markdown + encoded).lower())

    def test_spa_injection_replaces_generic_metadata_and_escapes_json_ld(self):
        source = (
            '<html><head><title>Viejo</title><meta name="description" content="vieja" />'
            '</head><body><div id="root"></div><script src="/app.js"></script></body></html>'
        )
        document = inject_spa_document(
            source,
            title="Dragón <script>",
            description="Descripción",
            canonical_url=COLLECTION["canonical_url"],
            body_html="<main><h1>Dragón</h1></main>",
            structured_data={"name": "</script><script>alert(1)</script>"},
        )
        self.assertNotIn("<title>Viejo</title>", document)
        self.assertIn("&lt;script&gt;", document)
        self.assertIn("<main><h1>Dragón</h1></main>", document)
        scripts = re.findall(r'<script type="application/ld\+json">(.*?)</script>', document)
        self.assertEqual(len(scripts), 1)
        self.assertIn("\\u003c/script", scripts[0])


if __name__ == "__main__":
    unittest.main()
