"""
A tiny standard-library HTTP server for running hijrical Studio locally.

It serves the static front-end in ``web/`` and forwards ``/api/<name>`` POSTs to
:func:`hijrical_studio.web.studio_api.handle`. No third-party dependencies --
just :mod:`http.server`, matching the ``hijrical`` zero-dependency philosophy.

The browser-hosted (GitHub Pages / Pyodide) build does not use this server at
all; there the front-end calls ``studio_api.handle`` directly in the browser.
"""

from __future__ import annotations

import os
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from .web import studio_api

WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".py": "text/x-python; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".json": "application/json; charset=utf-8",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "hijrical-studio"

    def log_message(self, *_args):  # keep the console quiet
        pass

    def _send_json(self, text: str, status: int = 200) -> None:
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in ("/", ""):
            path = "/index.html"
        if path == "/api/ping":  # convenience for liveness checks
            self._send_json(studio_api.handle("ping"))
            return
        self._serve_static(path)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            self._send_json('{"error": "not found"}', 404)
            return
        name = path[len("/api/"):]
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        self._send_json(studio_api.handle(name, raw))

    def _serve_static(self, path: str) -> None:
        safe = os.path.normpath(path).lstrip("\\/").replace("\\", "/")
        full = os.path.join(WEB_DIR, safe)
        if not os.path.abspath(full).startswith(os.path.abspath(WEB_DIR)) or not os.path.isfile(full):
            self.send_error(404, "Not found")
            return
        with open(full, "rb") as fh:
            data = fh.read()
        ext = os.path.splitext(full)[1].lower()
        self.send_response(200)
        self.send_header("Content-Type", CONTENT_TYPES.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def _arg(argv, flag, default):
    if flag in argv:
        try:
            return argv[argv.index(flag) + 1]
        except IndexError:
            return default
    return default


def main(argv=None) -> None:
    argv = list(sys.argv[1:] if argv is None else argv)
    host = _arg(argv, "--host", "127.0.0.1")
    port = int(_arg(argv, "--port", "8770"))
    httpd = ThreadingHTTPServer((host, port), Handler)
    url = f"http://{host}:{port}/"
    print("=" * 60)
    print(f"  hijrical Studio  ·  hijrical {studio_api.hj.__version__}")
    print(f"  {url}")
    print("  Durdurmak için: Ctrl+C")
    print("=" * 60)
    if "--no-browser" not in argv:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nKapatılıyor...")
        httpd.shutdown()


if __name__ == "__main__":
    main()
