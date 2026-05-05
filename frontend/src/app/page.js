"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    router.push(`/editor?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">

      {/* ── Animated background ────────────────────────── */}
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.4,
        }}
      />

      {/* Floating shapes */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 300, height: 300,
          background: "radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)",
          top: "10%", left: "15%",
          animation: "drift1 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(13,148,136,0.04) 0%, transparent 70%)",
          bottom: "5%", right: "10%",
          animation: "drift2 25s ease-in-out infinite",
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 200, height: 200,
          background: "radial-gradient(circle, rgba(13,148,136,0.05) 0%, transparent 70%)",
          top: "60%", left: "60%",
          animation: "drift3 18s ease-in-out infinite",
        }}
      />


      {/* ── Content ────────────────────────────────────── */}
      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" />
                <path d="M12 12L20 7.5" />
                <path d="M12 12V21" />
                <path d="M12 12L4 7.5" />
              </svg>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              WebMorph <span className="text-accent font-semibold">AI</span>
            </span>
          </div>
          <p className="text-[13px] text-muted leading-relaxed">
            Paste a URL, click any element, describe what you want.
            <br />
            AI handles the rest.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <input
              id="url-input"
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              placeholder="https://example.com"
              autoFocus
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-surface
                         text-sm text-foreground placeholder:text-muted/40
                         focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10
                         transition-all shadow-sm"
            />
          </div>

          <button
            id="load-button"
            type="submit"
            disabled={!url.trim() || isLoading}
            className="w-full h-10 rounded-lg bg-accent text-white text-sm font-medium
                       hover:bg-accent-hover active:scale-[0.99]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading…
              </>
            ) : (
              <>
                Open in Editor
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>

          {error && <p className="text-xs text-danger text-center">{error}</p>}
        </form>

        {/* Steps */}
        <div className="mt-12 pt-6 border-t border-border">
          <div className="grid grid-cols-3 gap-6">
            {[
              { n: "1", label: "Paste URL", sub: "Any public website" },
              { n: "2", label: "Click element", sub: "Visual selection" },
              { n: "3", label: "Describe change", sub: "AI applies it" },
            ].map(({ n, label, sub }) => (
              <div key={n} className="text-center">
                <div className="w-7 h-7 rounded-full bg-accent-subtle text-accent text-xs font-semibold flex items-center justify-center mx-auto mb-1.5 border border-accent/10">
                  {n}
                </div>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[10px] text-muted mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
