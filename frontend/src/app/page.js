"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Landing Page — Clean, centered URL input.
 * User pastes a URL and clicks "Load" to enter the editor.
 */
export default function HomePage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);

    // Navigate to editor with the URL as a query param
    // The editor page will handle the actual loading
    router.push(`/editor?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="w-full max-w-lg px-6">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Annotator
          </h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Load any website, select elements visually,
            <br />
            and modify them with natural language.
          </p>
        </div>

        {/* URL Input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <input
              id="url-input"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com"
              autoFocus
              className="w-full h-12 pl-10 pr-4 rounded-lg border border-border bg-white
                         text-sm text-foreground placeholder:text-muted/40
                         focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10
                         transition-all"
            />
          </div>

          <button
            id="load-button"
            type="submit"
            disabled={!url.trim() || isLoading}
            className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium
                       hover:bg-accent-hover transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading…
              </>
            ) : (
              <>
                Load Website
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>

          {error && (
            <p className="text-xs text-danger text-center">{error}</p>
          )}
        </form>

        {/* Quick tips */}
        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-3 text-center">
            How it works
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                step: "1",
                label: "Paste URL",
                desc: "Enter any website URL",
              },
              {
                step: "2",
                label: "Select Element",
                desc: "Click on any UI element",
              },
              {
                step: "3",
                label: "Modify with AI",
                desc: "Describe changes in plain English",
              },
            ].map(({ step, label, desc }) => (
              <div key={step} className="text-center">
                <div className="w-6 h-6 rounded-full bg-surface-alt text-xs font-medium text-muted flex items-center justify-center mx-auto mb-1.5">
                  {step}
                </div>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[10px] text-muted mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
