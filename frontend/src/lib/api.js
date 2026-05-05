/**
 * REST API client for the Annotator backend.
 * All calls go through Next.js rewrites → FastAPI.
 */

const API_BASE = "/api/backend";

/**
 * Analyze a URL — fetches the page HTML via Playwright.
 * @param {string} url
 * @returns {Promise<{html: string, title: string, url: string}>}
 */
export async function analyzeUrl(url) {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to analyze URL (${response.status})`);
  }

  return response.json();
}

/**
 * Modify an HTML element using the LLM.
 * Calls the backend directly (not through Next.js proxy) to avoid proxy timeouts.
 * @param {{element_html: string, styles: object, instruction: string}} payload
 * @returns {Promise<{modified_html: string}>}
 */
export async function modifyElement(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

  try {
    const response = await fetch(`http://localhost:8000/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to modify element (${response.status})`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check backend health status.
 * @returns {Promise<{status: string, ollama: string}>}
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error("Backend unreachable");
  return response.json();
}
