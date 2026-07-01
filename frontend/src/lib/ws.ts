import { WS_BASE_URL } from "./api";

export type WsMessage =
  | {
      type: "private_message";
      payload: {
        sender_id: number;
        receiver_id: number;
        username?: string;
        avatar?: string;
        content: string;
        created_at: string;
      };
    }
  | {
      type: "group_message";
      payload: {
        sender_id: number;
        group_id: number;
        username?: string;
        avatar?: string;
        content: string;
        created_at: string;
      };
    }
  | {
      type: "typing";
      payload: { sender_id?: number; receiver_id?: number };
    };

type Listener = (msg: WsMessage) => void;

class SocialWS {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectAttempts = 0;
  private closed = false;
  private connecting = false;

  connect() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.connecting) return;
    this.connecting = true;
    this.closed = false;
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws`);
      this.ws = ws;
      ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.connecting = false;
      };
      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data) as WsMessage;
          this.listeners.forEach((l) => l(parsed));
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        this.connecting = false;
        this.ws = null;
        if (this.closed) return;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
        this.reconnectAttempts += 1;
        setTimeout(() => this.connect(), delay);
      };
      ws.onerror = () => {
        ws.close();
      };
    } catch {
      this.connecting = false;
    }
  }

  disconnect() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }

  send(msg: WsMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const socialWs = new SocialWS();
