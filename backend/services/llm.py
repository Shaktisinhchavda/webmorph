"""
Ollama LLM service for generating HTML modifications.

Connects to a local Ollama instance to modify HTML elements
based on natural language instructions.
"""

import json
import logging
import os
import re

import httpx


logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

SYSTEM_PROMPT = """You are an HTML modifier. You receive an HTML element and must apply a modification to it.

CRITICAL RULES:
- Output ONLY the modified HTML element. Nothing else.
- No markdown, no code fences, no explanations, no commentary.
- Use inline style="" attribute for any visual/CSS changes.
- Keep all existing attributes (class, id, data-*, href, etc.) unless told to remove them.
- Do NOT wrap the element in extra tags.
- Do NOT output incomplete HTML.

EXAMPLE:
Input element: <button class="btn">Click me</button>
Instruction: Make it red with white text and larger
Output: <button class="btn" style="background-color: red; color: white; font-size: 20px; padding: 12px 24px;">Click me</button>

EXAMPLE:
Input element: <h1>Hello World</h1>
Instruction: Change text to "Welcome" and make it blue
Output: <h1 style="color: blue;">Welcome</h1>

EXAMPLE:
Input element: <div class="card" style="padding: 10px;">Content here</div>
Instruction: Add a border and round the corners
Output: <div class="card" style="padding: 10px; border: 2px solid #333; border-radius: 12px;">Content here</div>

Now apply the instruction to the given element. Output ONLY the HTML."""


async def modify_element(
    element_html: str,
    styles: dict,
    instruction: str,
) -> str:
    """
    Send an HTML element and instruction to the LLM for modification.

    Args:
        element_html: The current HTML of the element
        styles: Computed CSS styles of the element
        instruction: Natural language instruction for modification

    Returns:
        Modified HTML string
    """
    # Build a concise style summary — only include key properties
    key_styles = {k: v for k, v in (styles or {}).items()
                  if v and v not in ("none", "normal", "0px", "auto")}
    style_summary = "; ".join(f"{k}: {v}" for k, v in key_styles.items()) if key_styles else "none"

    # Truncate very large HTML to avoid overwhelming the model
    trimmed_html = element_html[:2000] if len(element_html) > 2000 else element_html

    user_message = f"""Element: {trimmed_html}
Current computed styles: {style_summary}
Instruction: {instruction}
Output:"""

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 2048,
        },
    }

    logger.info(f"LLM request — model={OLLAMA_MODEL}, instruction='{instruction}'")

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            content = data.get("message", {}).get("content", "").strip()
            logger.info(f"LLM raw response ({len(content)} chars): {content[:200]}...")

            # Clean up any markdown code fences the LLM might add despite instructions
            content = _strip_code_fences(content)

            # Validate that the response looks like HTML
            if not content or (not content.startswith("<") and "<" not in content):
                logger.warning(f"LLM returned non-HTML content: {content[:100]}")
                # Try to extract HTML from the response
                html_match = re.search(r"<[^>]+>.*</[^>]+>", content, re.DOTALL)
                if html_match:
                    content = html_match.group(0)
                else:
                    raise RuntimeError("LLM did not return valid HTML")

            return content

        except httpx.ConnectError:
            raise RuntimeError(
                f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. "
                "Make sure Ollama is running (ollama serve)."
            )
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"Ollama API error: {e.response.status_code}")
        except RuntimeError:
            raise
        except Exception as e:
            raise RuntimeError(f"LLM request failed: {str(e)}")


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences if the LLM wraps its response."""
    # Match ```html ... ``` or ``` ... ```
    pattern = r"^```(?:html)?\s*\n?(.*?)\n?```\s*$"
    match = re.match(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


async def check_ollama_health() -> bool:
    """Check if Ollama is reachable."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return response.status_code == 200
    except Exception:
        return False
