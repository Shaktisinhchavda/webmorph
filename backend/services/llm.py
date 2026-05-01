"""
LLM service for generating HTML modifications.

Supports two providers:
  - Gemini (Google AI) — set GEMINI_API_KEY env var
  - Ollama (local)     — fallback when no Gemini key is set

Architecture: Style-patching mode
  Instead of asking the LLM to output full modified HTML (which breaks on complex
  elements like SVGs, nested buttons, etc.), we ask it to output a JSON patch:
    { "style": "...", "text": "...", "attributes": {...} }
  The frontend then applies these changes surgically to the existing DOM element.
"""

import json
import logging
import os
import re

import httpx


logger = logging.getLogger(__name__)

# ── Provider config ──────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

USE_GEMINI = bool(GEMINI_API_KEY)

SYSTEM_PROMPT = """You are a DOM style patcher. You receive an HTML element description and must output a JSON object describing the changes to apply.

CRITICAL RULES:
- Output ONLY valid JSON. No markdown, no code fences, no explanation.
- The JSON must have these optional fields:
  "style": CSS properties to apply as inline styles (string, semicolon-separated)
  "text": New text content (ONLY if the instruction asks to change text)
  "attrs": Object of HTML attributes to set (e.g. {"width": "48", "height": "48"})

IMPORTANT:
- ONLY include "text" if the user explicitly asks to change/replace text content.
- ONLY include "attrs" if the user asks to change attributes like width, height, href, src, etc.
- Always include "style" for any visual/CSS changes.
- For SVGs: use "attrs" for width/height, use "style" for fill, stroke, color, transform, opacity.
- For buttons/links: use "style" for background-color, color, padding, border-radius, font-size, box-shadow, etc.
- For containers: use "style" for background, border, padding, margin, border-radius, box-shadow.
- For images: use "attrs" for width/height, use "style" for border-radius, filter, opacity.

EXAMPLES:

Input: <button class="btn">Click me</button>
Instruction: Make it red with white text and larger
Output: {"style": "background-color: red; color: white; font-size: 20px; padding: 12px 24px; border-radius: 8px; border: none;"}

Input: <h1>Hello World</h1>
Instruction: Change text to "Welcome" and make it blue
Output: {"style": "color: blue;", "text": "Welcome"}

Input: <svg width="24" height="24"><path d="..."></path></svg>
Instruction: Make this icon bigger and red
Output: {"style": "fill: red; color: red;", "attrs": {"width": "48", "height": "48"}}

Input: <button class="btn"><svg>...</svg> Submit</button>
Instruction: Make green with a shadow
Output: {"style": "background-color: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; border: none; box-shadow: 0 4px 12px rgba(34,197,94,0.3);"}

Input: <div class="card">Content</div>
Instruction: Add a gradient background and round corners
Output: {"style": "background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 24px;"}

Input: <a href="/about">About Us</a>
Instruction: Change this to "Contact" and make it bold
Output: {"style": "font-weight: 700;", "text": "Contact"}

Input: <img src="photo.jpg" width="200">
Instruction: Make it circular and add a border
Output: {"style": "border-radius: 50%; border: 3px solid #6366f1; object-fit: cover;"}

Now output ONLY the JSON patch for the given element and instruction."""


def _build_user_message(
    element_html: str,
    styles: dict,
    instruction: str,
    context: dict = None,
    accessibility: dict = None,
) -> str:
    """Build the user prompt with all available context."""
    key_styles = {k: v for k, v in (styles or {}).items()
                  if v and v not in ("none", "normal", "0px", "auto")}
    style_summary = "; ".join(f"{k}: {v}" for k, v in key_styles.items()) if key_styles else "none"

    # Aggressively trim HTML — we only need structure, not full content
    trimmed_html = _simplify_html(element_html)

    context_parts = []
    if context:
        if context.get("parent"):
            p = context["parent"]
            parent_str = f"<{p.get('tagName', '?')}>"
            if p.get("className"):
                parent_str += f" .{p['className'].split()[0]}"
            context_parts.append(f"Parent: {parent_str}")
        if context.get("childCount") is not None:
            context_parts.append(f"Children: {context['childCount']}")

    if accessibility:
        role = accessibility.get("role", "")
        if role and role not in ("div", "span"):
            context_parts.append(f"Role: {role}")
        if accessibility.get("ariaLabel"):
            context_parts.append(f"Label: {accessibility['ariaLabel']}")

    context_line = " | ".join(context_parts) if context_parts else ""

    user_message = f"""Element: {trimmed_html}
Current styles: {style_summary}"""

    if context_line:
        user_message += f"\nContext: {context_line}"

    user_message += f"""
Instruction: {instruction}
Output:"""

    return user_message


