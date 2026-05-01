"use client";

import { useMemo } from "react";
import useEditorStore from "@/store/useEditorStore";

/**
 * OverlayLayer — Renders hover and selection highlight boxes
 * on top of the iframe, positioned based on element bounding rects.
 *
 * The overlay itself has pointer-events: none so clicks pass through
 * to the iframe underneath.
 */
export default function OverlayLayer({ iframeRef }) {
  const hoveredElement = useEditorStore((s) => s.hoveredElement);
  const selectedElement = useEditorStore((s) => s.selectedElement);

  // Calculate the iframe's offset in the parent to correctly position overlays
  const getIframeOffset = () => {
    if (!iframeRef?.current) return { top: 0, left: 0 };
    const rect = iframeRef.current.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  };

  const iframeOffset = iframeRef?.current
    ? (() => {
        const r = iframeRef.current.getBoundingClientRect();
        return { top: r.top, left: r.left };
      })()
    : { top: 0, left: 0 };

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ pointerEvents: "none" }}
    >
      {/* Hover highlight */}
      {hoveredElement &&
        hoveredElement.id !== selectedElement?.id && (
          <div
            className="absolute border border-dashed transition-all duration-75"
            style={{
              borderColor: "rgba(37, 99, 235, 0.5)",
              backgroundColor: "rgba(37, 99, 235, 0.04)",
              top: hoveredElement.rect.top,
              left: hoveredElement.rect.left,
              width: hoveredElement.rect.width,
              height: hoveredElement.rect.height,
              borderRadius: 2,
            }}
          />
        )}

      {/* Selection highlight */}
      {selectedElement && (
        <>
          <div
            className="absolute transition-all duration-100"
            style={{
              border: "2px solid #2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.06)",
              top: selectedElement.rect.top,
              left: selectedElement.rect.left,
              width: selectedElement.rect.width,
              height: selectedElement.rect.height,
              borderRadius: 2,
            }}
          />
          {/* Tag label */}
          <div
            className="absolute flex items-center gap-1 px-1.5 py-0.5 rounded text-white"
            style={{
              backgroundColor: "#2563eb",
              fontSize: 10,
              fontWeight: 500,
              top: selectedElement.rect.top - 20,
              left: selectedElement.rect.left,
              lineHeight: "14px",
            }}
          >
            {selectedElement.tagName}
          </div>
        </>
      )}
    </div>
  );
}
