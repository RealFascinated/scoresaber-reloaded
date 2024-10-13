import { useEffect, useRef, useState } from "react";
import { ScoreSaberWebsocketMessageToken } from "@ssr/common/types/token/scoresaber/websocket/scoresaber-websocket-message";

/**
 * Connects to the ScoreSaber websocket.
 */
export const useScoreSaberWebsocket = () => {
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState<ScoreSaberWebsocketMessageToken | null>(null); // Store the incoming message
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const connectWebSocket = () => {
      socketRef.current = new WebSocket("wss://scoresaber.com/ws");

      socketRef.current.onopen = () => {
        setConnected(true);
      };

      socketRef.current.onmessage = event => {
        // Ignore welcome message
        if (event.data === "Connected to the ScoreSaber WSS") {
          return;
        }

        // Handle incoming messages here and store them in state
        const messageData = JSON.parse(event.data);
        setMessage(messageData); // Store the message in the state
      };

      socketRef.current.onclose = () => {
        setConnected(false);
        attemptReconnect();
      };

      socketRef.current.onerror = () => {
        socketRef.current?.close(); // Close the socket on error
      };
    };

    const attemptReconnect = () => {
      // Clear any existing timeouts to avoid multiple reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Try reconnecting after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    };

    // Initialize WebSocket connection
    connectWebSocket();

    // Cleanup function when component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [mounted]);

  return { connected, message };
};
