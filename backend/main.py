"""
Annotator Backend — FastAPI application.

Provides endpoints for:
- Analyzing web pages (via Playwright)
- Modifying HTML elements (via Ollama LLM)
- WebSocket for live streaming updates
"""

import asyncio
import sys

# Fix for Playwright on Windows: force ProactorEventLoop which supports subprocesses.
# Without this, uvicorn's --reload flag may use SelectorEventLoop, which causes
# NotImplementedError when Playwright tries to launch the browser.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import AnalyzeRequest, AnalyzeResponse, ModifyRequest, ModifyResponse
from services.browser import BrowserService
from services.llm import modify_element, check_ollama_health


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown lifecycle."""
    logger.info("Starting Annotator backend...")
    # Check Ollama connectivity at startup
    ollama_ok = await check_ollama_health()
    if ollama_ok:
        logger.info("✓ Ollama is reachable")
    else:
        logger.warning("✗ Ollama is not reachable — LLM features will fail")
    yield
    # Shutdown: close browser
    logger.info("Shutting down browser...")
    await BrowserService.shutdown()


app = FastAPI(
    title="Annotator API",
    description="Backend for the Annotator UI modification tool",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------
# Health Check
# ---------------------

@app.get("/health")
async def health_check():
    ollama_ok = await check_ollama_health()
    return {
        "status": "ok",
        "ollama": "connected" if ollama_ok else "disconnected",
    }


# ---------------------
# Analyze Endpoint
# ---------------------

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_page(request: AnalyzeRequest):
    """
    Fetch a web page using Playwright and return its HTML content.
    """
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Add protocol if missing
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    logger.info(f"Analyzing page: {url}")

    try:
        result = await BrowserService.fetch_page(url)
        return AnalyzeResponse(
            html=result["html"],
            title=result["title"],
            url=result["url"],
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error analyzing {url}: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze page")


# ---------------------
# Modify Endpoint
# ---------------------

@app.post("/modify", response_model=ModifyResponse)
async def modify_html(request: ModifyRequest):
    """
    Use the LLM to modify an HTML element based on a natural language instruction.
    """
    if not request.element_html.strip():
        raise HTTPException(status_code=400, detail="Element HTML is required")
    if not request.instruction.strip():
        raise HTTPException(status_code=400, detail="Instruction is required")

    logger.info(f"Modifying element with instruction: {request.instruction}")

    try:
        modified_html = await modify_element(
            element_html=request.element_html,
            styles=request.styles,
            instruction=request.instruction,
        )

        if not modified_html:
            raise HTTPException(
                status_code=500,
                detail="LLM returned empty response",
            )

        return ModifyResponse(modified_html=modified_html)

    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during modification: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to modify element: {str(e)}")


# ---------------------
# WebSocket (streaming)
# ---------------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for streaming LLM modifications.

    Expected message format:
    {
        "type": "modify",
        "element_html": "...",
        "styles": {...},
        "instruction": "..."
    }
    """
    await websocket.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            msg_type = data.get("type")

            if msg_type == "modify":
                try:
                    await websocket.send_json({
                        "type": "status",
                        "status": "processing",
                    })

                    modified_html = await modify_element(
                        element_html=data.get("element_html", ""),
                        styles=data.get("styles", {}),
                        instruction=data.get("instruction", ""),
                    )

                    await websocket.send_json({
                        "type": "result",
                        "modified_html": modified_html,
                    })

                except RuntimeError as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e),
                    })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
