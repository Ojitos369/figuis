import asyncio
import base64
import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

import websockets

from core.conf.settings import HOME_PREVIEW_CAPTURE_URL, MEDIA_DIR


HOME_PREVIEW_RELATIVE_PATH = "social/home-preview.jpg"
HOME_PREVIEW_SIZE = (1200, 630)
_generation_lock = threading.Lock()
_schedule_lock = threading.Lock()
_scheduled_timer = None


def home_preview_path() -> Path:
    return Path(MEDIA_DIR) / HOME_PREVIEW_RELATIVE_PATH


def _browser_binary() -> str | None:
    configured = os.environ.get("SCREENSHOT_BROWSER", "").strip()
    if configured and Path(configured).is_file():
        return configured
    for name in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable"):
        found = shutil.which(name)
        if found:
            return found
    return None


async def _capture_page(websocket_url: str, capture_url: str) -> bytes:
    command_id = 0
    async with websockets.connect(websocket_url, max_size=16 * 1024 * 1024) as socket:
        async def command(method: str, params: dict | None = None) -> dict:
            nonlocal command_id
            command_id += 1
            current_id = command_id
            await socket.send(json.dumps({"id": current_id, "method": method, "params": params or {}}))
            while True:
                message = json.loads(await socket.recv())
                if message.get("id") == current_id:
                    if "error" in message:
                        raise RuntimeError(message["error"].get("message", method))
                    return message.get("result", {})

        await command("Page.enable")
        await command("Runtime.enable")
        await command("Emulation.setDeviceMetricsOverride", {
            "width": HOME_PREVIEW_SIZE[0],
            "height": HOME_PREVIEW_SIZE[1],
            "deviceScaleFactor": 1,
            "mobile": False,
        })
        await command("Page.navigate", {"url": capture_url})

        # La galería consulta la API con debounce y después carga sus imágenes.
        await asyncio.sleep(4)
        for _ in range(12):
            result = await command("Runtime.evaluate", {
                "expression": "document.readyState === 'complete' && Array.from(document.images).every(img => img.complete)",
                "returnByValue": True,
            })
            if result.get("result", {}).get("value"):
                break
            await asyncio.sleep(0.5)

        screenshot = await command("Page.captureScreenshot", {
            "format": "jpeg",
            "quality": 82,
            "fromSurface": True,
            "captureBeyondViewport": False,
        })
        return base64.b64decode(screenshot["data"])


def _capture_with_chrome(browser: str, capture_url: str, temp_dir: str) -> bytes:
    profile_dir = Path(temp_dir) / "chrome-profile"
    process = subprocess.Popen(
        [
            browser,
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-background-networking",
            "--disable-default-apps",
            "--disable-extensions",
            "--disable-sync",
            "--hide-scrollbars",
            "--metrics-recording-only",
            "--mute-audio",
            "--no-first-run",
            "--remote-debugging-port=0",
            f"--user-data-dir={profile_dir}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        port_file = profile_dir / "DevToolsActivePort"
        deadline = time.monotonic() + 10
        while not port_file.is_file() and time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError("El navegador terminó antes de iniciar DevTools")
            time.sleep(0.1)
        if not port_file.is_file():
            raise TimeoutError("Chrome DevTools no inició a tiempo")

        port = port_file.read_text().splitlines()[0]
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as response:
            targets = json.load(response)
        page = next(target for target in targets if target.get("type") == "page")
        return asyncio.run(asyncio.wait_for(
            _capture_page(page["webSocketDebuggerUrl"], capture_url),
            timeout=25,
        ))
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def generate_home_preview(capture_url: str = HOME_PREVIEW_CAPTURE_URL) -> bool:
    """Captura la portada real en navegador y la guarda como JPEG social."""
    if not capture_url or not _generation_lock.acquire(blocking=False):
        return False

    output_path = home_preview_path()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    browser = _browser_binary()
    if not browser:
        _generation_lock.release()
        return False

    try:
        with tempfile.TemporaryDirectory(prefix="figuis-home-preview-") as temp_dir:
            screenshot = _capture_with_chrome(browser, capture_url, temp_dir)
            temp_jpeg = output_path.with_suffix(".tmp.jpg")
            temp_jpeg.write_bytes(screenshot)
            os.replace(temp_jpeg, output_path)
            return True
    except (OSError, RuntimeError, TimeoutError, ValueError, KeyError):
        return False
    finally:
        _generation_lock.release()


def schedule_home_preview_refresh() -> None:
    global _scheduled_timer
    with _schedule_lock:
        if _scheduled_timer and _scheduled_timer.is_alive():
            _scheduled_timer.cancel()
        _scheduled_timer = threading.Timer(3.0, generate_home_preview)
        _scheduled_timer.name = "figuis-home-preview"
        _scheduled_timer.daemon = True
        _scheduled_timer.start()
