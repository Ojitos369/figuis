import json
import re
import unittest

from core.seo import (
    collection_json_ld,
    collection_markdown,
    inject_spa_document,
)


COLLECTION = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Niño Dragón",
    "description": "Una colección de prueba.",
    "canonical_id": "nino-dragon-fantasia--123e4567-e89b-12d3-a456-426614174000",
    "canonical_url": "https://figuis.example/figura/nino-dragon-fantasia--123e4567-e89b-12d3-a456-426614174000",
    "tags": [{"name": "Fantasía"}],
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

    def test_markdown_states_non_commercial_scope(self):
        markdown = collection_markdown(COLLECTION)
        self.assertIn(COLLECTION["canonical_url"], markdown)
        self.assertIn("No publica precio", markdown)
        self.assertIn("Modelo STL", markdown)

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
