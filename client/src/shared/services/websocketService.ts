// WebSocket Service for INOVAR Real-Time Updates

type EventHandler = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(userId: string, role: string, companyId?: string): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsBase = import.meta.env.VITE_WS_URL || `${protocol}//${host}`;
    const params = new URLSearchParams({
      userId,
      role,
      ...(companyId && { companyId }),
    });

    this.socket = new WebSocket(`${wsBase}/ws?${params}`);

    this.socket.onopen = () => {
      console.log('🔌 WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit(message.event, message.data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this.emit('disconnected', {});
      this.attemptReconnect(userId, role, companyId);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { error });
    };
  }

  private attemptReconnect(userId: string, role: string, companyId?: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(userId, role, companyId), delay);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (e) {
        console.error(`Error in handler for ${event}:`, e);
      }
    });

    // Also emit to wildcard handlers
    this.handlers.get('*')?.forEach((handler) => {
      try {
        handler({ event, data });
      } catch (e) {
        console.error(`Error in wildcard handler:`, e);
      }
    });
  }

  send(event: string, data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
