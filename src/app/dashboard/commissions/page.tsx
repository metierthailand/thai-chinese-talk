"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useCommissionSummary, type CommissionSummary } from "./hooks/use-commissions";
import { CommissionFilter } from "./_components/commission-filter";
import { AccessDenied } from "@/components/page/access-denied";
import { Loading } from "@/components/page/loading";

export default function CommissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Get filters from URL params
  const searchQuery = searchParams.get("search") || "";
  const createdAtFromQuery = searchParams.get("createdAtFrom") || "";
  const createdAtToQuery = searchParams.get("createdAtTo") || "";

  // Fetch commission summary
  const {
    data: commissionSummary,
    isLoading,
    error,
  } = useCommissionSummary(
    searchQuery || undefined,
    createdAtFromQuery || undefined,
    createdAtToQuery || undefined
  );

  // Navigate to detail page
  const handleViewDetails = useCallback(
    (summary: CommissionSummary) => {
      const params = new URLSearchParams();
      if (createdAtFromQuery) params.set("createdAtFrom", createdAtFromQuery);
      if (createdAtToQuery) params.set("createdAtTo", createdAtToQuery);
      params.set("agentName", summary.agentName);

      const qs = params.toString();
      router.push(`/dashboard/commissions/${summary.agentId}${qs ? `?${qs}` : ""}`);
    },
    [createdAtFromQuery, createdAtToQuery, router]
  );

  // Table columns
  const columns: ColumnDef<CommissionSummary>[] = useMemo(
    () => [
      {
        accessorKey: "agentName",
        header: "Sales name",
        cell: ({ row }) => row.original.agentName,
      },
      {
        accessorKey: "totalTrips",
        header: "Total trips",
        cell: ({ row }) => row.original.totalTrips,
      },
      {
        accessorKey: "totalPeople",
        header: "Total people",
        cell: ({ row }) => row.original.totalPeople,
      },
      {
        accessorKey: "totalCommissionAmount",
        header: "Total commission amount",
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.totalCommissionAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            THB
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(row.original)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleViewDetails]
  );

  // Table instance
  const table = useDataTableInstance({
    data: commissionSummary || [],
    columns,
    enableRowSelection: false,
    manualPagination: false,
    defaultPageSize: 10,
    getRowId: (row) => row.agentId,
  });

  const data = commissionSummary || [];
  const total = data.length;
  const pageSize = table.getState().pagination.pageSize;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      table.setPageIndex(newPageIndex);
    },
    [table]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      table.setPageSize(newPageSize);
    },
    [table]
  );

  // Show loading state while checking session
  if (status === "loading") {
    return <Loading />;
  }

  // Show unauthorized message if not ADMIN or SUPER_ADMIN
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return <AccessDenied message="You do not have permission to access this page. Only Administrators can view commissions." />;
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
          <p className="text-muted-foreground">
            View commission summary grouped by sales user
          </p>
        </div>
      </div>

      {/* Filter & Search form */}
      <CommissionFilter />

      <div className="relative flex flex-col gap-4 overflow-auto">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <div className="space-y-8 p-8">
            <div className="flex h-64 items-center justify-center">
              <p className="text-destructive">Failed to load commissions. Please try again.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-md border">
              <DataTable
                table={table}
                columns={columns}
              />
            </div>
            <DataTablePagination
              table={table}
              total={total}
              pageSize={pageSize}
              pageIndex={pageIndex}
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
