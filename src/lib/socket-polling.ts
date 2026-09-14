/**
 * Polling-based Socket.IO fallback for Vercel serverless deployment
 * 
 * This replaces WebSocket connections with HTTP polling when deployed on Vercel.
 * For production with high traffic, consider using Appwrite Realtime instead.
 */

type EventHandler = (data: any) => void;

class SocketPollingClient {
  private baseUrl: string;
  private userId: string | null = null;
  private listeners: Map<string, EventHandler[]> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastTimestamp: number = Date.now();
  private isPolling: boolean = false;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  }

  /**
   * Connect with polling (replaces WebSocket connection)
   */
  async connect(userId: string): Promise<void> {
    this.userId = userId;
    this.lastTimestamp = Date.now();
    this.startPolling();
    console.log('🔌 Polling client connected for user:', userId);
  }

  /**
   * Disconnect and stop polling
   */
  disconnect(): void {
    this.stopPolling();
    this.userId = null;
    this.listeners.clear();
    console.log('🔌 Polling client disconnected');
  }

  /**
   * Send an event to the server
   */
  async emit(event: string, data: any): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/socketio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: event, ...data }),
      });

      if (!response.ok) {
        console.error('Failed to emit event:', event);
      }
    } catch (error) {
      console.error('Emit error:', error);
    }
  }

  /**
   * Listen for events
   */
  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Start polling for messages
   */
  private startPolling(): void {
    if (this.isPolling) return;
    this.isPolling = true;

    // Poll every 1 second for new messages
    this.pollInterval = setInterval(async () => {
      await this.poll();
    }, 1000);

    // Initial poll
    this.poll();
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Poll server for new messages
   */
  private async poll(): Promise<void> {
    if (!this.userId) return;

    try {
      const response = await fetch(
        `${this.baseUrl}/api/socketio?since=${this.lastTimestamp}&type=messages`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
          // Process each message
          for (const msg of data.messages) {
            this.emitLocally(msg.message.type || 'message', msg.message);
          }
          this.lastTimestamp = data.timestamp;
        }
      }

      // Also check typing indicators
      const typingResponse = await fetch(
        `${this.baseUrl}/api/socketio?type=typing`
      );

      if (typingResponse.ok) {
        const typingData = await typingResponse.json();
        if (typingData.typing) {
          this.emitLocally('user-typing', typingData.typing);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  /**
   * Emit event locally to registered handlers
   */
  private emitLocally(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

// Singleton instance
let pollingClient: SocketPollingClient | null = null;

/**
 * Get or create the polling client
 */
export function getPollingClient(): SocketPollingClient {
  if (!pollingClient) {
    pollingClient = new SocketPollingClient();
  }
  return pollingClient;
}

/**
 * Check if running on Vercel (no WebSocket support)
 */
export function isVercelDeployment(): boolean {
  return typeof window !== 'undefined' && 
    (window.location.hostname.includes('vercel.app') || 
     process.env.NEXT_PUBLIC_VERCEL === '1');
}

/**
 * Send message via polling (for Vercel)
 */
export async function sendMessageViaPolling(
  receiverId: string, 
  message: any
): Promise<void> {
  const client = getPollingClient();
  await client.emit('message', { receiverId, data: message });
}

/**
 * Send typing indicator via polling (for Vercel)
 */
export async function sendTypingViaPolling(
  receiverId: string, 
  senderName: string
): Promise<void> {
  const client = getPollingClient();
  await client.emit('typing', { receiverId, data: { senderName } });
}

/**
 * Stop typing indicator via polling (for Vercel)
 */
export async function stopTypingViaPolling(receiverId: string): Promise<void> {
  const client = getPollingClient();
  await client.emit('stop-typing', { receiverId });
}
