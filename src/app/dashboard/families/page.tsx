"use client";

import { useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Plus, Edit, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { FamilyFilter } from "./_components/family-filter";
import { Loading } from "@/components/page/loading";

import { useFamilies, type Family } from "./hooks/use-families";
import { mapFamilyParamsToQuery, useFamilyParams } from "./hooks/use-families-params";

// --------------------
// columns
// --------------------
const familyColumns: ColumnDef<Family>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const family = row.original;
      return <div className="font-medium">{family.name}</div>;
    },
  },
  {
    accessorKey: "customerName",
    header: "Customer name",
    cell: ({ row }) => <div>{row.original.customers.map((customer) => customer.customer.firstNameEn + " " + customer.customer.lastNameEn).join(", ")}</div>,
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
        <Link href={`/dashboard/families/${row.original.id}/edit`}>
          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
            <Edit className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    ),
  },
];

export default function FamiliesPage() {
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

  const families = data?.data ?? [];
  const total = data?.total ?? 0;

  const pageCount = useMemo(() => {
    if (!total || !pageSize) return 0;
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  // --------------------
  // table instance
  // --------------------
  const table = useDataTableInstance({
    data: families,
    columns: familyColumns,
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



  // --------------------
  // render
  // --------------------
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Families / Groups</h2>
          <p className="text-muted-foreground">Manage family groups and their members.</p>
        </div>
        <Link href="/dashboard/families/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </Link>
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
              <DataTable table={table} columns={familyColumns} />
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
