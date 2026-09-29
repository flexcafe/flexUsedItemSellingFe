/**
 * Chat messages are published on the API Socket.IO namespace `/chat`.
 * This speaks that protocol with React Native's one-argument WebSocket.
 * socket.io-client's React Native path passes a third argument and can abort Android.
 */

export type ChatLiveSocket = {
  close: () => void;
};

function apiOrigin(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return null;
  }
}

function toWebSocketOrigin(origin: string): string {
  if (origin.startsWith("https://")) return `wss://${origin.slice("https://".length)}`;
  if (origin.startsWith("http://")) return `ws://${origin.slice("http://".length)}`;
  return origin;
}

export function openChatLiveSocket(options: {
  baseUrl: string;
  token: string;
  onEvent: (eventName: string, payload: unknown) => void;
}): ChatLiveSocket | null {
  const origin = apiOrigin(options.baseUrl);
  if (!origin) return null;

  let closed = false;
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const connect = () => {
    if (closed) return;
    const url = `${toWebSocketOrigin(origin)}/socket.io/?EIO=4&transport=websocket`;
    let next: WebSocket;
    try {
      next = new WebSocket(url);
    } catch {
      scheduleRetry();
      return;
    }
    socket = next;

    const send = (packet: string) => {
      if (next.readyState !== WebSocket.OPEN) return;
      next.send(packet);
    };

    next.onopen = () => {
      attempt = 0;
    };

    next.onmessage = (message) => {
      if (closed || socket !== next) return;
      const data = typeof message.data === "string" ? message.data : "";
      if (!data) return;
      if (data.startsWith("0")) {
        send(`40/chat,${JSON.stringify({ token: options.token })}`);
        return;
      }
      if (data === "2") {
        send("3");
        return;
      }
      const marker = data.indexOf("[");
      if (!data.startsWith("42") || marker < 0) return;
      try {
        const parsed = JSON.parse(data.slice(marker)) as unknown;
        if (!Array.isArray(parsed) || typeof parsed[0] !== "string") return;
        options.onEvent(parsed[0], parsed[1]);
      } catch {
        // Ignore a malformed chat packet.
      }
    };

    next.onerror = () => {
      // onclose schedules the retry.
    };

    next.onclose = () => {
      if (closed || socket !== next) return;
      scheduleRetry();
    };
  };

  const scheduleRetry = () => {
    if (closed) return;
    const delay = Math.min(30_000, 1_000 * 2 ** attempt);
    attempt += 1;
    retryTimer = setTimeout(connect, delay);
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
      socket = null;
    },
  };
}
