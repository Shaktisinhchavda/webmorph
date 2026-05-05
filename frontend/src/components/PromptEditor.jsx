"use client";

import { useState, useCallback } from "react";
import useEditorStore from "@/store/useEditorStore";
import { modifyElement } from "@/lib/api";

/**
 * PromptEditor — Natural language input for modifying the selected element.
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
          context: selectedElement.context || null,
          accessibility: selectedElement.accessibility || null,
          box_model: selectedElement.boxModel || null,
        });

        if (result.patch) {
          pushHistory({
            elementId: selectedElement.id,
            previousHtml: selectedElement.html,
            patch: result.patch,
            instruction: instruction.trim(),
          });

          const iframe = iframeRef.current;
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(
              {
                source: "annotator-parent",
                type: "patch",
                id: selectedElement.id,
                patch: result.patch,
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
    [selectedElement, instruction, isProcessing, setProcessing, setLastInstruction, pushHistory, iframeRef]
  );

  const isDisabled = !selectedElement || isProcessing;

  return (
    <div className="border-t border-border p-3 bg-surface">
      <label className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1.5 block">
        Modify Element
      </label>
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={selectedElement ? 'e.g. "Make this larger and green"' : "Select an element first…"}
          disabled={!selectedElement}
          rows={2}
          className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none
                     text-foreground placeholder:text-muted/40
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/10
                     transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <button
          type="submit"
          disabled={isDisabled || !instruction.trim()}
          className="w-full h-8 rounded-lg text-xs font-medium transition-all
                     bg-accent text-white hover:bg-accent-hover active:scale-[0.99]
                     disabled:opacity-30 disabled:cursor-not-allowed
                     flex items-center justify-center gap-1.5"
        >
          {isProcessing ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Applying…
            </>
          ) : (
            "Apply Change"
          )}
        </button>
        <p className="text-[10px] text-muted text-center">
          {selectedElement ? "⌘ Enter to apply" : "Click an element to begin"}
        </p>
      </form>
    </div>
  );
}
