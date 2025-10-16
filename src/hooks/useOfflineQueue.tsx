import { useState, useEffect, useCallback } from "react";

interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  type?: string;
  metadata?: any;
  timestamp: number;
  retryCount: number;
}

const STORAGE_KEY = "offline_message_queue";
const MAX_RETRIES = 3;

export const useOfflineQueue = () => {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load queue from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse offline queue:", e);
      }
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addToQueue = useCallback((message: Omit<QueuedMessage, "id" | "timestamp" | "retryCount">) => {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: `offline_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    setQueue((prev) => [...prev, queuedMessage]);
    return queuedMessage.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const incrementRetry = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, retryCount: msg.retryCount + 1 } : msg
      )
    );
  }, []);

  const getNextMessage = useCallback((): QueuedMessage | null => {
    return queue.find((msg) => msg.retryCount < MAX_RETRIES) || null;
  }, [queue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    queue,
    isOnline,
    addToQueue,
    removeFromQueue,
    incrementRetry,
    getNextMessage,
    clearQueue,
  };
};
