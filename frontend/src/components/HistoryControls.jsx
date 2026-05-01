"use client";

import { useCallback } from "react";
import useEditorStore from "@/store/useEditorStore";
import { modifyElement } from "@/lib/api";

/**
 * HistoryControls — Undo, Redo, and Regenerate buttons.
 */
export default function HistoryControls({ iframeRef }) {
  const history = useEditorStore((s) => s.history);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const lastInstruction = useEditorStore((s) => s.lastInstruction);
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const setProcessing = useEditorStore((s) => s.setProcessing);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const patchIframe = useCallback(
    (elementId, html) => {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            source: "annotator-parent",
            type: "patch",
            id: elementId,
            newHtml: html,
          },
          "*"
        );
      }
    },
    [iframeRef]
  );

  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry) {
      patchIframe(entry.elementId, entry.previousHtml);
    }
  }, [undo, patchIframe]);

  const handleRedo = useCallback(() => {
    const entry = redo();
    if (entry) {
      patchIframe(entry.elementId, entry.newHtml);
    }
  }, [redo, patchIframe]);

  const handleRegenerate = useCallback(async () => {
    if (!selectedElement || !lastInstruction || isProcessing) return;

    setProcessing(true);

    try {
      const result = await modifyElement({
        element_html: selectedElement.html,
        styles: selectedElement.styles || {},
        instruction: lastInstruction,
      });

      if (result.modified_html) {
        pushHistory({
          elementId: selectedElement.id,
          previousHtml: selectedElement.html,
          newHtml: result.modified_html,
          instruction: lastInstruction,
        });
        patchIframe(selectedElement.id, result.modified_html);
      }
    } catch (err) {
      console.error("[History] Regenerate failed:", err);
      alert(`Regenerate failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }, [
    selectedElement,
    lastInstruction,
    isProcessing,
    setProcessing,
    pushHistory,
    patchIframe,
  ]);

  return (
    <div className="h-10 border-t border-border bg-white flex items-center px-4 gap-1 shrink-0">
      {/* Undo */}
      <button
        onClick={handleUndo}
        disabled={!canUndo || isProcessing}
        className="h-7 px-2.5 rounded text-xs font-medium text-muted
                   hover:bg-surface-alt hover:text-foreground
                   disabled:opacity-30 disabled:cursor-not-allowed
                   transition-colors flex items-center gap-1.5"
        title="Undo (Ctrl+Z)"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
        Undo
      </button>

      {/* Redo */}
      <button
        onClick={handleRedo}
        disabled={!canRedo || isProcessing}
        className="h-7 px-2.5 rounded text-xs font-medium text-muted
                   hover:bg-surface-alt hover:text-foreground
                   disabled:opacity-30 disabled:cursor-not-allowed
                   transition-colors flex items-center gap-1.5"
        title="Redo (Ctrl+Y)"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
        Redo
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-border mx-1" />

      {/* Regenerate */}
      <button
        onClick={handleRegenerate}
        disabled={!selectedElement || !lastInstruction || isProcessing}
        className="h-7 px-2.5 rounded text-xs font-medium text-muted
                   hover:bg-surface-alt hover:text-foreground
                   disabled:opacity-30 disabled:cursor-not-allowed
                   transition-colors flex items-center gap-1.5"
        title="Regenerate last modification"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.5 2v6h-6" />
          <path d="M2.5 22v-6h6" />
          <path d="M2 11.5a10 10 0 0 1 18.8-4.3" />
          <path d="M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
        Regenerate
      </button>

      {/* History counter */}
      <div className="ml-auto text-[10px] text-muted">
        {history.length > 0
          ? `${historyIndex + 1} / ${history.length} changes`
          : "No changes yet"}
      </div>
    </div>
  );
}
