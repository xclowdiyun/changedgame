from __future__ import annotations

import argparse
import json
import os
import threading
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def load_endings(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_ending_flag_group(file_name: str, expected_flag_value: bool) -> None:
    endings_path = Path(__file__).resolve().parent / file_name
    payload = load_endings(endings_path)
    meta = payload.get("_meta", {})

    invalid_endings: list[str] = []
    for ending_id, ending_meta in meta.items():
        requirements = ending_meta.get("requirements", {})
        flags = requirements.get("flags", {})
        actual = flags.get("whipPetInstalled")
        if actual is not expected_flag_value:
            invalid_endings.append(f"{ending_id} -> whipPetInstalled={actual!r}")

    if invalid_endings:
        detail = "\n".join(f"- {item}" for item in invalid_endings)
        raise RuntimeError(
            f"Ending flag validation failed for {file_name}.\n"
            f"Expected whipPetInstalled={expected_flag_value!r} for every ending.\n"
            f"Problem entries:\n{detail}"
        )


def validate_endings() -> None:
    validate_ending_flag_group("endings_1to5.json", False)
    validate_ending_flag_group("endings_6to10.json", True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run [pet] 养成计划 locally.")
    parser.add_argument("--port", type=int, default=8000, help="Port for the local web server.")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    os.chdir(root)

    validate_endings()

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
