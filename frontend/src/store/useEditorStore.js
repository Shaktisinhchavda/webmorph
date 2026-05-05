import { create } from "zustand";

/**
 * Central state store for the editor workspace.
 *
 * Manages:
 * - Page loading state
 * - Element selection (hover + click + multi-select)
 * - Modification history (undo/redo)
 * - LLM processing state
 * - Export functionality
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
  selectedElement: null, // { id, rect, html, tagName, textContent, styles, boxModel, accessibility, context, attributes }
  multiSelectedElements: [], // Array of selected element metadata for batch operations

  setHoveredElement: (el) => set({ hoveredElement: el }),
  setSelectedElement: (el) => set({ selectedElement: el, multiSelectedElements: [] }),

  addToMultiSelection: (el) => {
    const { multiSelectedElements, selectedElement } = get();
    // If this is the first shift-click and we have a primary selection, include it
    const existing = multiSelectedElements.length > 0
      ? multiSelectedElements
      : selectedElement
        ? [selectedElement]
        : [];

    // Don't add duplicates
    if (existing.find((e) => e.id === el.id)) {
      // Remove it (toggle behavior)
      const filtered = existing.filter((e) => e.id !== el.id);
      set({
        multiSelectedElements: filtered,
        selectedElement: filtered[filtered.length - 1] || null,
      });
    } else {
      const updated = [...existing, el];
      set({
        multiSelectedElements: updated,
        selectedElement: el, // Most recent becomes primary
      });
    }
  },

  clearSelection: () =>
    set({ hoveredElement: null, selectedElement: null, multiSelectedElements: [] }),

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

  // ── Export ──────────────────────────────────
  generateCSSDiff: () => {
    const { history, historyIndex } = get();
    const applied = history.slice(0, historyIndex + 1);
    if (applied.length === 0) return "";

    const lines = [
      "/* WebMorph — Exported CSS Changes */",
      `/* ${applied.length} modification(s) */`,
      "",
    ];

    applied.forEach((entry, i) => {
      lines.push(`/* Change ${i + 1}: ${entry.instruction} */`);
      lines.push(`/* Element: ${entry.elementId} */`);
      lines.push(`/* Before: ${entry.previousHtml.substring(0, 80)}... */`);
      lines.push(`/* After:  ${entry.newHtml.substring(0, 80)}... */`);
      lines.push("");
    });

    return lines.join("\n");
  },

  generateChangeLog: () => {
    const { history, historyIndex } = get();
    const applied = history.slice(0, historyIndex + 1);
    if (applied.length === 0) return [];
    return applied.map((entry, i) => ({
      index: i + 1,
      instruction: entry.instruction,
      elementId: entry.elementId,
      previousHtml: entry.previousHtml,
      newHtml: entry.newHtml,
    }));
  },

  // ── Reset ───────────────────────────────────
  resetEditor: () =>
    set({
      pageHtml: null,
      pageTitle: null,
      hoveredElement: null,
      selectedElement: null,
      multiSelectedElements: [],
      history: [],
      historyIndex: -1,
      isProcessing: false,
      lastInstruction: null,
      error: null,
    }),
}));

export default useEditorStore;
