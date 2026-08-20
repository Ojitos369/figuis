from __future__ import annotations

import importlib.util
from pathlib import Path
import re
import sys
import types
import unittest


def _load_settings():
    setproctitle = types.ModuleType("setproctitle")
    setproctitle.setproctitle = lambda _value: None

    errors = types.ModuleType("ojitos369.errors")

    class CatchErrors:
        def __init__(self, **_kwargs):
            pass

    errors.CatchErrors = CatchErrors
    replacements = {"setproctitle": setproctitle, "ojitos369.errors": errors}
    previous = {name: sys.modules.get(name) for name in replacements}
    sys.modules.update(replacements)
    try:
        path = Path(__file__).parents[1] / "core" / "conf" / "settings.py"
        spec = importlib.util.spec_from_file_location("_figuis_settings_test", path)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module
    finally:
        for name, original in previous.items():
            if original is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = original


settings = _load_settings()


class CorsSettingsTests(unittest.TestCase):
    def test_cors_regex_allows_only_loopback_development_origins(self):
        allowed = (
            "http://localhost:5173",
            "https://localhost",
            "http://127.0.0.1:8000",
            "http://[::1]:3000",
        )
        rejected = (
            "https://localhost.evil.example",
            "https://evil.example/localhost",
            "https://sub.localhost:5173",
            "file://localhost",
        )
        for origin in allowed:
            with self.subTest(origin=origin):
                self.assertIsNotNone(re.fullmatch(settings.allow_origin_regex, origin))
        for origin in rejected:
            with self.subTest(origin=origin):
                self.assertIsNone(re.fullmatch(settings.allow_origin_regex, origin))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
