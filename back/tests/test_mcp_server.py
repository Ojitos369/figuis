from __future__ import annotations

import asyncio
import json
import unittest
from unittest.mock import patch

import mcp_server


COLLECTION_ID = "123e4567-e89b-42d3-a456-426614174000"
CANONICAL_ID = f"robot-ciencia-ficcion--{COLLECTION_ID}"
CANONICAL_URL = f"{mcp_server.PUBLIC_BASE_URL}/figura/{CANONICAL_ID}"
COLLECTION = {
    "resource_id": f"collection:{CANONICAL_ID}",
    "resource_type": "collection",
    "id": COLLECTION_ID,
    "title": "Robot",
    "name": "Robot",
    "canonical_id": CANONICAL_ID,
    "canonical_url": CANONICAL_URL,
    "url": CANONICAL_URL,
    "price": "should-never-leak",
}
MEDIA_ITEM = {
    "resource_id": "media:223e4567-e89b-42d3-a456-426614174000",
    "resource_type": "media",
    "id": "223e4567-e89b-42d3-a456-426614174000",
    "name": "robot.jpg",
    "path": "/media/robot.jpg",
    "url": f"{mcp_server.PUBLIC_BASE_URL}/media/robot.jpg",
    "collection": COLLECTION,
}


def page(items):
    return {"items": items, "page": 1, "page_size": 50, "total": len(items), "pages": 1}


class McpToolContractTests(unittest.TestCase):
    def test_public_manifest_is_derived_from_registered_tools(self):
        registered = asyncio.run(mcp_server.catalog_mcp.list_tools())
        manifest = asyncio.run(mcp_server.public_mcp_tool_manifest())

        self.assertEqual(
            [item["name"] for item in manifest],
            [tool.name for tool in registered],
        )
        for item, tool in zip(manifest, registered, strict=True):
            self.assertEqual(item["input_schema"], tool.input_schema)
            self.assertEqual(item["output_schema"], tool.output_schema)
            self.assertTrue(item["annotations"]["readOnlyHint"])
            self.assertFalse(item["annotations"]["destructiveHint"])

    def test_search_returns_collections_with_citable_urls(self):
        def catalog_call(operation, *args, **kwargs):
            if operation == "search_catalog":
                return page([COLLECTION])
            self.fail(f"unexpected operation: {operation}")

        with patch.object(mcp_server, "_call_catalog", side_effect=catalog_call):
            result = mcp_server.search("robot")

        self.assertEqual(
            [item["id"] for item in result["results"]],
            [COLLECTION["resource_id"]],
        )
        self.assertTrue(all(item["url"].startswith("http") for item in result["results"]))

    def test_search_normalizes_hash_prefixed_tag_queries(self):
        calls = []

        def catalog_call(operation, *args, **kwargs):
            calls.append((operation, args, kwargs))
            return page([])

        with patch.object(mcp_server, "_call_catalog", side_effect=catalog_call):
            result = mcp_server.search(" #twice ")

        self.assertEqual(result, {"results": []})
        self.assertEqual([call[1][0] for call in calls], ["twice"])

    def test_fetch_is_read_only_scoped_and_strips_commerce_fields(self):
        def catalog_call(operation, *args, **kwargs):
            if operation == "get_catalog_resource":
                return dict(COLLECTION)
            if operation == "list_collection_media":
                return page([MEDIA_ITEM])
            self.fail(f"unexpected operation: {operation}")

        with patch.object(mcp_server, "_call_catalog", side_effect=catalog_call):
            result = mcp_server.fetch(COLLECTION["resource_id"])

        self.assertEqual(result["url"], CANONICAL_URL)
        self.assertNotIn("price", json.dumps(result).lower())
        self.assertIn("Datos publicos del catalogo", result["text"])

    def test_fetch_rejects_ids_outside_allowlisted_resource_types(self):
        with self.assertRaisesRegex(ValueError, "collection: o media:"):
            mcp_server.fetch("user:123")


if __name__ == "__main__":
    unittest.main()
