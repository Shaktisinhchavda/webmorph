"use client";

import { useState } from "react";
import useEditorStore from "@/store/useEditorStore";

/**
 * InspectorPanel — Displays rich metadata for the selected element:
 * - Element tag, text content, attributes
 * - Visual box model (content → padding → border → margin)
 * - Accessibility info (ARIA roles, states)
 * - Computed styles
 * - Raw HTML
 * - Export changes
 */
export default function InspectorPanel() {
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const multiSelectedElements = useEditorStore((s) => s.multiSelectedElements);
  const history = useEditorStore((s) => s.history);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const generateChangeLog = useEditorStore((s) => s.generateChangeLog);

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
        <p className="text-[10px] text-muted/50 mt-2">
          Shift+Click to multi-select
        </p>
      </div>
    );
  }

  const { tagName, textContent, styles, boxModel, accessibility, context, attributes } =
    selectedElement;

  // Filter out empty or default styles
  const styleEntries = styles
    ? Object.entries(styles).filter(
        ([, v]) => v && v !== "none" && v !== "normal" && v !== "0px" && v !== "auto"
      )
    : [];

  // Filter out data-annotator-id from attributes display
  const attrEntries = attributes
    ? Object.entries(attributes).filter(([k]) => !k.startsWith("data-annotator"))
    : [];

  return (
    <div className="p-3 space-y-3 overflow-y-auto text-xs">
      {/* Multi-selection indicator */}
      {multiSelectedElements.length > 1 && (
        <div className="bg-accent-subtle text-accent px-2 py-1 rounded text-[10px] font-medium text-center border border-accent/10">
          {multiSelectedElements.length} elements selected (Shift+Click)
        </div>
      )}

      {/* Element header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-1.5 py-0.5 bg-accent-light text-accent text-xs font-mono font-medium rounded">
            &lt;{tagName}&gt;
          </span>
        </div>

        {textContent && (
          <div>
            <SectionLabel>Text Content</SectionLabel>
            <p className="text-xs text-foreground mt-0.5 leading-relaxed bg-surface-alt rounded p-2 break-words">
              {textContent.length > 150
                ? textContent.substring(0, 150) + "…"
                : textContent}
            </p>
          </div>
        )}
      </div>

      <Divider />

      {/* Box Model */}
      {boxModel && <BoxModelView boxModel={boxModel} />}

      <Divider />

      {/* Accessibility */}
      {accessibility && <AccessibilityView accessibility={accessibility} />}

      <Divider />

      {/* Attributes */}
      {attrEntries.length > 0 && (
        <CollapsibleSection title="Attributes" defaultOpen={false}>
          <div className="space-y-0.5">
            {attrEntries.map(([key, value]) => (
              <StyleRow key={key} label={key} value={value} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Context */}
      {context && (
        <CollapsibleSection title="Context" defaultOpen={false}>
          <div className="space-y-0.5">
            {context.parent && (
              <StyleRow
                label="parent"
                value={`<${context.parent.tagName}>${context.parent.className ? ` .${context.parent.className.split(" ")[0]}` : ""}`}
              />
            )}
            {context.prevSibling && (
              <StyleRow label="prev" value={`<${context.prevSibling}>`} />
            )}
            {context.nextSibling && (
              <StyleRow label="next" value={`<${context.nextSibling}>`} />
            )}
            <StyleRow label="children" value={context.childCount} />
          </div>
        </CollapsibleSection>
      )}

      <Divider />

      {/* Computed Styles */}
      <CollapsibleSection title="Computed Styles" defaultOpen={true}>
        {styleEntries.length > 0 ? (
          <div className="space-y-0.5">
            {styleEntries.map(([key, value]) => (
              <StyleRow key={key} label={key} value={value} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted py-1">No styles computed</p>
        )}
      </CollapsibleSection>

      <Divider />

      {/* Raw HTML */}
      <CollapsibleSection title="Raw HTML" defaultOpen={false}>
        <pre className="text-[11px] font-mono text-muted bg-surface-alt rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
          {selectedElement.html}
        </pre>
      </CollapsibleSection>

      <Divider />

      {/* Export */}
      {history.length > 0 && historyIndex >= 0 && (
        <ExportSection generateChangeLog={generateChangeLog} />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <label className="text-[10px] font-medium text-muted uppercase tracking-wider">
      {children}
    </label>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}

function StyleRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between py-0.5 px-2 rounded hover:bg-surface-alt transition-colors">
      <span className="text-[11px] text-muted font-mono shrink-0">{label}</span>
      <span className="text-[11px] text-foreground font-mono ml-2 text-right break-all max-w-[120px]">
        {typeof value === "object" && value !== null && value.$$typeof ? value : String(value)}
      </span>
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1 text-[10px] font-medium text-muted uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        {title}
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

// ── Box Model Visualization ─────────────────────────────────────

function BoxModelView({ boxModel }) {
  const { content, padding, border, margin, total } = boxModel;

  return (
    <div>
      <SectionLabel>Box Model</SectionLabel>
      <div className="mt-1.5 relative">
        {/* Margin layer */}
        <div className="bg-amber-50 border border-amber-200 rounded p-1.5 text-center">
          <span className="text-[9px] text-amber-600 font-mono absolute top-1 left-2">margin</span>
          <div className="flex justify-between text-[9px] text-amber-700 font-mono mb-0.5">
            <span></span>
            <span>{margin.top}</span>
            <span></span>
          </div>
          <div className="flex items-center">
            <span className="text-[9px] text-amber-700 font-mono w-5 text-right">{margin.left}</span>

            {/* Border layer */}
            <div className="flex-1 bg-yellow-50 border border-yellow-300 rounded mx-1 p-1 relative">
              <span className="text-[9px] text-yellow-700 font-mono absolute top-0 left-1">border</span>
              <div className="flex justify-between text-[9px] text-yellow-700 font-mono mb-0.5">
                <span></span>
                <span>{border.top}</span>
                <span></span>
              </div>
              <div className="flex items-center">
                <span className="text-[9px] text-yellow-700 font-mono w-4 text-right">{border.left}</span>

                {/* Padding layer */}
                <div className="flex-1 bg-green-50 border border-green-300 rounded mx-1 p-1 relative">
                  <span className="text-[9px] text-green-700 font-mono absolute top-0 left-1">padding</span>
                  <div className="flex justify-between text-[9px] text-green-700 font-mono mb-0.5">
                    <span></span>
                    <span>{padding.top}</span>
                    <span></span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[9px] text-green-700 font-mono w-3 text-right">{padding.left}</span>

                    {/* Content */}
                    <div className="flex-1 bg-blue-50 border border-blue-200 rounded mx-1 py-1.5 text-center">
                      <span className="text-[10px] text-blue-700 font-mono font-medium">
                        {content.width} × {content.height}
                      </span>
                    </div>

                    <span className="text-[9px] text-green-700 font-mono w-3 text-left">{padding.right}</span>
                  </div>
                  <div className="flex justify-center text-[9px] text-green-700 font-mono mt-0.5">
                    <span>{padding.bottom}</span>
                  </div>
                </div>

                <span className="text-[9px] text-yellow-700 font-mono w-4 text-left">{border.right}</span>
              </div>
              <div className="flex justify-center text-[9px] text-yellow-700 font-mono mt-0.5">
                <span>{border.bottom}</span>
              </div>
            </div>

            <span className="text-[9px] text-amber-700 font-mono w-5 text-left">{margin.right}</span>
          </div>
          <div className="flex justify-center text-[9px] text-amber-700 font-mono mt-0.5">
            <span>{margin.bottom}</span>
          </div>
        </div>

        {/* Total dimensions */}
        <div className="text-center mt-1">
          <span className="text-[10px] text-muted font-mono">
            total: {total.width} × {total.height}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Accessibility View ──────────────────────────────────────────

function AccessibilityView({ accessibility }) {
  const { role, ariaLabel, focusable, disabled, tabIndex, ariaExpanded, ariaHidden } =
    accessibility;

  return (
    <CollapsibleSection title="Accessibility" defaultOpen={false}>
      <div className="space-y-0.5">
        <StyleRow label="role" value={role} />
        {ariaLabel && <StyleRow label="aria-label" value={ariaLabel} />}
        <StyleRow
          label="focusable"
          value={
            <span className={focusable ? "text-green-600" : "text-muted"}>
              {focusable ? "yes" : "no"}
            </span>
          }
        />
        <StyleRow
          label="disabled"
          value={
            <span className={disabled ? "text-red-500" : "text-muted"}>
              {disabled ? "yes" : "no"}
            </span>
          }
        />
        {tabIndex !== null && <StyleRow label="tabIndex" value={tabIndex} />}
        {ariaExpanded !== null && <StyleRow label="aria-expanded" value={ariaExpanded} />}
        {ariaHidden !== null && <StyleRow label="aria-hidden" value={ariaHidden} />}
      </div>
    </CollapsibleSection>
  );
}

// ── Export Section ───────────────────────────────────────────────

function ExportSection({ generateChangeLog }) {
  const [copied, setCopied] = useState(false);

  const handleExportChanges = () => {
    const changes = generateChangeLog();
    const text = changes
      .map(
        (c) =>
          `--- Change ${c.index}: ${c.instruction} ---\n` +
          `Element: ${c.elementId}\n` +
          `Before:\n${c.previousHtml}\n\n` +
          `After:\n${c.newHtml}\n`
      )
      .join("\n\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportHTML = () => {
    // Request full HTML from iframe
    window.postMessage(
      { source: "annotator-export", type: "request-html" },
      "*"
    );
  };

  return (
    <div>
      <SectionLabel>Export Changes</SectionLabel>
      <div className="mt-1.5 flex gap-1.5">
        <button
          onClick={handleExportChanges}
          className="flex-1 h-7 text-[10px] font-medium rounded border border-border
                     hover:bg-surface-alt transition-colors text-muted hover:text-foreground"
        >
          {copied ? "✓ Copied!" : "📋 Copy Diff"}
        </button>
      </div>
    </div>
  );
}
