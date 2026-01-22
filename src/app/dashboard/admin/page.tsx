"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
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
import { useUsers } from "./hooks/use-users-query";
import { format } from "date-fns";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "ALL";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  // Update search params helper
  const updateSearchParams = useCallback(
    (updates: { page?: number; pageSize?: number; search?: string; role?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.page !== undefined) {
        params.set("page", updates.page.toString());
      }
      if (updates.pageSize !== undefined) {
        params.set("pageSize", updates.pageSize.toString());
      }
      if (updates.search !== undefined) {
        if (updates.search) {
          params.set("search", updates.search);
        } else {
          params.delete("search");
        }
        // Reset to page 1 when search changes
        params.set("page", "1");
      }
      if (updates.role !== undefined) {
        if (updates.role && updates.role !== "ALL") {
          params.set("role", updates.role);
        } else {
          params.delete("role");
        }
        // Reset to page 1 when role changes
        params.set("page", "1");
      }
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  // --------------------
  // data fetching
  // --------------------
  const { data: usersResponse, isLoading, error } = useUsers(
    page,
    pageSize,
    search || undefined,
    role !== "ALL" ? role : undefined
  );

  const users = useMemo(() => usersResponse?.data ?? [], [usersResponse?.data]);
  const total = usersResponse?.total ?? 0;

  // --------------------
  // columns
  // --------------------
  const userColumns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Staff name",
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
      header: "Phone number",
      cell: ({ row }) => <div>{row.original.phoneNumber || "-"}</div>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
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
      accessorKey: "createdAt",
      header: "Created date",
      cell: ({ row }) => <div>{format(new Date(row.original.createdAt || ""), "dd MMM yyyy")}</div>,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Link href={`/dashboard/admin/${row.original.id}/edit`}>
            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const pageCount = useMemo(() => {
    if (!total || !pageSize) return 0;
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  // --------------------
  // table instance
  // --------------------
  const table = useDataTableInstance({
    data: users,
    columns: userColumns,
    enableRowSelection: false,
    manualPagination: true,
    pageCount,
    defaultPageSize: pageSize,
    defaultPageIndex: page - 1,
    getRowId: (row) => row.id,
  });

  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      updateSearchParams({ page: newPageIndex + 1 });
    },
    [updateSearchParams]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      updateSearchParams({ pageSize: newPageSize, page: 1 });
    },
    [updateSearchParams]
  );

  // Show loading state while checking session
  if (status === "loading") {
    return <Loading />;
  }

  // Show unauthorized message if not ADMIN
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return <AccessDenied />;
  }

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
        <Link href="/dashboard/admin/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      {/* Filter & Search form */}
      <UserFilter />

      <div className="relative flex flex-col gap-4 overflow-auto">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <div className="space-y-8 p-8">
            <div className="flex h-64 items-center justify-center">
              <p className="text-destructive">Failed to load users. Please try again.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-md border">
              <DataTable table={table} columns={userColumns} />
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
          </>
        )}
      </div>
    </div>
  );
}
