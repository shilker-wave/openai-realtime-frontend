export class WebSocketManager {
    constructor(sessionId, { onOpen, onClose, onError, onMessage }) {
        this.sessionId = sessionId;
        this.ws = null;
        this.eventHandlers = { onOpen, onClose, onError, onMessage };
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`ws://localhost:8000/ws/${this.sessionId}`);

            this.ws.onopen = () => {
                this.eventHandlers.onOpen?.();
                resolve();
            };

            this.ws.onclose = () => {
                this.eventHandlers.onClose?.();
            };

            this.ws.onerror = (err) => {
                this.eventHandlers.onError?.(err);
                reject(err);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.eventHandlers.onMessage?.(data);
                } catch (err) {
                    console.error('Invalid WebSocket message:', err);
                }
            };
        });
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    isOpen() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}
