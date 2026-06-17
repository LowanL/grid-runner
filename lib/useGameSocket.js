'use client';
import { useEffect, useRef, useCallback, useState } from 'react';

export function useGameSocket(onMessage) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    let timeoutId;

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Connect to the game websocket namespace so we don't collide
      // with Next.js HMR which uses /_next/webpack-hmr.
      const ws = new WebSocket(`${proto}//${location.host}/game`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        timeoutId = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        try { onMessageRef.current(JSON.parse(e.data)); } catch {}
      };
    }

    connect();
    return () => {
      clearTimeout(timeoutId);
      wsRef.current?.close();
    };
  }, []);

  return { send, connected };
}
