import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export const useNotifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const sendNotification = (title: string, body: string, icon?: string) => {
    // Check if notifications are supported and permitted
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: icon || "/placeholder.svg",
          badge: "/placeholder.svg",
        });
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
      return permission === "granted";
    }
    return false;
  };

  return {
    sendNotification,
    requestPermission,
    isSupported: "Notification" in window,
    permission: "Notification" in window ? Notification.permission : "denied",
  };
};
