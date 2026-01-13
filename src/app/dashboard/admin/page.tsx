"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { UserDialog } from "./user-dialog";
import { UserFilter } from "./_components/user-filter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit } from "lucide-react";
import { User } from "./types";
import { AccessDenied } from "@/components/page/access-denied";
import { Loading } from "@/components/page/loading";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { formatDecimal } from "@/lib/utils";
import { useInvalidateUsers, useUsers } from "./hooks/use-users-query";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const search = searchParams.get("search") || "";

  // --------------------
  // data fetching
  // --------------------
  const { data: users = [], isLoading, error } = useUsers(search || undefined);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const handleEditUser = useCallback((user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  }, []);

  const invalidateUsers = useInvalidateUsers();

  // --------------------
  // columns
  // --------------------
  const userColumns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="font-medium">
            {user.firstName} {user.lastName}
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div>{row.original.email}</div>,
    },
    {
      accessorKey: "phoneNumber",
      header: "Phone Number",
      cell: ({ row }) => <div>{row.original.phoneNumber || "-"}</div>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
    },
    {
      accessorKey: "commissionPerHead",
      header: () => <div className="text-right">Commission Per Head</div>,
      cell: ({ row }) => {
        const commission = row.original.commissionPerHead;
        return <div className="text-right">{commission ? formatDecimal(commission) : "-"}</div>;
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return <Badge variant={isActive ? "default" : "destructive"}>{isActive ? "Active" : "Inactive"}</Badge>;
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditUser(row.original);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // --------------------
  // table instance
  // --------------------
  const table = useDataTableInstance({
    data: users,
    columns: userColumns,
    enableRowSelection: false,
    manualPagination: false, // Client-side pagination since API doesn't support it
    defaultPageSize: 10,
    getRowId: (row) => row.id,
  });

  const handleUserSaved = () => {
    setIsDialogOpen(false);
    invalidateUsers();
  };

  // Show loading state while checking session
  if (status === "loading") {
    return <Loading />;
  }

  // Show unauthorized message if not ADMIN
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return <AccessDenied />;
  }

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
          <p className="text-destructive">Failed to load users. Please try again.</p>
        </div>
      </div>
    );
  }

  const total = users.length;
  const pageSize = table.getState().pagination.pageSize;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  // --------------------
  // render
  // --------------------
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Staff</h2>
          <p className="text-muted-foreground">Manage staff members and their permissions.</p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="mr-2 h-4 w-4" /> Create
        </Button>
      </div>

      {/* Filter & Search form */}
      <UserFilter />

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-md border">
          <DataTable table={table} columns={userColumns} />
        </div>
        <DataTablePagination
          table={table}
          total={total}
          pageSize={pageSize}
          pageIndex={pageIndex}
          pageCount={pageCount}
          onPageChange={(newPageIndex) => {
            table.setPageIndex(newPageIndex);
          }}
          onPageSizeChange={(newPageSize) => {
            table.setPageSize(newPageSize);
            table.setPageIndex(0);
          }}
        />
      </div>

      <UserDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        user={selectedUser || undefined}
        onSaved={handleUserSaved}
      />
    </div>
  );
}
