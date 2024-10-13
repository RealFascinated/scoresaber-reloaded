import { useEffect, useRef, useState } from "react";

/**
 * Generic WebSocket hook for connecting and handling WebSocket messages of type T.
 *
 * @param url - The WebSocket server URL.
 * @param reconnectDelay - Optional delay (in milliseconds) before attempting to reconnect (default is 5000ms).
 */
export const useWebSocket = <T>(url: string, reconnectDelay: number = 5000) => {
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState<T | null>(null); // Store the incoming message of type T
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
      socketRef.current = new WebSocket(url);

      socketRef.current.onopen = () => {
        setConnected(true);
      };

      socketRef.current.onmessage = event => {
        try {
          // Handle incoming messages and store them in state as type T
          const messageData: T = JSON.parse(event.data);
          setMessage(messageData);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
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
      // Try reconnecting after the specified delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, reconnectDelay);
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
  }, [mounted, url, reconnectDelay]);

  return { connected, message };
};
