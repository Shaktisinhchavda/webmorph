# WebMorph AI

**Load any website. Click any element. Describe what you want. AI applies it.**

WebMorph AI is a visual web editor that lets you modify any website's UI using natural language. Select elements by clicking, type instructions like *"make this button green and larger"*, and watch the AI patch your changes in real-time.

🎥 **[Watch the Demo Video on Loom](https://www.loom.com/share/e25f1137bb4d4f11916a2b502eca9074)**

![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=next.js&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white) ![Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?logo=google&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)

---

## How It Works

```
1. Paste a URL          →  Playwright fetches the page HTML
2. Click any element    →  inject.js captures element metadata
3. Type an instruction  →  Gemini generates a JSON style patch
4. See it live          →  Patch applied surgically to the DOM
```

### Architecture

```
Frontend (Next.js :3000)  ──REST──▶  Backend (FastAPI :8000)
       │                                  │
       │ iframe + postMessage              ├── Playwright (page fetching)
       │ Zustand (state mgmt)             ├── Gemini AI (style patching)
       │ Overlay (visual selection)        └── Ollama (local fallback)
```

---

## Features

- **Visual element selection** — Hover to highlight, click to inspect any DOM element
- **Multi-select** — `Shift+Click` to batch-select multiple elements
- **AI-powered modifications** — Describe changes in plain English, AI generates CSS patches
- **Smart element bubbling** — Clicking SVG paths or icons auto-selects the parent button/link
- **Style-patch architecture** — LLM outputs JSON patches (`{style, text, attrs}`) instead of full HTML, so complex elements like SVGs and nested buttons work reliably
- **Dual LLM support** — Google Gemini (cloud, fast) with Ollama (local) as fallback
- **Undo / Redo / Regenerate** — Full edit history with `Ctrl+Z` / `Ctrl+Y`
- **Inspector panel** — Box model, accessibility info, computed styles, raw HTML
- **Auto-retry** — Handles Gemini 429/503 errors with exponential backoff

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Gemini API Key** — Get one at [aistudio.google.com](https://aistudio.google.com/apikey)

### 1. Backend

```bash
cd backend

# Set your Gemini API key
export GEMINI_API_KEY="your-key-here"
export GEMINI_MODEL="gemini-2.0-flash"    # or any Gemini model

# Using uv (recommended)
uv run --with-requirements requirements.txt uvicorn main:app --reload --port 8000

# Or using pip
pip install -r requirements.txt
playwright install chromium
uvicorn main:app --reload --port 8000
```

<details>
<summary><strong>PowerShell (Windows)</strong></summary>

```powershell
cd backend
$env:GEMINI_API_KEY="your-key-here"
$env:GEMINI_MODEL="gemini-2.0-flash"
uv run --with-requirements requirements.txt uvicorn main:app --reload --port 8000
```
</details>

<details>
<summary><strong>Using Ollama instead (no API key needed)</strong></summary>

If you don't set `GEMINI_API_KEY`, the app automatically falls back to a local Ollama model:

```bash
ollama pull qwen2.5:7b
ollama serve
cd backend
uv run --with-requirements requirements.txt uvicorn main:app --reload --port 8000
```
</details>

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Open

Navigate to **[http://localhost:3000](http://localhost:3000)**

---

## Usage

1. **Paste a URL** and click "Open in Editor"
2. **Hover** over elements — they highlight with a dashed border
3. **Click** an element to select it — the Inspector shows its metadata
4. **Type an instruction** (e.g. *"Make this button red with rounded corners"*)
5. **Apply** — the AI generates a style patch and applies it live
6. **Undo / Redo** with `Ctrl+Z` / `Ctrl+Y` or the bottom toolbar

### Demo Page

A built-in demo page is available at `http://localhost:3000/demo.html` for testing without loading external sites.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | — | Google Gemini API key (enables cloud AI) |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model to use |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint (local fallback) |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Ollama model to use |

---

## Project Structure

```
├── backend/
│   ├── main.py                 # FastAPI app, routes, WebSocket
│   ├── requirements.txt
│   ├── services/
│   │   ├── browser.py          # Playwright page fetching + HTML prep
│   │   └── llm.py              # LLM service (Gemini/Ollama, style-patch)
│   └── models/
│       └── schemas.py          # Pydantic request/response models
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js         # Landing page — URL input
│   │   │   ├── globals.css     # Design tokens, animations
│   │   │   └── editor/
│   │   │       └── page.js     # Editor workspace
│   │   ├── components/
│   │   │   ├── Toolbar.jsx         # Top nav bar
│   │   │   ├── WebsiteRenderer.jsx # iframe renderer
│   │   │   ├── OverlayLayer.jsx    # Hover/selection overlays
│   │   │   ├── InspectorPanel.jsx  # Element metadata panel
│   │   │   ├── PromptEditor.jsx    # AI instruction input
│   │   │   └── HistoryControls.jsx # Undo/Redo/Regenerate
│   │   ├── store/
│   │   │   └── useEditorStore.js   # Zustand state management
│   │   └── lib/
│   │       └── api.js              # Backend API client
│   └── public/
│       ├── inject.js           # DOM engine (injected into iframe)
│       └── demo.html           # Built-in demo page
│
├── .gitignore
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Zustand, Tailwind CSS 4 |
| Backend | FastAPI, Playwright, httpx |
| AI | Google Gemini (cloud) / Ollama (local fallback) |
| Communication | REST API + WebSocket + postMessage (iframe) |

---

## How the Style-Patch Architecture Works

Traditional approach (fragile):
```
Click element → send full HTML to LLM → LLM outputs full modified HTML → replace DOM
```
*Problem: LLM can't accurately reproduce complex SVGs, nested buttons, or 2000+ char HTML*

**WebMorph approach (robust):**
```
Click element → send simplified HTML to LLM → LLM outputs JSON patch → apply surgically
```

The LLM returns a small JSON patch:
```json
{
  "style": "background-color: #22c55e; color: white; border-radius: 12px;",
  "text": "New Button Text",
  "attrs": { "width": "48", "height": "48" }
}
```

The frontend applies each field independently — `el.style.setProperty()` for styles, `TreeWalker` for text, `setAttribute()` for attributes. The original DOM structure (SVG paths, nested elements) is never touched.

---

## License

MIT
