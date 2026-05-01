/**
 * WebSocket client for streaming LLM updates.
 * Falls back gracefully if WebSocket is unavailable.
 */

let socket = null;
let messageHandler = null;
let reconnectTimer = null;

const WS_URL = "ws://localhost:8000/ws";

/**
 * Connect to the WebSocket server.
 * @param {function} onMessage - Callback for incoming messages
 */
export function connectWebSocket(onMessage) {
  if (socket?.readyState === WebSocket.OPEN) return;

  messageHandler = onMessage;

  try {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log("[WS] Connected");
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        messageHandler?.(data);
      } catch (e) {
        console.error("[WS] Failed to parse message:", e);
      }
    };

    socket.onclose = () => {
      console.log("[WS] Disconnected");
      socket = null;
      // Auto-reconnect after 3 seconds
      reconnectTimer = setTimeout(() => connectWebSocket(messageHandler), 3000);
    };

    socket.onerror = (err) => {
      console.error("[WS] Error:", err);
    };
  } catch (e) {
    console.error("[WS] Failed to connect:", e);
  }
}

/**
 * Send a modification request via WebSocket.
 * @param {{element_html: string, styles: object, instruction: string}} payload
 */
export function sendModifyRequest(payload) {
  if (socket?.readyState !== WebSocket.OPEN) {
    console.warn("[WS] Not connected, cannot send");
    return false;
  }

  socket.send(
    JSON.stringify({
      type: "modify",
      ...payload,
    })
  );
  return true;
}

/**
 * Disconnect from the WebSocket server.
 */
export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}
