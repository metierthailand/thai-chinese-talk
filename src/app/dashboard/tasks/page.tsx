"use client";

import { useMemo, useCallback, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useTasks, useDeleteTask, type Task } from "./hooks/use-tasks";
import { useTasksParams, mapTasksParamsToQuery } from "./hooks/use-tasks-params";
import { toast } from "sonner";
import { Loading } from "@/components/page/loading";
import { DeleteDialog } from "@/app/dashboard/_components/delete-dialog";
import { format } from "date-fns";

export default function TasksPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // --------------------
  // params
  // --------------------
  const { page, pageSize, customerId, status, contact, userId, setParams } = useTasksParams();

  const tasksQuery = mapTasksParamsToQuery({
    page,
    pageSize,
    customerId,
    status,
    contact,
    userId,
  });

  // --------------------
  // columns
  // --------------------
  const columns: ColumnDef<Task>[] = useMemo(
    () => [
      {
        accessorKey: "topic",
        header: "Topic",
        cell: ({ row }) => <div className="font-medium">{row.original.topic}</div>,
      },
      {
        accessorKey: "customer",
        header: "Customer name",
        cell: ({ row }) => {
          const customer = row.original.relatedCustomer;
          if (!customer) return <div className="text-muted-foreground">-</div>;
          const hasThaiName = customer.firstNameTh && customer.lastNameTh;
          const thaiName = hasThaiName ? `${customer.firstNameTh} ${customer.lastNameTh}` : null;
          const englishName = `${customer.firstNameEn} ${customer.lastNameEn}`;
          return (
            <div className="font-medium">
              {englishName}
              {thaiName && <span className="text-muted-foreground text-xs">({thaiName})</span>}
            </div>
          );
        },
      },
      {
        accessorKey: "deadline",
        header: "Deadline",
        cell: ({ row }) => {
          const deadline = row.original.deadline;
          if (!deadline) return <div className="text-muted-foreground">-</div>;
          return <div>{format(new Date(deadline), "dd MMM yyyy")}</div>;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const variant =
            status === "COMPLETED"
              ? "default"
              : status === "IN_PROGRESS"
                ? "secondary"
                : status === "CANCELLED"
                  ? "destructive"
                  : "outline";
          return <Badge variant={variant}>{status}</Badge>;
        },
      },
      {
        accessorKey: "user",
        header: "Created by",
        cell: ({ row }) => {
          const user = row.original.user;
          if (!user) return <div className="text-muted-foreground">-</div>;
          return (
            <div>
              {user.firstName} {user.lastName}
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created at",
        cell: ({ row }) => {
          const createdAt = row.original.createdAt;
          return (
            <div>
              <p className="text-sm font-medium">{format(new Date(createdAt), "dd MMM yyyy")}</p>
              <p className="text-muted-foreground text-xs">{format(new Date(createdAt), "HH:mm")}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Updated at",
        cell: ({ row }) => {
          const updatedAt = row.original.updatedAt;
          return (
            <div>
              <p className="text-sm font-medium">{format(new Date(updatedAt), "dd MMM yyyy")}</p>
              <p className="text-muted-foreground text-xs">{format(new Date(updatedAt), "HH:mm")}</p>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/tasks/${row.original.id}`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/tasks/${row.original.id}/edit`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(row.original.id);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="text-destructive h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  // --------------------
  // data fetching
  // --------------------
  const {
    data: tasksResponse,
    isLoading,
    error,
  } = useTasks(
    tasksQuery.page,
    tasksQuery.pageSize,
    tasksQuery.customerId,
    tasksQuery.status,
    tasksQuery.contact,
    tasksQuery.userId,
  );
  const deleteTaskMutation = useDeleteTask();

  const tasks = useMemo(() => tasksResponse?.data ?? [], [tasksResponse?.data]);
  const total = tasksResponse?.total ?? 0;

  // Calculate page count
  const pageCount = useMemo(() => {
    if (total > 0 && pageSize > 0) {
      return Math.ceil(total / pageSize);
    }
    return 0;
  }, [total, pageSize]);

  const table = useDataTableInstance({
    data: tasks,
    columns,
    enableRowSelection: false,
    defaultPageSize: pageSize,
    defaultPageIndex: page - 1,
    manualPagination: true,
    pageCount,
    getRowId: (row) => row.id,
  });

  // --------------------
  // handlers
  // --------------------
  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      setParams({ page: newPageIndex + 1 });
    },
    [setParams],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setParams({ pageSize: newPageSize, page: 1 });
    },
    [setParams],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTaskMutation.mutateAsync(id);
        setDeleteDialogOpen(false);
        setDeletingId(null);
      } catch {
        toast.error("Failed to delete task");
      }
    },
    [deleteTaskMutation],
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
          <p className="text-destructive">Failed to load tasks. Please try again.</p>
        </div>
      </div>
    );
  }

  // --------------------
  // render
  // --------------------
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">Manage your tasks and follow-ups.</p>
        </div>
        <Link href="/dashboard/tasks/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-md border">
          <DataTable table={table} columns={columns} />
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

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        isDeleting={deleteTaskMutation.isPending}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete this task."
      />
    </div>
  );
}
