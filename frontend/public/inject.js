/**
 * inject.js — DOM Selection Engine
 *
 * This script is injected into the iframe to enable:
 * 1. DOM traversal and element identification
 * 2. Hover highlights
 * 3. Click-to-select with element metadata
 * 4. Receiving patches from the parent window
 *
 * Communicates with the parent via window.postMessage().
 */

(function () {
  "use strict";

  // Avoid double-injection
  if (window.__annotatorInjected) return;
  window.__annotatorInjected = true;

  let idCounter = 0;
  const ATTR = "data-annotator-id";

  // ── 1. Assign unique IDs to all visible elements ──────────────

  function assignIds() {
    const elements = document.body.querySelectorAll("*");
    elements.forEach((el) => {
      if (!el.getAttribute(ATTR)) {
        el.setAttribute(ATTR, `el-${idCounter++}`);
      }
    });
  }

  // ── 2. Check if element is visible ────────────────────────────

  function isVisible(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // ── 3. Get computed styles for an element ─────────────────────

  function getKeyStyles(el) {
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontFamily: cs.fontFamily,
      lineHeight: cs.lineHeight,
      padding: cs.padding,
      margin: cs.margin,
      border: cs.border,
      borderRadius: cs.borderRadius,
      width: cs.width,
      height: cs.height,
      display: cs.display,
      textAlign: cs.textAlign,
    };
  }

  // ── 4. Build element metadata ─────────────────────────────────

  function buildMeta(el) {
    const rect = el.getBoundingClientRect();
    return {
      id: el.getAttribute(ATTR),
      tagName: el.tagName.toLowerCase(),
      textContent: (el.textContent || "").trim().substring(0, 200),
      html: el.outerHTML,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      styles: getKeyStyles(el),
    };
  }

  // ── 5. Event handlers ─────────────────────────────────────────

  let lastHoveredId = null;

  function handleMouseOver(e) {
    const el = e.target;
    if (!el.getAttribute || el === document.body || el === document.documentElement) return;

    const id = el.getAttribute(ATTR);
    if (!id || id === lastHoveredId) return;
    lastHoveredId = id;

    const rect = el.getBoundingClientRect();
    window.parent.postMessage(
      {
        source: "annotator-inject",
        type: "hover",
        id: id,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      },
      "*"
    );
  }

  function handleMouseOut(e) {
    lastHoveredId = null;
    window.parent.postMessage(
      {
        source: "annotator-inject",
        type: "hover-clear",
      },
      "*"
    );
  }

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    if (!el.getAttribute || el === document.body || el === document.documentElement) return;

    // Assign ID if missing
    if (!el.getAttribute(ATTR)) {
      el.setAttribute(ATTR, `el-${idCounter++}`);
    }

    const meta = buildMeta(el);
    window.parent.postMessage(
      {
        source: "annotator-inject",
        type: "select",
        ...meta,
      },
      "*"
    );
  }

  // ── 6. Listen for patches from parent ─────────────────────────

  window.addEventListener("message", (e) => {
    const data = e.data;
    if (!data || data.source !== "annotator-parent") return;

    if (data.type === "patch") {
      const el = document.querySelector(`[${ATTR}="${data.id}"]`);
      if (el) {
        // Create a temporary container to parse the new HTML
        const temp = document.createElement("div");
        temp.innerHTML = data.newHtml;
        const newEl = temp.firstElementChild;

        if (newEl) {
          // Preserve the annotator ID
          newEl.setAttribute(ATTR, data.id);
          el.replaceWith(newEl);
        } else {
          // If LLM returned raw text/inline content, update innerHTML
          el.innerHTML = data.newHtml;
        }

        // Send back updated metadata
        const updated = document.querySelector(`[${ATTR}="${data.id}"]`);
        if (updated) {
          const meta = buildMeta(updated);
          window.parent.postMessage(
            {
              source: "annotator-inject",
              type: "patched",
              ...meta,
            },
            "*"
          );
        }
      }
    }

    if (data.type === "reassign-ids") {
      assignIds();
    }
  });

  // ── 7. Initialize ─────────────────────────────────────────────

  assignIds();

  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("click", handleClick, true);

  // Disable all links and form submissions inside the iframe
  document.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  // Notify parent that injection is complete
  window.parent.postMessage(
    {
      source: "annotator-inject",
      type: "ready",
      elementCount: document.querySelectorAll(`[${ATTR}]`).length,
    },
    "*"
  );
})();
