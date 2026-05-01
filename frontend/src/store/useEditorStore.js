import { create } from "zustand";

/**
 * Central state store for the editor workspace.
 *
 * Manages:
 * - Page loading state
 * - Element selection (hover + click)
 * - Modification history (undo/redo)
 * - LLM processing state
 */
const useEditorStore = create((set, get) => ({
  // ── Page state ──────────────────────────────
  url: null,
  pageHtml: null,
  pageTitle: null,
  isLoading: false,
  error: null,

  setUrl: (url) => set({ url }),
  setPageData: (html, title, url) =>
    set({ pageHtml: html, pageTitle: title, url, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  // ── Element selection ───────────────────────
  hoveredElement: null, // { id, rect }
  selectedElement: null, // { id, rect, html, tagName, textContent, styles }

  setHoveredElement: (el) => set({ hoveredElement: el }),
  setSelectedElement: (el) => set({ selectedElement: el }),
  clearSelection: () => set({ hoveredElement: null, selectedElement: null }),

  // ── History (linear undo/redo) ──────────────
  // Each entry: { elementId, previousHtml, newHtml, instruction }
  history: [],
  historyIndex: -1,

  pushHistory: (entry) => {
    const { history, historyIndex } = get();
    // Truncate any future entries when pushing new change
    const trimmed = history.slice(0, historyIndex + 1);
    const newHistory = [...trimmed, entry];
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return null;
    const entry = history[historyIndex];
    set({ historyIndex: historyIndex - 1 });
    return entry; // Caller uses entry.previousHtml to patch iframe
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];
    set({ historyIndex: nextIndex });
    return entry; // Caller uses entry.newHtml to patch iframe
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // ── LLM processing ─────────────────────────
  isProcessing: false,
  lastInstruction: null,

  setProcessing: (isProcessing) => set({ isProcessing }),
  setLastInstruction: (instruction) => set({ lastInstruction: instruction }),

  // ── Reset ───────────────────────────────────
  resetEditor: () =>
    set({
      pageHtml: null,
      pageTitle: null,
      hoveredElement: null,
      selectedElement: null,
      history: [],
      historyIndex: -1,
      isProcessing: false,
      lastInstruction: null,
      error: null,
    }),
}));

export default useEditorStore;
