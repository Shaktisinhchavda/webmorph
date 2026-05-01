"""
Playwright browser service for fetching and rendering web pages.

Runs Playwright synchronously in a dedicated thread to avoid
Windows event loop incompatibilities with uvicorn.
"""

import asyncio
import os
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

# Thread pool for running Playwright (sync API) off the main async loop
_executor = ThreadPoolExecutor(max_workers=2)

# Path to the inject.js script that gets embedded into fetched HTML
_INJECT_SCRIPT_PATH = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "inject.js"
_inject_script_cache = None


def _get_inject_script() -> str:
    """Load and cache the inject.js script content."""
    global _inject_script_cache
    if _inject_script_cache is None:
        if _INJECT_SCRIPT_PATH.exists():
            _inject_script_cache = _INJECT_SCRIPT_PATH.read_text(encoding="utf-8")
        else:
            _inject_script_cache = ""
    return _inject_script_cache


def _prepare_html(html: str, page_url: str) -> str:
    """
    Prepare fetched HTML for safe display in the editor iframe:
    1. Inject <base href> so relative URLs resolve against the original domain
    2. Strip the page's own <script> tags to prevent them from interfering
    3. Inject the annotation engine (inject.js) inline
    """
    parsed = urlparse(page_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    # Remove any existing <base> tags to avoid conflicts
    html = re.sub(r"<base\s[^>]*>", "", html, flags=re.IGNORECASE)

    # Inject <base> right after <head>
    base_tag = f'<base href="{base_url}/">'
    if re.search(r"<head[^>]*>", html, re.IGNORECASE):
        html = re.sub(
            r"(<head[^>]*>)",
            rf"\1{base_tag}",
            html,
            count=1,
            flags=re.IGNORECASE,
        )
    else:
        html = base_tag + html

    # Strip the page's own <script> tags to prevent interference
    # (they can navigate away, add event listeners that conflict, etc.)
    html = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.IGNORECASE)
    # Also strip noscript tags — not needed in the editor
    html = re.sub(r"<noscript[\s\S]*?</noscript>", "", html, flags=re.IGNORECASE)

    # Inject the annotation engine inline before </body>
    inject_script = _get_inject_script()
    if inject_script:
        inject_block = f"<script>{inject_script}</script>"
        if re.search(r"</body>", html, re.IGNORECASE):
            html = re.sub(
                r"(</body>)",
                rf"{inject_block}\1",
                html,
                count=1,
                flags=re.IGNORECASE,
            )
        else:
            html += inject_block

    return html


def _fetch_page_sync(url: str) -> dict:
    """
    Synchronously fetch a page using Playwright's sync API.
    This runs in a background thread to avoid event loop issues on Windows.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)  # Extra wait for JS-rendered content

            html = page.content()
            title = page.title() or "Untitled"
            final_url = page.url

            # Prepare HTML for safe iframe display with annotation engine
            html = _prepare_html(html, final_url)

            return {
                "html": html,
                "title": title,
                "url": final_url,
            }
        except Exception as e:
            raise RuntimeError(f"Failed to load page: {str(e)}")
        finally:
            context.close()
            browser.close()


class BrowserService:
    """Service that wraps Playwright calls in a thread pool executor."""

    @classmethod
    async def fetch_page(cls, url: str) -> dict:
        """
        Navigate to a URL, wait for it to load, and return the full HTML content.
        Runs Playwright in a background thread to avoid Windows async issues.

        Returns:
            dict with keys: html, title, url
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_executor, _fetch_page_sync, url)

    @classmethod
    async def shutdown(cls):
        """Shutdown the thread pool."""
        _executor.shutdown(wait=False)
