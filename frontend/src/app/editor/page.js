"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import useEditorStore from "@/store/useEditorStore";
import { analyzeUrl } from "@/lib/api";
import Toolbar from "@/components/Toolbar";
import WebsiteRenderer from "@/components/WebsiteRenderer";
import OverlayLayer from "@/components/OverlayLayer";
import InspectorPanel from "@/components/InspectorPanel";
import PromptEditor from "@/components/PromptEditor";
import HistoryControls from "@/components/HistoryControls";

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const iframeRef = useRef(null);

  const url = searchParams.get("url");
  const pageHtml = useEditorStore((s) => s.pageHtml);
  const isLoading = useEditorStore((s) => s.isLoading);
  const error = useEditorStore((s) => s.error);
  const setPageData = useEditorStore((s) => s.setPageData);
  const setLoading = useEditorStore((s) => s.setLoading);
  const setError = useEditorStore((s) => s.setError);
  const resetEditor = useEditorStore((s) => s.resetEditor);
  const selectedElement = useEditorStore((s) => s.selectedElement);

  // Load the page when URL changes
  useEffect(() => {
    if (!url) {
      router.push("/");
      return;
    }

    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      try {
        const result = await analyzeUrl(url);
        if (!cancelled) {
          setPageData(result.html, result.title, result.url);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [url, router, setPageData, setLoading, setError]);

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const entry = useEditorStore.getState().undo();
        if (entry && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              source: "annotator-parent",
              type: "patch",
              id: entry.elementId,
              newHtml: entry.previousHtml,
            },
            "*"
          );
        }
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        const entry = useEditorStore.getState().redo();
        if (entry && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              source: "annotator-parent",
              type: "patch",
              id: entry.elementId,
              newHtml: entry.newHtml,
            },
            "*"
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleBack = useCallback(() => {
    resetEditor();
    router.push("/");
  }, [resetEditor, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-screen">
        <Toolbar url={url} onBack={handleBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Loading website…</p>
            <p className="text-xs text-muted/60 mt-1">{url}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col h-screen">
        <Toolbar url={url} onBack={handleBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Failed to load page
            </p>
            <p className="text-xs text-muted mb-4">{error}</p>
            <button
              onClick={handleBack}
              className="h-8 px-4 rounded-md bg-surface-alt text-sm text-foreground hover:bg-border transition-colors"
            >
              ← Try another URL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top toolbar */}
      <Toolbar url={url} onBack={handleBack} />

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Website preview with overlay */}
        <div className="flex-1 relative overflow-hidden bg-surface">
          <WebsiteRenderer iframeRef={iframeRef} />
          <OverlayLayer iframeRef={iframeRef} />
        </div>

        {/* Right: Sidebar (inspector + prompt) */}
        <div className="w-72 border-l border-border bg-white flex flex-col shrink-0">
          {/* Sidebar header */}
          <div className="h-9 border-b border-border flex items-center px-3">
            <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
              Inspector
            </span>
            {selectedElement && (
              <button
                onClick={() => useEditorStore.getState().clearSelection()}
                className="ml-auto text-[10px] text-muted hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Inspector content */}
          <div className="flex-1 overflow-y-auto">
            <InspectorPanel />
          </div>

          {/* Prompt editor */}
          <PromptEditor iframeRef={iframeRef} />
        </div>
      </div>

      {/* Bottom: History controls */}
      <HistoryControls iframeRef={iframeRef} />
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
