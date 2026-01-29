"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useNotifications, useMarkNotificationAsRead, type Notification } from "./hooks/use-notifications";
import { useNotificationsParams, mapNotificationsParamsToQuery } from "./hooks/use-notifications-params";
import { NotificationFilter } from "./_components/notification-filter";
import { Eye } from "lucide-react";
import { Loading } from "@/components/page/loading";

export default function NotificationsPage() {
  const router = useRouter();

  // --------------------
  // params
  // --------------------
  const { page, pageSize, isRead, setParams } = useNotificationsParams();

  const notificationsQuery = mapNotificationsParamsToQuery({
    page,
    pageSize,
    isRead,
  });

  const getTypeBadgeVariant = (type: Notification["type"]) => {
    switch (type) {
      case "PASSPORT_EXPIRY":
        return "destructive";
      case "TRIP_UPCOMING":
        return "warning";
      case "SYSTEM":
        return "info";
      case "TASK_DUE":
        return "info";
      default:
        return "outline";
    }
  };

  const getTypeLabel = (type: Notification["type"]) => {
    switch (type) {
      case "PASSPORT_EXPIRY":
        return "Passport Expiry";
      case "TRIP_UPCOMING":
        return "Trip Upcoming";
      case "SYSTEM":
        return "System";
      case "TASK_DUE":
        return "Task Due";
      default:
        return type;
    }
  };

  const columns: ColumnDef<Notification>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.title}</span>
            {!row.original.isRead && (
              <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            )}
          </div>
        ),
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => (
          <div className="max-w-md text-sm text-muted-foreground line-clamp-2">
            {row.original.message}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant={getTypeBadgeVariant(row.original.type)}>
            {getTypeLabel(row.original.type)}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => format(new Date(row.original.createdAt), "PPp"),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {row.original.link && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  router.push(row.original.link!);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [router]
  );

  // --------------------
  // data fetching
  // --------------------
  const { data: notificationsResponse, isLoading, error } = useNotifications(notificationsQuery);
  const markAsReadMutation = useMarkNotificationAsRead();

  const notifications = useMemo(
    () => notificationsResponse?.data ?? [],
    [notificationsResponse?.data]
  );
  const total = notificationsResponse?.total ?? 0;

  // Calculate page count
  const pageCount = useMemo(() => {
    if (total > 0 && pageSize > 0) {
      return Math.ceil(total / pageSize);
    }
    return 0;
  }, [total, pageSize]);

  const table = useDataTableInstance({
    data: notifications,
    columns: columns,
    enableRowSelection: false,
    defaultPageSize: pageSize,
    defaultPageIndex: page - 1,
    getRowId: (row) => row.id,
  });

  // Set manual pagination mode
  useEffect(() => {
    table.setOptions((prev) => ({
      ...prev,
      manualPagination: true,
      pageCount,
      data: notifications,
    }));
  }, [pageCount, notifications, table]);

  // --------------------
  // handlers
  // --------------------
  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      setParams({ page: newPageIndex + 1 });
    },
    [setParams]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setParams({ pageSize: newPageSize, page: 1 });
    },
    [setParams]
  );

  const handleRowClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markAsReadMutation.mutate(notification.id);
      }
      if (notification.link) {
        router.push(notification.link);
      }
    },
    [markAsReadMutation, router]
  );

  // --------------------
  // states
  // --------------------
  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load notifications. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">View and manage your notifications.</p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationFilter isRead={isRead} />
        </div>
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-md border">
          <DataTable
            table={table}
            columns={columns}
            onRowClick={handleRowClick}
          />
        </div>
        <DataTablePagination
          table={table}
          total={total}
          pageSize={pageSize}
          pageIndex={page - 1}
          pageCount={pageCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}

