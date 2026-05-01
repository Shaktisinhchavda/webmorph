# Annotator — Visual UI Editor

Load any website, select elements visually, and modify them with natural language instructions powered by AI.

![Architecture](https://img.shields.io/badge/Frontend-Next.js_16-black?logo=next.js) ![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi) ![LLM](https://img.shields.io/badge/LLM-Ollama-blue)

## Features

- **Live website preview** — Fetches and renders any URL via Playwright
- **Visual element selection** — Hover to highlight, click to inspect
- **AI-powered modifications** — Describe changes in plain English
- **Undo / Redo / Regenerate** — Full edit history with `Ctrl+Z` / `Ctrl+Y`
- **Real-time inspector** — View computed styles and raw HTML
- **WebSocket support** — Streaming LLM updates

## Architecture

```
Frontend (Next.js :3000)  ──REST──▶  Backend (FastAPI :8000)
       │                                  │
       │ iframe + postMessage              ├── Playwright (page fetching)
       │ Zustand (state)                   └── Ollama (LLM modifications)
       │ Overlay (selection)
```

## Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Ollama** running locally with a model pulled:
  ```bash
  ollama pull qwen2.5:7b    # recommended (or any model you prefer)
  ollama serve
  ```

## Quick Start

### 1. Backend

```bash
cd backend

# Using uv (recommended)
uv run --with-requirements requirements.txt uvicorn main:app --reload --port 8000

# Or using pip
pip install -r requirements.txt
playwright install chromium
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Open

Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Paste a URL** on the landing page and click "Load Website"
2. **Hover** over elements in the preview — they highlight with a dashed border
3. **Click** an element to select it — the inspector panel shows its details
4. **Type an instruction** in the prompt editor (e.g. "Make this button red and larger")
5. **Apply** — the LLM modifies the element and patches it live
6. **Undo / Redo / Regenerate** using the bottom toolbar or `Ctrl+Z` / `Ctrl+Y`

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Model to use for modifications |

Set via environment or shell:
```bash
# PowerShell
$env:OLLAMA_MODEL="qwen2.5:7b"

# Bash
export OLLAMA_MODEL="qwen2.5:7b"
```

## Project Structure

```
├── backend/                   # FastAPI
│   ├── main.py               # App entry point, routes, WebSocket
│   ├── requirements.txt
│   ├── services/
│   │   ├── browser.py        # Playwright page loading + HTML preparation
│   │   └── llm.py            # Ollama LLM integration
│   └── models/
│       └── schemas.py        # Pydantic request/response models
│
├── frontend/                  # Next.js (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js       # Landing — URL input
│   │   │   └── editor/
│   │   │       └── page.js   # Editor workspace
│   │   ├── components/
│   │   │   ├── Toolbar.jsx
│   │   │   ├── WebsiteRenderer.jsx
│   │   │   ├── OverlayLayer.jsx
│   │   │   ├── InspectorPanel.jsx
│   │   │   ├── PromptEditor.jsx
│   │   │   └── HistoryControls.jsx
│   │   ├── store/
│   │   │   └── useEditorStore.js
│   │   └── lib/
│   │       ├── api.js
│   │       └── ws.js
│   └── public/
│       └── inject.js          # DOM selection engine (embedded into iframe HTML)
│
├── .gitignore
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Zustand, Tailwind CSS 4 |
| Backend | FastAPI, Playwright, httpx |
| LLM | Ollama (local) — any model (qwen2.5, llama3, etc.) |
| Communication | REST API + WebSocket + postMessage (iframe) |

## License

MIT
