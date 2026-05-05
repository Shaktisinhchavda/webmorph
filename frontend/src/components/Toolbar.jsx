"use client";

/**
 * Toolbar — Top bar with WebMorph AI branding and current URL.
 */
export default function Toolbar({ url, onBack }) {
  return (
    <header className="h-11 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
      {/* Brand */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        title="Back to home"
      >
        <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
            <path d="M12 12L20 7.5" />
            <path d="M12 12V21" />
            <path d="M12 12L4 7.5" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">
          WebMorph <span className="text-accent font-medium">AI</span>
        </span>
      </button>

      <div className="w-px h-5 bg-border" />

      {/* URL */}
      {url && (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="text-xs text-muted truncate font-mono">{url}</span>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-success animate-status" />
        <span className="text-[11px] text-muted">Live</span>
      </div>
    </header>
  );
}
