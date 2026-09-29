/**
 * Pusher-protocol socket using React Native's built-in WebSocket.
 * The native Pusher module aborts the iOS process, so live chat and
 * notifications stay on this JavaScript connection instead.
 */

type LiveEvent = {
  event?: string;
  channel?: string;
  data?: unknown;
};

export type UserLiveChannel = {
  close: () => void;
};

function parseData(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

async function authorizeChannel(
  authEndpoint: string,
  token: string,
  socketId: string,
  channelName: string,
): Promise<string | null> {
  const response = await fetch(authEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      socket_id: socketId,
      channel_name: channelName,
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    auth?: unknown;
    data?: { auth?: unknown };
  };
  const auth = payload.auth ?? payload.data?.auth;
  return typeof auth === "string" && auth.trim() ? auth : null;
}

export function openUserLiveChannel(options: {
  key: string;
  cluster: string;
  channelName: string;
  authEndpoint: string;
  token: string;
  onEvent: (eventName: string, data: unknown) => void;
}): UserLiveChannel {
  let closed = false;
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const connect = () => {
    if (closed) return;
    const url =
      `wss://ws-${options.cluster}.pusher.com/app/${encodeURIComponent(options.key)}` +
      "?protocol=7&client=js&version=8.4.0&flash=false";
    let next: WebSocket;
    try {
      next = new WebSocket(url);
    } catch {
      const delay = Math.min(30_000, 1_000 * 2 ** attempt);
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
      return;
    }
    socket = next;

    const send = (event: string, data: unknown) => {
      if (next.readyState !== WebSocket.OPEN) return;
      next.send(
        JSON.stringify({
          event,
          data: typeof data === "string" ? data : JSON.stringify(data),
        }),
      );
    };

    next.onopen = () => {
      attempt = 0;
    };

    next.onmessage = (message) => {
      if (closed || socket !== next) return;
      let frame: LiveEvent;
      try {
        frame = JSON.parse(String(message.data)) as LiveEvent;
      } catch {
        return;
      }
      const data = parseData(frame.data);
      if (frame.event === "pusher:ping") {
        send("pusher:pong", {});
        return;
      }
      if (frame.event === "pusher:connection_established") {
        const socketId = (data as { socket_id?: unknown } | null)?.socket_id;
        if (typeof socketId !== "string" || !socketId) return;
        void authorizeChannel(
          options.authEndpoint,
          options.token,
          socketId,
          options.channelName,
        )
          .then((auth) => {
            if (!auth || closed || socket !== next) return;
            send("pusher:subscribe", {
              auth,
              channel: options.channelName,
            });
          })
          .catch(() => {
            // A failed private-channel auth must not close the app.
          });
        return;
      }
      if (
        !frame.event ||
        frame.event.startsWith("pusher:") ||
        frame.event.startsWith("pusher_internal:")
      ) {
        return;
      }
      options.onEvent(frame.event, data);
    };

    next.onerror = () => {
      // onclose schedules the retry.
    };

    next.onclose = () => {
      if (closed || socket !== next) return;
      const delay = Math.min(30_000, 1_000 * 2 ** attempt);
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
    };
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
