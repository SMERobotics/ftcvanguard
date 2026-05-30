from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BUILD_DIR = PROJECT_ROOT / "dist"
ASSETS_DIR = BUILD_DIR / "assets"
INDEX_FILE = BUILD_DIR / "index.html"
FAVICON_FILE = BUILD_DIR / "favicon.ico"
