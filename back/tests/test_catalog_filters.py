from __future__ import annotations

import unittest

from apis.apps.catalogo.api import GetFiguras


class PublicGalleryFilterTests(unittest.TestCase):
    @staticmethod
    def _filters(query: str):
        handler = object.__new__(GetFiguras)
        handler.data = {"q": query}
        handler.get_filtros()
        return handler.filtros, handler.query_data

    def test_text_search_includes_public_tag_names(self):
        filters, params = self._filters("twice")

        self.assertIn("JOIN etiquetas e_search", filters)
        self.assertIn("e_search.nombre ~* :q", filters)
        self.assertEqual(params["q"], "twice")

    def test_hash_prefixed_tag_search_uses_stored_tag_name(self):
        filters, params = self._filters("  #twice  ")

        self.assertIn("e_search.nombre ~* :q", filters)
        self.assertEqual(params["q"], "twice")

    def test_invalid_regex_fallback_still_searches_tag_names(self):
        filters, params = self._filters("twice(")

        self.assertIn("LOWER(e_search.nombre) LIKE :q", filters)
        self.assertEqual(params["q"], "%twice(%")


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
