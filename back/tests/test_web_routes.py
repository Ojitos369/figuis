from __future__ import annotations

import unittest
from unittest.mock import patch
from xml.etree import ElementTree

from fastapi.testclient import TestClient

import main


COLLECTION_ID = "123e4567-e89b-42d3-a456-426614174000"
CANONICAL_ID = f"gato-articulado-animal--{COLLECTION_ID}"
CANONICAL_URL = f"https://figuis.example/figura/{CANONICAL_ID}"
ANIMAL_TAG_ID = "423e4567-e89b-42d3-a456-426614174000"
ANIMAL_TAG_CANONICAL_ID = f"animal--{ANIMAL_TAG_ID}"
ANIMAL_TAG_CANONICAL_URL = (
    f"https://figuis.example/etiqueta/{ANIMAL_TAG_CANONICAL_ID}"
)
COLLECTION = {
    "resource_id": f"collection:{CANONICAL_ID}",
    "resource_type": "collection",
    "id": COLLECTION_ID,
    "name": "Gato articulado",
    "nombre": "Gato articulado",
    "description": "Colección pública de prueba.",
    "descripcion": "Colección pública de prueba.",
    "canonical_id": CANONICAL_ID,
    "canonical_url": CANONICAL_URL,
    "url": CANONICAL_URL,
    "slug": "gato-articulado-animal",
    "tags": [
        {
            "id": ANIMAL_TAG_ID,
            "name": "Animal",
            "nombre": "Animal",
            "canonical_id": ANIMAL_TAG_CANONICAL_ID,
            "canonical_url": ANIMAL_TAG_CANONICAL_URL,
        }
    ],
    "etiquetas": [
        {
            "id": ANIMAL_TAG_ID,
            "name": "Animal",
            "nombre": "Animal",
            "canonical_id": ANIMAL_TAG_CANONICAL_ID,
            "canonical_url": ANIMAL_TAG_CANONICAL_URL,
        }
    ],
    "cover_path": "/media/gato.webp",
    "cover_url": "https://figuis.example/media/gato.webp",
    "media_count": 2,
    "model_count": 1,
    "has_3d_model": True,
    "media_counts": {
        "resultado": 1,
        "relacionado": 0,
        "modelo_3d": 1,
        "total": 2,
    },
    "updated_at": "2026-08-20T10:00:00+00:00",
    "media": [
        {
            "id": "223e4567-e89b-42d3-a456-426614174000",
            "kind": "resultado",
            "tipo": "resultado",
            "name": "gato.webp",
            "url": "https://figuis.example/media/gato.webp",
            "path": "/media/gato.webp",
            "mime_type": "image/webp",
        },
        {
            "id": "323e4567-e89b-42d3-a456-426614174000",
            "kind": "modelo_3d",
            "tipo": "modelo_3d",
            "name": "gato.stl",
            "url": "https://figuis.example/media/gato.stl",
            "path": "/media/gato.stl",
            "mime_type": "model/stl",
        },
    ],
}
PAGE = {"items": [COLLECTION], "page": 1, "page_size": 50, "total": 1, "pages": 1}
TAG_ID = "523e4567-e89b-42d3-a456-426614174000"
TAG_CANONICAL_ID = f"twice--{TAG_ID}"
TAG_CANONICAL_URL = f"https://figuis.example/etiqueta/{TAG_CANONICAL_ID}"
TAG = {
    "id": TAG_ID,
    "name": "twice",
    "nombre": "twice",
    "title": "twice",
    "slug": "twice",
    "canonical_id": TAG_CANONICAL_ID,
    "identifier": TAG_CANONICAL_ID,
    "canonical_url": TAG_CANONICAL_URL,
    "url": TAG_CANONICAL_URL,
    "collection_count": 39,
    "model_count": 3,
    "has_3d_model": True,
    "updated_at": "2026-08-20T10:00:00+00:00",
}
TAGS_PAGE = {"items": [TAG], "page": 1, "page_size": 100, "total": 1, "pages": 1}


class PublicWebRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # MCP 2's stateless session manager deliberately starts once per app
        # instance, just as it does in one Uvicorn worker process.
        cls.client_context = TestClient(main.app, base_url="https://figuis.example")
        cls.client = cls.client_context.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_context.__exit__(None, None, None)

    def setUp(self):
        self.catalog_patches = (
            patch("urls.list_collections", return_value=PAGE),
            patch("urls.get_collection", return_value=COLLECTION),
            patch("urls.list_public_tags", return_value=TAGS_PAGE),
            patch("urls.get_public_tag", return_value=TAG),
            patch("urls._detail_image_url", return_value=COLLECTION["cover_url"]),
        )
        self.catalog_mocks = []
        for catalog_patch in self.catalog_patches:
            self.catalog_mocks.append(catalog_patch.start())
            self.addCleanup(catalog_patch.stop)
        self.list_collections_mock = self.catalog_mocks[0]

    def test_initial_html_is_semantic_and_uses_canonical_slug(self):
        home = self.client.get("/")
        detail = self.client.get(f"/figura/{CANONICAL_ID}")

        self.assertEqual(home.status_code, 200)
        self.assertIn("<title>Figuis 3D · Figuras 3D, K-pop y coleccionables</title>", home.text)
        self.assertIn("<h1>Figuis 3D: figuras 3D, K-pop, anime, series, coleccionables y mas</h1>", home.text)
        self.assertIn("Figuis es el catálogo de Ojitos369", home.text)
        self.assertIn(f'href="{ANIMAL_TAG_CANONICAL_URL}">#Animal</a>', home.text)
        self.assertIn(CANONICAL_URL, home.text)
        self.assertEqual(detail.status_code, 200)
        self.assertIn("<title>Gato articulado · Animal | Figuis 3D</title>", detail.text)
        self.assertIn("<h1>Gato articulado</h1>", detail.text)
        self.assertIn(f'href="{ANIMAL_TAG_CANONICAL_URL}">#Animal</a>', detail.text)
        self.assertIn('type="application/ld+json"', detail.text)
        self.assertNotIn('"@type":"Product"', detail.text)
        self.assertNotIn('"@type":"Offer"', detail.text)
        self.assertNotIn("location.replace", detail.text)
        self.assertEqual(detail.headers["content-location"], CANONICAL_URL)

    def test_uuid_redirects_and_markdown_negotiates_without_redirect(self):
        redirect = self.client.get(
            f"/figura/{COLLECTION_ID}?ref=test",
            follow_redirects=False,
        )
        markdown = self.client.get(
            f"/figura/{COLLECTION_ID}",
            headers={"Accept": "text/markdown"},
            follow_redirects=False,
        )
        refuses_markdown = self.client.get(
            f"/figura/{COLLECTION_ID}",
            headers={"Accept": "text/markdown;q=0, text/html;q=1"},
            follow_redirects=False,
        )
        prefers_explicit_json = self.client.get(
            f"/figura/{COLLECTION_ID}",
            headers={"Accept": "application/json, */*"},
            follow_redirects=False,
        )

        self.assertEqual(redirect.status_code, 308)
        self.assertEqual(redirect.headers["location"], f"{CANONICAL_URL}?ref=test")
        self.assertEqual(redirect.headers["vary"], "Accept")
        self.assertEqual(markdown.status_code, 200)
        self.assertTrue(markdown.headers["content-type"].startswith("text/markdown"))
        self.assertIn("# Gato articulado", markdown.text)
        self.assertEqual(markdown.headers["vary"], "Accept")
        self.assertEqual(refuses_markdown.status_code, 308)
        self.assertEqual(prefers_explicit_json.status_code, 200)
        self.assertTrue(
            prefers_explicit_json.headers["content-type"].startswith("application/json")
        )

    def test_tag_page_is_indexable_and_negotiates_without_hash_in_urls(self):
        canonical = self.client.get(f"/etiqueta/{TAG_CANONICAL_ID}")
        redirect = self.client.get(
            "/etiqueta/twice?ref=test",
            follow_redirects=False,
        )
        markdown = self.client.get(
            f"/etiqueta/{TAG_ID}",
            headers={"Accept": "text/markdown"},
            follow_redirects=False,
        )
        json_page = self.client.get(
            f"/etiqueta/{TAG_ID}",
            headers={"Accept": "application/json"},
            follow_redirects=False,
        )

        self.assertEqual(canonical.status_code, 200)
        self.assertIn(
            "<title>Twice: figuras y colecciones 3D | Figuis 3D</title>",
            canonical.text,
        )
        self.assertIn("<h1>#Twice: figuras y colecciones 3D</h1>", canonical.text)
        self.assertIn('<script type="module"', canonical.text)
        self.assertIn('"@type":"DefinedTerm"', canonical.text)
        self.assertNotIn('"@type":"Product"', canonical.text)
        self.assertIn(f'<link rel="canonical" href="{TAG_CANONICAL_URL}"', canonical.text)
        self.assertNotIn("/etiqueta/#", canonical.text)
        self.assertEqual(canonical.headers["content-location"], TAG_CANONICAL_URL)

        self.assertEqual(redirect.status_code, 308)
        self.assertEqual(redirect.headers["location"], f"{TAG_CANONICAL_URL}?ref=test")
        self.assertEqual(redirect.headers["vary"], "Accept")
        self.assertEqual(markdown.status_code, 200)
        self.assertTrue(markdown.headers["content-type"].startswith("text/markdown"))
        self.assertIn("# #Twice: figuras y colecciones 3D", markdown.text)
        self.assertIn("Término de búsqueda: twice (sin #)", markdown.text)
        self.assertNotIn("/etiqueta/#", markdown.text)
        self.assertEqual(json_page.status_code, 200)
        self.assertEqual(json_page.json()["data"]["canonical_id"], TAG_CANONICAL_ID)
        self.assertEqual(json_page.headers["content-location"], TAG_CANONICAL_URL)
        self.list_collections_mock.assert_any_call(
            tag_ids=[TAG_ID],
            page=1,
            page_size=50,
            base_url="https://figuis.example",
        )

    def test_missing_or_empty_public_tag_is_a_real_noindex_404(self):
        with patch("urls.get_public_tag", return_value=None):
            missing = self.client.get("/etiqueta/inexistente")
        with patch(
            "urls.list_collections",
            return_value={"items": [], "page": 1, "page_size": 50, "total": 0, "pages": 0},
        ):
            empty = self.client.get(f"/etiqueta/{TAG_CANONICAL_ID}")

        for response in (missing, empty):
            self.assertEqual(response.status_code, 404)
            self.assertIn('name="robots" content="noindex,follow"', response.text)
            self.assertIn("Etiqueta no encontrada", response.text)

    def test_robots_and_sitemap_separate_search_from_training(self):
        robots = self.client.get("/robots.txt")
        with patch("urls._all_public_tags", return_value=([TAG], 1)) as tag_loader, patch(
            "urls._all_collections", return_value=([COLLECTION, dict(COLLECTION)], 2)
        ) as collection_loader:
            sitemap = self.client.get("/sitemap.xml")
        tag_loader.assert_called_once_with(
            "https://figuis.example",
            maximum=49_998,
        )
        collection_loader.assert_called_once_with(
            "https://figuis.example",
            maximum=49_997,
        )

        for crawler in (
            "OAI-SearchBot",
            "ChatGPT-User",
            "Googlebot",
            "bingbot",
            "PerplexityBot",
            "Perplexity-User",
            "Claude-SearchBot",
            "Claude-User",
            "Applebot",
        ):
            self.assertIn(f"User-agent: {crawler}\nAllow: /", robots.text)
        for crawler in ("GPTBot", "Google-Extended", "ClaudeBot", "Applebot-Extended"):
            self.assertIn(f"User-agent: {crawler}\nDisallow: /", robots.text)
        self.assertIn("Disallow: /openapi.json", robots.text)
        self.assertNotIn("Disallow: /api/public/", robots.text)
        self.assertIn("Disallow: /mcp$", robots.text)
        self.assertIn("Disallow: /mcp/", robots.text)
        self.assertNotIn("Disallow: /mcp\n", robots.text)
        self.assertIn("Sitemap: https://figuis.example/sitemap.xml", robots.text)

        root = ElementTree.fromstring(sitemap.text)
        namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        locations = [node.text for node in root.findall("s:url/s:loc", namespace)]
        self.assertEqual(
            locations,
            [
                "https://figuis.example/",
                "https://figuis.example/mcp-info",
                TAG_CANONICAL_URL,
                CANONICAL_URL,
            ],
        )
        self.assertEqual(len(locations), len(set(locations)))
        self.assertNotIn("https://figuis.example/mcp/", locations)
        self.assertNotIn("https://figuis.example/catalogo.md", locations)
        self.assertIn("<image:image>", sitemap.text)

        with patch("urls.ALLOW_AI_TRAINING_CRAWLERS", True):
            training_allowed = self.client.get("/robots.txt")
        for crawler in ("GPTBot", "Google-Extended", "ClaudeBot", "Applebot-Extended"):
            self.assertIn(f"User-agent: {crawler}\nAllow: /", training_allowed.text)

    def test_mcp_info_is_indexable_and_negotiates_from_registered_tools(self):
        html_page = self.client.get("/mcp-info")
        markdown = self.client.get(
            "/mcp-info",
            headers={"Accept": "text/markdown"},
        )
        json_page = self.client.get(
            "/mcp-info",
            headers={"Accept": "application/json"},
        )
        llms = self.client.get("/llms.txt")

        self.assertEqual(html_page.status_code, 200)
        self.assertIn("<h1>Servidor MCP público de Figuis</h1>", html_page.text)
        self.assertIn("https://figuis.example/mcp/", html_page.text)
        self.assertIn('<script type="module"', html_page.text)
        self.assertIn('/media/dist/', html_page.text)
        self.assertIn('type="application/ld+json"', html_page.text)
        self.assertIn('"@type":"Service"', html_page.text)
        self.assertNotIn('"@type":"Offer"', html_page.text)
        self.assertIn(
            '<link rel="canonical" href="https://figuis.example/mcp-info"',
            html_page.text,
        )
        self.assertEqual(
            html_page.headers["content-location"],
            "https://figuis.example/mcp-info",
        )
        self.assertEqual(html_page.headers["vary"], "Accept")

        self.assertTrue(markdown.headers["content-type"].startswith("text/markdown"))
        self.assertIn("# Servidor MCP público de Figuis", markdown.text)
        self.assertIn("## Herramientas registradas", markdown.text)

        self.assertTrue(json_page.headers["content-type"].startswith("application/json"))
        payload = json_page.json()
        self.assertEqual(payload["endpoint"], "https://figuis.example/mcp/")
        self.assertFalse(payload["authentication"]["required"])
        self.assertEqual(payload["transport"]["type"], "Streamable HTTP")
        self.assertEqual(
            payload["transport"]["response_content_type"],
            "application/json",
        )
        self.assertNotIn("event_stream_method", payload["transport"])
        self.assertEqual(payload["transport"]["session_mode"], "stateless")
        self.assertEqual(
            payload["connection_examples"]["generic_config"]["mcpServers"]["figuis"],
            {
                "type": "streamable-http",
                "url": "https://figuis.example/mcp/",
            },
        )
        self.assertIn(
            "@modelcontextprotocol/inspector",
            payload["connection_examples"]["inspector_list_tools"],
        )
        self.assertEqual(
            [tool["name"] for tool in payload["tools"]],
            [
                "search",
                "fetch",
                "list_collections",
                "get_collection",
                "list_collection_media",
                "search_models",
            ],
        )
        self.assertTrue(
            all(tool["annotations"]["readOnlyHint"] for tool in payload["tools"])
        )
        self.assertTrue(
            all(not tool["annotations"]["destructiveHint"] for tool in payload["tools"])
        )
        self.assertIn("https://figuis.example/mcp-info", llms.text)

    def test_mcp_url_without_trailing_slash_uses_transport_without_redirect(self):
        initialize = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {"name": "figuis-test", "version": "1.0"},
            },
        }
        headers = {
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
        }

        compatibility = self.client.post(
            "/mcp",
            json=initialize,
            headers=headers,
            follow_redirects=False,
        )
        canonical = self.client.post("/mcp/", json=initialize, headers=headers)

        self.assertEqual(compatibility.status_code, 200)
        self.assertNotIn("location", compatibility.headers)
        self.assertEqual(
            compatibility.json()["result"]["protocolVersion"],
            "2025-06-18",
        )
        self.assertEqual(canonical.status_code, 200)
        self.assertEqual(canonical.json()["result"]["protocolVersion"], "2025-06-18")

    def test_public_api_404_remains_json_while_web_404_is_html(self):
        with patch("apis.public.urls.get_collection", return_value=None):
            api_missing = self.client.get("/api/public/v1/collections/not-found")
        web_missing = self.client.get("/definitely-not-a-page")

        self.assertEqual(api_missing.status_code, 404)
        self.assertTrue(api_missing.headers["content-type"].startswith("application/json"))
        self.assertEqual(api_missing.json(), {"detail": "Colección no encontrada"})
        self.assertEqual(api_missing.headers["cache-control"], "no-store")
        self.assertEqual(web_missing.status_code, 404)
        self.assertTrue(web_missing.headers["content-type"].startswith("text/html"))

    def test_public_tag_api_lists_and_resolves_only_repository_results(self):
        with patch("apis.public.urls.list_public_tags", return_value=TAGS_PAGE) as list_tags, patch(
            "apis.public.urls.get_public_tag", return_value=TAG
        ) as get_tag:
            listing = self.client.get("/api/public/v1/tags?page=1&page_size=25")
            detail = self.client.get(f"/api/public/v1/tags/{TAG_ID}")

        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()["items"][0]["name"], "twice")
        list_tags.assert_called_once_with(
            page=1,
            page_size=25,
            base_url="https://figuis.example",
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["data"]["canonical_id"], TAG_CANONICAL_ID)
        self.assertEqual(detail.headers["content-location"], TAG_CANONICAL_URL)
        self.assertEqual(detail.headers["link"], f'<{TAG_CANONICAL_URL}>; rel="canonical"')
        get_tag.assert_called_once_with(TAG_ID, base_url="https://figuis.example")

    def test_public_openapi_does_not_advertise_internal_routes(self):
        response = self.client.get("/api/public/openapi.json")

        self.assertEqual(response.status_code, 200)
        paths = response.json()["paths"]
        self.assertIn("/api/public/v1/collections", paths)
        self.assertIn("/api/public/v1/tags", paths)
        self.assertIn("/api/public/v1/tags/{identifier}", paths)
        self.assertTrue(all(path.startswith("/api/public/v1/") for path in paths))
        self.assertFalse(any("admin" in path or "auth" in path for path in paths))

    def test_untrusted_forwarded_host_does_not_poison_canonical_url(self):
        response = self.client.get(
            "/",
            headers={
                "X-Forwarded-Host": "attacker.example",
                "X-Forwarded-Proto": "http",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('<link rel="canonical" href="https://figuis.example/"', response.text)
        self.assertNotIn("attacker.example", response.text)


if __name__ == "__main__":
    unittest.main()