def _simplify_html(html: str) -> str:
    """
    Aggressively simplify HTML to reduce token usage:
    - Strip SVG path data
    - Remove data-* attributes
    - Truncate long class lists
    - Truncate overall length
    """
    # Strip SVG path data (can be thousands of characters)
    html = re.sub(r'\bd="[^"]{30,}"', 'd="..."', html)

    # Strip data-* attributes (except data-annotator-id)
    html = re.sub(r'\s+data-(?!annotator)[a-z-]+="[^"]*"', '', html)

    # Truncate very long class values
    def truncate_class(m):
        classes = m.group(1).split()
        if len(classes) > 5:
            return f'class="{" ".join(classes[:5])} ..."'
        return m.group(0)
    html = re.sub(r'class="([^"]*)"', truncate_class, html)

    # Truncate overall
    if len(html) > 1500:
        html = html[:1500] + "..."

    return html


def _parse_patch(content: str) -> dict:
    """Parse the LLM's JSON patch response, with fallback extraction."""
    content = content.strip()

    # Strip code fences if present
    content = _strip_code_fences(content)

    # Try direct JSON parse
    try:
        patch = json.loads(content)
        if isinstance(patch, dict):
            return patch
    except json.JSONDecodeError:
        pass

    # Try extracting JSON from mixed content
    json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
    if json_match:
        try:
            patch = json.loads(json_match.group(0))
            if isinstance(patch, dict):
                return patch
        except json.JSONDecodeError:
            pass

    # Final fallback: if content looks like HTML, create a legacy patch
    if content.startswith("<"):
        return {"__legacy_html": content}

    raise RuntimeError(f"LLM did not return valid JSON patch: {content[:200]}")


# ── Gemini provider ──────────────────────────────────────────────

async def _call_gemini(user_message: str, instruction: str) -> str:
    """Call Google Gemini API with auto-retry for transient errors."""
    import asyncio

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": [
            {
                "parts": [{"text": user_message}]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
        },
    }

    logger.info(f"Gemini request — model={GEMINI_MODEL}, instruction='{instruction}'")

    max_retries = 3
    for attempt in range(max_retries):
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload)

            # Retry on 429 (rate limit) or 503 (overloaded)
            if response.status_code in (429, 503) and attempt < max_retries - 1:
                wait = 2 ** attempt  # 1s, 2s, 4s
                logger.warning(f"Gemini {response.status_code} — retrying in {wait}s (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait)
                continue

            response.raise_for_status()
            data = response.json()

            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError("Gemini returned no candidates")

            content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
            logger.info(f"Gemini raw response ({len(content)} chars): {content[:200]}...")
            return content

    raise RuntimeError("Gemini API failed after all retries")


# ── Ollama provider ──────────────────────────────────────────────

async def _call_ollama(user_message: str, instruction: str) -> str:
    """Call local Ollama API."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 1024,
        },
    }

    logger.info(f"Ollama request — model={OLLAMA_MODEL}, instruction='{instruction}'")

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()

        content = data.get("message", {}).get("content", "").strip()
        logger.info(f"Ollama raw response ({len(content)} chars): {content[:200]}...")
        return content


# ── Main entry point ─────────────────────────────────────────────

async def modify_element(
    element_html: str,
    styles: dict,
    instruction: str,
    context: dict = None,
    accessibility: dict = None,
    box_model: dict = None,
) -> dict:
    """
    Send an HTML element and instruction to the LLM for modification.
    Returns a JSON patch dict: { style, text, attrs, __legacy_html }
    """
    user_message = _build_user_message(
        element_html, styles, instruction, context, accessibility
    )

    try:
        if USE_GEMINI:
            content = await _call_gemini(user_message, instruction)
        else:
            content = await _call_ollama(user_message, instruction)

        patch = _parse_patch(content)
        logger.info(f"Parsed patch: {patch}")
        return patch

    except httpx.ConnectError:
        provider = "Gemini" if USE_GEMINI else f"Ollama at {OLLAMA_BASE_URL}"
        raise RuntimeError(f"Cannot connect to {provider}.")
    except httpx.HTTPStatusError as e:
        provider = "Gemini" if USE_GEMINI else "Ollama"
        raise RuntimeError(f"{provider} API error: {e.response.status_code}")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"LLM request failed: {str(e)}")


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences if the LLM wraps its response."""
    pattern = r"^```(?:json|html)?\s*\n?(.*?)\n?```\s*$"
    match = re.match(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


async def check_ollama_health() -> bool:
    """Check if the configured LLM provider is reachable."""
    if USE_GEMINI:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"
                response = await client.get(url)
                return response.status_code == 200
        except Exception:
            return False
    else:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                return response.status_code == 200
        except Exception:
            return False
