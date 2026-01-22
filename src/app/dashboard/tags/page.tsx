"use client";

import { useMemo, useCallback, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useTags, useDeleteTag } from "./hooks/use-tags";
import { useTagsParams, mapTagsParamsToQuery } from "./hooks/use-tags-params";
import { toast } from "sonner";
import { Loading } from "@/components/page/loading";
import { TagSearch } from "./_components/tag-search";
import { DeleteDialog } from "@/app/dashboard/_components/delete-dialog";

interface Tag {
  id: string;
  name: string;
  order: number;
  _count?: {
    customers: number;
  };
}

export default function TagsPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // --------------------
  // params
  // --------------------
  const { page, pageSize, search, setParams } = useTagsParams();

  const tagsQuery = mapTagsParamsToQuery({
    page,
    pageSize,
    search,
  });

  // --------------------
  // columns
  // --------------------
  const columns: ColumnDef<Tag>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Tag Name",
        cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
      },
      {
        accessorKey: "usage",
        header: "Usage",
        cell: ({ row }) => {
          const count = row.original._count?.customers || 0;
          return `${count} ${count === 1 ? "customer" : "customers"}`;
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/tags/${row.original.id}`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/tags/${row.original.id}/edit`}>
              <Button variant="ghost" size="sm">
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
  const { data: tagsResponse, isLoading, error } = useTags(tagsQuery);
  const deleteTagMutation = useDeleteTag();

  const tags = useMemo(() => tagsResponse?.data ?? [], [tagsResponse?.data]);
  const total = tagsResponse?.total ?? 0;

  // Calculate page count
  const pageCount = useMemo(() => {
    if (total > 0 && pageSize > 0) {
      return Math.ceil(total / pageSize);
    }
    return 0;
  }, [total, pageSize]);

  const table = useDataTableInstance({
    data: tags,
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

  const handleSearchChange = useCallback(
    (newSearch: string) => {
      setParams({ search: newSearch, page: 1 });
    },
    [setParams],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTagMutation.mutateAsync(id);
        setDeleteDialogOpen(false);
        setDeletingId(null);
      } catch {
        toast.error("Deleted unsuccessfully.");
      }
    },
    [deleteTagMutation],
  );

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tags</h2>
          <p className="text-muted-foreground">Manage customer tags for better organization.</p>
        </div>
        <Link href="/dashboard/tags/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      {/* Search form */}
      <div className="flex items-center justify-end gap-4">
        <TagSearch search={search} onSearchChange={handleSearchChange} />
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <div className="space-y-8 p-8">
            <div className="flex h-64 items-center justify-center">
              <p className="text-destructive">Failed to load tags. Please try again.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-md border">
              <DataTable table={table} columns={columns} dndEnabled={false} />
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

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        isDeleting={deleteTagMutation.isPending}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete this item and remove it from all selections."
      />
    </div>
  );
}
