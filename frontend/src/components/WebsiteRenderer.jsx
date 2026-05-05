"use client";

import { useRef, useEffect, useCallback } from "react";
import useEditorStore from "@/store/useEditorStore";

/**
 * WebsiteRenderer — Renders the fetched HTML inside an iframe.
 * The inject.js annotation script is pre-embedded in the HTML by the backend.
 * Handles all postMessage events from inject.js including multi-select.
 */
export default function WebsiteRenderer({ iframeRef }) {
  const pageHtml = useEditorStore((s) => s.pageHtml);
  const setHoveredElement = useEditorStore((s) => s.setHoveredElement);
  const setSelectedElement = useEditorStore((s) => s.setSelectedElement);
  const addToMultiSelection = useEditorStore((s) => s.addToMultiSelection);

  // Build a full element metadata object from postMessage data
  const buildElementData = (data) => ({
    id: data.id,
    rect: data.rect,
    html: data.html,
    tagName: data.tagName,
    textContent: data.textContent,
    styles: data.styles,
    boxModel: data.boxModel || null,
    accessibility: data.accessibility || null,
    context: data.context || null,
    attributes: data.attributes || null,
  });

  // Listen for postMessage events from the injected script
  const handleMessage = useCallback(
    (event) => {
      const data = event.data;
      if (!data || data.source !== "annotator-inject") return;

      switch (data.type) {
        case "hover":
          setHoveredElement({ id: data.id, rect: data.rect });
          break;

        case "hover-clear":
          setHoveredElement(null);
          break;

        case "select":
          setSelectedElement(buildElementData(data));
          break;

        case "multi-select":
          addToMultiSelection(buildElementData(data));
          break;

        case "patched":
          // Update the selected element with new metadata after a patch
          setSelectedElement(buildElementData(data));
          break;

        case "ready":
          console.log(
            `[WebMorph] Injection complete — ${data.elementCount} elements indexed`
          );
          break;

        default:
          break;
      }
    },
    [setHoveredElement, setSelectedElement, addToMultiSelection]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  if (!pageHtml) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <p className="text-sm text-muted">No page loaded</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={pageHtml}
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin"
      title="Website Preview"
    />
  );
}
