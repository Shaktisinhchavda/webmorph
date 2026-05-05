"use client";

import useEditorStore from "@/store/useEditorStore";

/**
 * OverlayLayer — Renders hover, selection, and multi-selection
 * highlight boxes on top of the iframe.
 *
 * The overlay itself has pointer-events: none so clicks pass through
 * to the iframe underneath.
 */
export default function OverlayLayer({ iframeRef }) {
  const hoveredElement = useEditorStore((s) => s.hoveredElement);
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const multiSelectedElements = useEditorStore((s) => s.multiSelectedElements);

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ pointerEvents: "none" }}
    >
      {/* Multi-selection highlights */}
      {multiSelectedElements
        .filter((el) => el.id !== selectedElement?.id)
        .map((el) => (
          <div
            key={el.id}
            className="absolute transition-all duration-100"
            style={{
              border: "2px solid #8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.06)",
              top: el.rect.top,
              left: el.rect.left,
              width: el.rect.width,
              height: el.rect.height,
              borderRadius: 2,
            }}
          >
            {/* Tag label for multi-selected */}
            <div
              className="absolute flex items-center gap-1 px-1.5 py-0.5 rounded text-white"
              style={{
                backgroundColor: "#8b5cf6",
                fontSize: 10,
                fontWeight: 500,
                top: -20,
                left: 0,
                lineHeight: "14px",
              }}
            >
              {el.tagName}
            </div>
          </div>
        ))}

      {/* Hover highlight */}
      {hoveredElement &&
        hoveredElement.id !== selectedElement?.id &&
        !multiSelectedElements.find((el) => el.id === hoveredElement.id) && (
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

      {/* Primary selection highlight */}
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
            {multiSelectedElements.length > 1 && (
              <span className="opacity-70">
                +{multiSelectedElements.length - 1}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
