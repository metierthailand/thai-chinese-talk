"use client";

import { useState, useEffect } from "react";
import { Bell, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Notification = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  type: "PASSPORT_EXPIRY" | "TRIP_UPCOMING" | "SYSTEM" | "TASK_DUE";
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      // Fetch only unread notifications for the bell
      const res = await fetch("/api/notifications?isRead=false&pageSize=20");
      if (res.ok) {
        const response = await res.json();
        const notifications = response.data || [];
        setNotifications(notifications);
        setUnreadCount(notifications.filter((n: Notification) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const checkAlerts = async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/cron/alerts");
      if (res.ok) {
        // const data = await res.json();
        toast.success(`Checked alerts successfully`);
        fetchNotifications();
      } else {
        toast.error("Failed to check alerts");
      }
    } catch (error) {
      console.error("Failed to check alerts", error);
      toast.error("Error checking alerts");
    } finally {
      setIsChecking(false);
    }
  };

  const markAsRead = async (id: string, link: string | null) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      });
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      if (link) {
        setIsOpen(false);
        router.push(link);
      }
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h4 className="font-semibold">Notifications</h4>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={checkAlerts}
            disabled={isChecking}
            title="Check for new alerts now"
          >
            <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
          </Button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="grid">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex flex-col gap-1 border-b p-4 text-sm transition-colors hover:bg-muted/50 cursor-pointer",
                    !notification.isRead && "bg-muted/20"
                  )}
                  onClick={() => markAsRead(notification.id, notification.link)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{notification.title}</span>
                    {!notification.isRead && (
                      <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <p className="text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
