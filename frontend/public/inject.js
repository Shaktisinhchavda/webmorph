/**
 * inject.js — DOM Selection & Annotation Engine
 *
 * This script is injected into the iframe to enable:
 * 1. DOM traversal and element identification
 * 2. Hover highlights
 * 3. Click-to-select with rich element metadata
 * 4. Multi-select with Shift+click
 * 5. Box model capture (padding, margin, border)
 * 6. Accessibility info (ARIA roles, states)
 * 7. Parent/sibling context for richer LLM prompts
 * 8. Receiving patches from the parent window
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
      position: cs.position,
      textAlign: cs.textAlign,
      textDecoration: cs.textDecoration,
      overflow: cs.overflow,
      opacity: cs.opacity,
      boxShadow: cs.boxShadow,
    };
  }

  // ── 4. Get box model breakdown ────────────────────────────────

  function getBoxModel(el) {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      content: {
        width: Math.round(rect.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth)),
        height: Math.round(rect.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth)),
      },
      padding: {
        top: Math.round(parseFloat(cs.paddingTop)),
        right: Math.round(parseFloat(cs.paddingRight)),
        bottom: Math.round(parseFloat(cs.paddingBottom)),
        left: Math.round(parseFloat(cs.paddingLeft)),
      },
      border: {
        top: Math.round(parseFloat(cs.borderTopWidth)),
        right: Math.round(parseFloat(cs.borderRightWidth)),
        bottom: Math.round(parseFloat(cs.borderBottomWidth)),
        left: Math.round(parseFloat(cs.borderLeftWidth)),
      },
      margin: {
        top: Math.round(parseFloat(cs.marginTop)),
        right: Math.round(parseFloat(cs.marginRight)),
        bottom: Math.round(parseFloat(cs.marginBottom)),
        left: Math.round(parseFloat(cs.marginLeft)),
      },
      total: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  }

  // ── 5. Get accessibility info ─────────────────────────────────

  function getAccessibility(el) {
    const role = el.getAttribute("role") || el.tagName.toLowerCase();
    const ariaLabel = el.getAttribute("aria-label") || "";
    const ariaDescribedBy = el.getAttribute("aria-describedby") || "";
    const ariaExpanded = el.getAttribute("aria-expanded");
    const ariaHidden = el.getAttribute("aria-hidden");
    const ariaDisabled = el.getAttribute("aria-disabled");
    const tabIndex = el.getAttribute("tabindex");

    // Determine focusability
    const focusableTags = ["a", "button", "input", "select", "textarea"];
    const isFocusable =
      focusableTags.includes(el.tagName.toLowerCase()) ||
      (tabIndex !== null && tabIndex !== "-1");

    // Determine if disabled
    const isDisabled = el.disabled === true || ariaDisabled === "true";

    return {
      role,
      ariaLabel: ariaLabel || null,
      ariaDescribedBy: ariaDescribedBy || null,
      ariaExpanded: ariaExpanded !== null ? ariaExpanded : null,
      ariaHidden: ariaHidden !== null ? ariaHidden : null,
      focusable: isFocusable,
      disabled: isDisabled,
      tabIndex: tabIndex !== null ? parseInt(tabIndex) : null,
    };
  }

  // ── 6. Get parent/sibling context for richer LLM prompts ──────

  function getContext(el) {
    const parent = el.parentElement;
    let parentInfo = null;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      parentInfo = {
        tagName: parent.tagName.toLowerCase(),
        id: parent.id || null,
        className: parent.className ? parent.className.toString().substring(0, 100) : null,
      };
    }

    // Sibling info
    const prevSibling = el.previousElementSibling;
    const nextSibling = el.nextElementSibling;

    return {
      parent: parentInfo,
      prevSibling: prevSibling ? prevSibling.tagName.toLowerCase() : null,
      nextSibling: nextSibling ? nextSibling.tagName.toLowerCase() : null,
      childCount: el.children.length,
    };
  }

  // ── 7. Get element attributes ─────────────────────────────────

  function getAttributes(el) {
    const attrs = {};
    for (const attr of el.attributes) {
      if (attr.name !== ATTR) {
        attrs[attr.name] = attr.value.substring(0, 200);
      }
    }
    return attrs;
  }

  // ── 8. Build element metadata ─────────────────────────────────

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
      boxModel: getBoxModel(el),
      accessibility: getAccessibility(el),
      context: getContext(el),
      attributes: getAttributes(el),
    };
  }

  // ── 9. Event handlers ─────────────────────────────────────────

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

  // ── Smart element resolution ───────────────────────────────────
  // When user clicks an SVG path or tiny inner element, bubble up
  // to the nearest meaningful parent element.

  const BUBBLE_TAGS = new Set([
    "path", "circle", "rect", "line", "polyline", "polygon", "ellipse",
    "g", "use", "defs", "clippath", "mask",
  ]);

  const MEANINGFUL_TAGS = new Set([
    "a", "button", "input", "select", "textarea", "label",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "span", "strong", "em", "li", "td", "th",
    "div", "section", "article", "nav", "header", "footer",
    "img", "figure", "figcaption", "blockquote",
  ]);

  function resolveElement(el) {
    let current = el;
    const tagLower = (current.tagName || "").toLowerCase();

    // If clicked on an SVG inner element (path, circle, etc.), bubble up to the <svg> or its parent
    if (BUBBLE_TAGS.has(tagLower) || current instanceof SVGElement) {
      // Walk up to find the <svg> element first
      while (current && current !== document.body) {
        if (current.tagName && current.tagName.toLowerCase() === "svg") {
          // Found the SVG — now check if its parent is a button/link (more useful to select)
          const parent = current.parentElement;
          if (parent && MEANINGFUL_TAGS.has(parent.tagName.toLowerCase())) {
            return parent;
          }
          return current;
        }
        current = current.parentElement;
      }
      return el; // fallback
    }

    // If clicked on a very small/empty element, try to find a meaningful parent
    const rect = el.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5 || !el.textContent?.trim()) {
      let parent = el.parentElement;
      let depth = 0;
      while (parent && parent !== document.body && depth < 3) {
        const pTag = parent.tagName.toLowerCase();
        if (MEANINGFUL_TAGS.has(pTag) && (parent.textContent?.trim() || pTag === "img")) {
          return parent;
        }
        parent = parent.parentElement;
        depth++;
      }
    }

    return el;
  }

  // Simplify SVG HTML before sending to LLM — strip path data noise
  function simplifyHtml(html, tagName) {
    if (tagName === "svg" || html.includes("<svg")) {
      // Replace long path d="" values with a placeholder
      return html.replace(/\bd="[^"]{50,}"/g, 'd="..."');
    }
    return html;
  }

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    let el = e.target;
    if (!el.getAttribute || el === document.body || el === document.documentElement) return;

    // Resolve to a meaningful element
    el = resolveElement(el);

    // Assign ID if missing
    if (!el.getAttribute(ATTR)) {
      el.setAttribute(ATTR, `el-${idCounter++}`);
    }

    const meta = buildMeta(el);
    // Simplify SVG HTML before sending
    meta.html = simplifyHtml(meta.html, meta.tagName);

    const isShiftClick = e.shiftKey;

    window.parent.postMessage(
      {
        source: "annotator-inject",
        type: isShiftClick ? "multi-select" : "select",
        ...meta,
      },
      "*"
    );
  }

  // ── 10. Listen for patches from parent ────────────────────────

  window.addEventListener("message", (e) => {
    const data = e.data;
    if (!data || data.source !== "annotator-parent") return;

    if (data.type === "patch") {
      const el = document.querySelector(`[${ATTR}="${data.id}"]`);
      if (!el) return;

      const patch = data.patch;

      if (patch) {
        // ── New: Style-patching mode ──
        // Apply style changes surgically without replacing the DOM

        // 1. Apply inline styles
        if (patch.style) {
          const styles = patch.style.split(";").map(s => s.trim()).filter(Boolean);
          styles.forEach(rule => {
            const [prop, ...valParts] = rule.split(":");
            if (prop && valParts.length) {
              const cssProp = prop.trim();
              const cssVal = valParts.join(":").trim();
              el.style.setProperty(cssProp, cssVal);
            }
          });
        }

        // 2. Change text content (only direct text, preserve child elements)
        if (patch.text !== undefined && patch.text !== null) {
          // Find text nodes and replace them
          const textNodes = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            if (walker.currentNode.textContent.trim()) {
              textNodes.push(walker.currentNode);
            }
          }
          if (textNodes.length > 0) {
            // Replace the first meaningful text node
            textNodes[0].textContent = patch.text;
            // Clear remaining text nodes (for simple text replacement)
            for (let i = 1; i < textNodes.length; i++) {
              textNodes[i].textContent = "";
            }
          } else {
            // No text nodes found — append text
            el.appendChild(document.createTextNode(patch.text));
          }
        }

        // 3. Set HTML attributes
        if (patch.attrs) {
          Object.entries(patch.attrs).forEach(([key, value]) => {
            if (key !== ATTR) { // Don't overwrite our tracking ID
              el.setAttribute(key, value);
            }
          });
        }

        // 4. Legacy fallback: full HTML replacement
        if (patch.__legacy_html) {
          const temp = document.createElement("div");
          temp.innerHTML = patch.__legacy_html;
          const newEl = temp.firstElementChild;
          if (newEl) {
            newEl.setAttribute(ATTR, data.id);
            el.replaceWith(newEl);
          } else {
            el.innerHTML = patch.__legacy_html;
          }
        }
      } else if (data.newHtml) {
        // ── Legacy: full HTML replacement (backward compat) ──
        const temp = document.createElement("div");
        temp.innerHTML = data.newHtml;
        const newEl = temp.firstElementChild;
        if (newEl) {
          newEl.setAttribute(ATTR, data.id);
          el.replaceWith(newEl);
        } else {
          el.innerHTML = data.newHtml;
        }
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

    if (data.type === "reassign-ids") {
      assignIds();
    }

    // Get full HTML for export
    if (data.type === "get-html") {
      const html = document.documentElement.outerHTML;
      window.parent.postMessage(
        {
          source: "annotator-inject",
          type: "full-html",
          html: html,
        },
        "*"
      );
    }
  });

  // ── 11. Initialize ────────────────────────────────────────────

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
