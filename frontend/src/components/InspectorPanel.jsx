"use client";

import useEditorStore from "@/store/useEditorStore";

/**
 * InspectorPanel — Displays metadata and computed styles
 * for the currently selected element.
 */
export default function InspectorPanel() {
  const selectedElement = useEditorStore((s) => s.selectedElement);

  if (!selectedElement) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center mb-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted"
          >
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
          </svg>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Click on any element
          <br />
          in the preview to inspect it
        </p>
      </div>
    );
  }

  const { tagName, textContent, styles } = selectedElement;

  // Filter out empty or default styles
  const styleEntries = styles
    ? Object.entries(styles).filter(
        ([, v]) => v && v !== "none" && v !== "normal" && v !== "0px"
      )
    : [];

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      {/* Element header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-1.5 py-0.5 bg-accent-light text-accent text-xs font-mono font-medium rounded">
            &lt;{tagName}&gt;
          </span>
        </div>

        {textContent && (
          <div>
            <label className="text-[10px] font-medium text-muted uppercase tracking-wider">
              Text Content
            </label>
            <p className="text-xs text-foreground mt-0.5 leading-relaxed bg-surface rounded p-2 break-words">
              {textContent.length > 150
                ? textContent.substring(0, 150) + "…"
                : textContent}
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Computed styles */}
      <div>
        <label className="text-[10px] font-medium text-muted uppercase tracking-wider">
          Computed Styles
        </label>
        <div className="mt-1.5 space-y-0.5">
          {styleEntries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-baseline justify-between py-1 px-2 rounded hover:bg-surface transition-colors"
            >
              <span className="text-xs text-muted font-mono">{key}</span>
              <span className="text-xs text-foreground font-mono ml-2 text-right break-all max-w-[120px]">
                {value}
              </span>
            </div>
          ))}
          {styleEntries.length === 0 && (
            <p className="text-xs text-muted py-1">No styles computed</p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Raw HTML (collapsed) */}
      <details className="group">
        <summary className="text-[10px] font-medium text-muted uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors">
          Raw HTML
        </summary>
        <pre className="mt-1.5 text-[11px] font-mono text-muted bg-surface rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
          {selectedElement.html}
        </pre>
      </details>
    </div>
  );
}
