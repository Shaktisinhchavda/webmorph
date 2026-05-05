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

  const sendToIframe = useCallback(
    (elementId, payload) => {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          { source: "annotator-parent", type: "patch", id: elementId, ...payload },
          "*"
        );
      }
    },
    [iframeRef]
  );

  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry) sendToIframe(entry.elementId, { newHtml: entry.previousHtml });
  }, [undo, sendToIframe]);

  const handleRedo = useCallback(() => {
    const entry = redo();
    if (entry) {
      if (entry.patch) sendToIframe(entry.elementId, { patch: entry.patch });
      else if (entry.newHtml) sendToIframe(entry.elementId, { newHtml: entry.newHtml });
    }
  }, [redo, sendToIframe]);

  const handleRegenerate = useCallback(async () => {
    if (!selectedElement || !lastInstruction || isProcessing) return;
    setProcessing(true);
    try {
      const result = await modifyElement({
        element_html: selectedElement.html,
        styles: selectedElement.styles || {},
        instruction: lastInstruction,
        context: selectedElement.context || null,
        accessibility: selectedElement.accessibility || null,
        box_model: selectedElement.boxModel || null,
      });
      if (result.patch) {
        pushHistory({
          elementId: selectedElement.id,
          previousHtml: selectedElement.html,
          patch: result.patch,
          instruction: lastInstruction,
        });
        sendToIframe(selectedElement.id, { patch: result.patch });
      }
    } catch (err) {
      console.error("[History] Regenerate failed:", err);
      alert(`Regenerate failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }, [selectedElement, lastInstruction, isProcessing, setProcessing, pushHistory, sendToIframe]);

  const ToolBtn = ({ onClick, disabled, title, children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 px-2 rounded text-xs font-medium text-muted
                 hover:bg-surface-alt hover:text-foreground
                 disabled:opacity-25 disabled:cursor-not-allowed
                 transition-colors flex items-center gap-1.5"
    >
      {children}
    </button>
  );

  return (
    <div className="h-9 border-t border-border bg-surface flex items-center px-3 gap-0.5 shrink-0">
      <ToolBtn onClick={handleUndo} disabled={!canUndo || isProcessing} title="Undo (Ctrl+Z)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
        Undo
      </ToolBtn>

      <ToolBtn onClick={handleRedo} disabled={!canRedo || isProcessing} title="Redo (Ctrl+Y)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
        Redo
      </ToolBtn>

      <div className="w-px h-4 bg-border mx-1" />

      <ToolBtn onClick={handleRegenerate} disabled={!selectedElement || !lastInstruction || isProcessing} title="Regenerate">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6" /><path d="M2.5 22v-6h6" />
          <path d="M2 11.5a10 10 0 0 1 18.8-4.3" /><path d="M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
        Regenerate
      </ToolBtn>

      <span className="ml-auto text-[10px] text-muted font-mono">
        {history.length > 0 ? `${historyIndex + 1}/${history.length}` : "—"}
      </span>
    </div>
  );
}
