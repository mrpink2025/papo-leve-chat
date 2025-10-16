import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

export const useNotifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Registrar Service Worker para notificações em segundo plano
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log("Service Worker ready for push notifications");
      });
    }
  }, []);

  const sendNotification = (title: string, body: string, icon?: string, badge?: number) => {
    // Check if notifications are supported and permitted
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          body,
          icon: icon || "/app-icon-192.png",
          badge: "/app-icon-192.png",
          tag: "nosso-papo-message",
          requireInteraction: false,
          silent: false,
        });

        // Update app badge (se suportado)
        if ("setAppBadge" in navigator && badge !== undefined) {
          (navigator as any).setAppBadge(badge);
        }

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error("Notification error:", error);
      }
    }

    // Also show toast notification
    toast({
      title,
      description: body,
    });
  };

  const requestPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        sonnerToast.success("Notificações ativadas!", {
          description: "Você receberá alertas de novas mensagens.",
        });
      }
      return permission === "granted";
    }
    return false;
  };

  const clearBadge = () => {
    if ("clearAppBadge" in navigator) {
      (navigator as any).clearAppBadge();
    }
  };

  const setBadge = (count: number) => {
    if ("setAppBadge" in navigator) {
      (navigator as any).setAppBadge(count);
    }
  };

  return {
    sendNotification,
    requestPermission,
    clearBadge,
    setBadge,
    isSupported: "Notification" in window,
    permission: "Notification" in window ? Notification.permission : "denied",
  };
};
