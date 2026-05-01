"use client";

import { useState } from "react";

/**
 * Toolbar — Top navigation bar with app branding and current URL display.
 */
export default function Toolbar({ url, onBack }) {
  return (
    <header className="h-12 border-b border-border bg-white flex items-center px-4 gap-3 shrink-0">
      {/* Logo / Brand */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        title="Back to home"
      >
        <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-6" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">
          Annotator
        </span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Current URL */}
      {url && (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="text-xs text-muted truncate">{url}</span>
        </div>
      )}

      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-success" />
        <span className="text-xs text-muted">Live</span>
      </div>
    </header>
  );
}
