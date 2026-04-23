"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(userId?: string, slug?: string, token?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      const socketInstance = io({
        query: token ? { token } : undefined
      });
      socketRef.current = socketInstance;

      
      // Delay state update to avoid synchronous cascading render
      setTimeout(() => setSocket(socketInstance), 0);

      socketInstance.on("connect", () => {
        setIsConnected(true);
        console.log("Socket connected:", socketInstance.id);
      });

      socketInstance.on("disconnect", () => {
        setIsConnected(false);
        console.log("Socket disconnected");
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Re-identify if userId or slug changes on an existing connection
  useEffect(() => {
    if (socket && isConnected) {
      if (userId && slug) {
        socket.emit("identify_streamer", { userId, slug });
      } else if (slug) {
        socket.emit("join_session", slug);
      }
    }
  }, [socket, isConnected, userId, slug]);

  const emit = useCallback((event: string, data: unknown) => {
    socket?.emit(event, data);
  }, [socket]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const on = useCallback((event: string, callback: (data: any) => void) => {
    socket?.on(event, callback);
    return () => {
      socket?.off(event, callback);
    };
  }, [socket]);

  return { isConnected, emit, on, socket };
}
