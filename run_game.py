from __future__ import annotations

import argparse
import os
import threading
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Claude 养成计划 locally.")
    parser.add_argument("--port", type=int, default=8000, help="Port for the local web server.")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    os.chdir(root)

    server = ThreadingHTTPServer(("127.0.0.1", args.port), QuietHandler)
    url = f"http://127.0.0.1:{args.port}/index.html"

    def open_browser() -> None:
        webbrowser.open(url)

    threading.Timer(0.5, open_browser).start()
    print(f"Serving {root} at {url}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
