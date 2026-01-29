import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Notification {
  id: string;
  userId: string;
  type: "PASSPORT_EXPIRY" | "TRIP_UPCOMING" | "SYSTEM" | "TASK_DUE";
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  entityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query key factory
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (page: number, pageSize: number, isRead?: string) =>
    [...notificationKeys.lists(), page, pageSize, isRead] as const,
};

// Fetch notifications function
async function fetchNotifications(
  page: number = 1,
  pageSize: number = 20,
  isRead?: string
): Promise<NotificationsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (isRead !== undefined) {
    params.append("isRead", isRead);
  }
  const res = await fetch(`/api/notifications?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return res.json();
}

// Mark notification as read function
async function markNotificationAsRead(id: string): Promise<Notification> {
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Failed to mark notification as read");
  }
  return res.json();
}

// Hook to fetch notifications with pagination
export function useNotifications(params: { page: number; pageSize: number; isRead?: string }) {
  return useQuery({
    queryKey: notificationKeys.list(params.page, params.pageSize, params.isRead),
    queryFn: () => fetchNotifications(params.page, params.pageSize, params.isRead),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to mark notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (data) => {
      // Invalidate all notification queries to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      // Optimistically update the specific notification in cache
      queryClient.setQueriesData(
        { queryKey: notificationKeys.lists() },
        (old: NotificationsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((n) => (n.id === data.id ? data : n)),
          };
        }
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mark notification as read");
    },
  });
}

