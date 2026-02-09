"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Plus, Edit, Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { FamilyFilter } from "./_components/family-filter";
import { Loading } from "@/components/page/loading";

import { useFamilies, useDeleteFamily, type Family } from "./hooks/use-families";
import { mapFamilyParamsToQuery, useFamilyParams } from "./hooks/use-families-params";
import { AccessDenied } from "@/components/page/access-denied";
import { DeleteDialog } from "@/app/dashboard/_components/delete-dialog";

// --------------------
// columns
// --------------------
function buildFamilyColumns(
  canCreateOrEdit: boolean,
  onDeleteClick?: (id: string) => void,
): ColumnDef<Family>[] {
  return [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const family = row.original;
      return <div className="w-[180px] truncate font-medium">{family.name}</div>;
    },
  },
  {
    accessorKey: "customerName",
    header: "Customer name",
    cell: ({ row }) => (
      <div>
        {row.original.customers
          .map((customer) => customer.customer.firstNameEn + " " + customer.customer.lastNameEn)
          .join(", ")}
      </div>
    ),
  },
  {
    accessorKey: "members",
    header: "Total people",
    cell: ({ row }) => {
      const family = row.original;
      const memberCount = family.customers?.length || 0;
      return (
        <div>
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Link href={`/dashboard/families/${row.original.id}`}>
          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
        {canCreateOrEdit && (
          <Link href={`/dashboard/families/${row.original.id}/edit`}>
            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
        )}
        {canCreateOrEdit && onDeleteClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(row.original.id);
            }}
          >
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        )}
      </div>
    ),
  },
];
}

export default function FamiliesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;
  const canView = !!role && ["SUPER_ADMIN", "ADMIN", "SALES", "STAFF"].includes(role);
  const canCreateOrEdit = role === "SUPER_ADMIN" || role === "SALES";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // --------------------
  // params
  // --------------------
  const { page, pageSize, search, setParams } = useFamilyParams();

  const familyQuery = mapFamilyParamsToQuery({
    page,
    pageSize,
    search,
  });

  // --------------------
  // data fetching
  // --------------------
  const { data, isLoading, error } = useFamilies(familyQuery);
  const deleteFamilyMutation = useDeleteFamily();

  const families = data?.data ?? [];
  const total = data?.total ?? 0;

  const pageCount = useMemo(() => {
    if (!total || !pageSize) return 0;
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  const handleDeleteClick = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteFamilyMutation.mutateAsync(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  }, [deletingId, deleteFamilyMutation]);

  const columns = useMemo(
    () => buildFamilyColumns(canCreateOrEdit, canCreateOrEdit ? handleDeleteClick : undefined),
    [canCreateOrEdit, handleDeleteClick],
  );

  // --------------------
  // table instance
  // --------------------
  const table = useDataTableInstance({
    data: families,
    columns,
    enableRowSelection: false,
    manualPagination: true,
    pageCount,
    defaultPageSize: pageSize,
    defaultPageIndex: page - 1,
    getRowId: (row) => row.id,
  });

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



  if (sessionStatus === "loading") {
    return <Loading />;
  }
  if (!canView) {
    return <AccessDenied />;
  }

  // --------------------
  // render
  // --------------------
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Families / Groups</h2>
          <p className="text-muted-foreground">Create and update families or groups and their members.</p>
        </div>
        {canCreateOrEdit && (
          <Link href="/dashboard/families/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create
            </Button>
          </Link>
        )}
      </div>

      {/* Filter & Search form */}
      <FamilyFilter />

      <div className="relative flex flex-col gap-4 overflow-auto">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <div className="space-y-8 p-8">
            <div className="flex h-64 items-center justify-center">
              <p className="text-destructive">Failed to load families. Please try again.</p>
            </div>
          </div>
        ) : (
          <>
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
            <DeleteDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              onConfirm={handleDeleteConfirm}
              isDeleting={deleteFamilyMutation.isPending}
              title="Delete family / group"
              description="Are you sure you want to delete this family / group? This action cannot be undone."
            />
          </>
        )}
      </div>
    </div>
  );
}
