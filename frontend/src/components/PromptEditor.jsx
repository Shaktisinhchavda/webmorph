"use client";

import { useState, useCallback } from "react";
import useEditorStore from "@/store/useEditorStore";
import { modifyElement } from "@/lib/api";

/**
 * PromptEditor — Natural language input for modifying the selected element.
 * Sends the instruction to the LLM and patches the iframe on success.
 */
export default function PromptEditor({ iframeRef }) {
  const [instruction, setInstruction] = useState("");
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const setProcessing = useEditorStore((s) => s.setProcessing);
  const setLastInstruction = useEditorStore((s) => s.setLastInstruction);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!selectedElement || !instruction.trim() || isProcessing) return;

      setProcessing(true);
      setLastInstruction(instruction.trim());

      try {
        const result = await modifyElement({
          element_html: selectedElement.html,
          styles: selectedElement.styles || {},
          instruction: instruction.trim(),
        });

        if (result.modified_html) {
          // Push to history before patching
          pushHistory({
            elementId: selectedElement.id,
            previousHtml: selectedElement.html,
            newHtml: result.modified_html,
            instruction: instruction.trim(),
          });

          // Patch the iframe
          const iframe = iframeRef.current;
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(
              {
                source: "annotator-parent",
                type: "patch",
                id: selectedElement.id,
                newHtml: result.modified_html,
              },
              "*"
            );
          }

          setInstruction("");
        }
      } catch (err) {
        console.error("[PromptEditor] Modification failed:", err);
        alert(`Modification failed: ${err.message}`);
      } finally {
        setProcessing(false);
      }
    },
    [
      selectedElement,
      instruction,
      isProcessing,
      setProcessing,
      setLastInstruction,
      pushHistory,
      iframeRef,
    ]
  );

  const isDisabled = !selectedElement || isProcessing;

  return (
    <div className="border-t border-border p-3">
      <label className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1.5 block">
        Modify Element
      </label>
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={
            selectedElement
              ? 'e.g. "Make this button larger and blue"'
              : "Select an element first..."
          }
          disabled={!selectedElement}
          rows={3}
          className="w-full text-sm rounded-md border border-border bg-surface px-3 py-2 resize-none
                     placeholder:text-muted/50 focus:outline-none focus:border-accent focus:ring-1
                     focus:ring-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={isDisabled || !instruction.trim()}
          className="w-full h-8 rounded-md text-sm font-medium transition-all
                     bg-accent text-white hover:bg-accent-hover
                     disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5l0 14" />
                <path d="M18 13l-6 6" />
                <path d="M6 13l6 6" />
              </svg>
              Apply Change
            </>
          )}
        </button>
        <p className="text-[10px] text-muted text-center">
          {selectedElement ? "Ctrl+Enter to apply" : "Select an element to start"}
        </p>
      </form>
    </div>
  );
}
