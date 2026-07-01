type WsCallback = (payload: any) => void;

class WebSocketManager {
  private socket: WebSocket | null = null;
  private listeners = new Set<WsCallback>();
  private reconnectTimeout: any = null;

  isConnected() {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  sendRaw(data: any) {
    if (this.isConnected()) {
      this.socket!.send(JSON.stringify(data));
    }
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${proto}//${host}/ws`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const normalized = normalizeMessage(raw);
        this.listeners.forEach((fn) => fn(normalized));
      } catch (err) {
        console.error("WS Parse error", err);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  disconnect() {
    clearTimeout(this.reconnectTimeout);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  subscribe(fn: WsCallback) {
    this.listeners.add(fn);
    this.connect();
    return () => {
      this.listeners.delete(fn);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }
}

function normalizeMessage(raw: any): any {
  if (raw.type === "private_message" || raw.type === "group_message") {
    const p = raw.payload || {};
    return {
      type: "message",
      data: {
        conversationId: String(raw.type === "group_message" ? (p.group_id || p.receiver_id) : p.receiver_id),
        authorId: String(p.sender_id),
        text: p.content || "",
        createdAt: p.created_at || new Date().toISOString(),
      },
    };
  }
  if (raw.type === "typing") {
    const p = raw.payload || {};
    return {
      type: "typing",
      data: {
        conversationId: String(p.receiver_id),
        authorId: String(p.sender_id),
      },
    };
  }
  return raw;
}

export const wsManager = new WebSocketManager();
