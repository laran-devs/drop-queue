"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface NotificationContextType {
  sendNotification: (title: string, options?: NotificationOptions) => void;
  requestPermission: () => Promise<void>;
  permission: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (typeof window !== "undefined" && "Notification" in window && permission === "granted") {
      new Notification(title, {
        icon: "/favicon.ico",
        ...options
      });
    }
  };

  return (
    <NotificationContext.Provider value={{ sendNotification, requestPermission, permission }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
