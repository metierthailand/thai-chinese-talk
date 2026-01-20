"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useCommissionSummary, type CommissionSummary } from "./hooks/use-commissions";
import { useDebounce } from "@/hooks/use-debounce";
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

  // Local state for search input (for controlled input)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 500);

  // Local state for filters
  const [createdAtFrom, setCreatedAtFrom] = useState(createdAtFromQuery);
  const [createdAtTo, setCreatedAtTo] = useState(createdAtToQuery);

  // Function to update URL params
  const updateSearchParams = useCallback(
    (updates: {
      search?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.search !== undefined) {
        if (updates.search === "") {
          params.delete("search");
        } else {
          params.set("search", updates.search);
        }
      }

      if (updates.createdAtFrom !== undefined) {
        if (!updates.createdAtFrom) {
          params.delete("createdAtFrom");
        } else {
          params.set("createdAtFrom", updates.createdAtFrom);
        }
      }

      if (updates.createdAtTo !== undefined) {
        if (!updates.createdAtTo) {
          params.delete("createdAtTo");
        } else {
          params.set("createdAtTo", updates.createdAtTo);
        }
      }

      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/dashboard/commissions${newUrl}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Sync debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      updateSearchParams({ search: debouncedSearch });
    }
  }, [debouncedSearch, searchQuery, updateSearchParams]);

  // Sync URL filters to inputs (for browser back/forward)
  useEffect(() => {
    if (searchQuery !== searchInput) {
      setSearchInput(searchQuery);
    }
    if (createdAtFromQuery !== createdAtFrom) {
      setCreatedAtFrom(createdAtFromQuery);
    }
    if (createdAtToQuery !== createdAtTo) {
      setCreatedAtTo(createdAtToQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, createdAtFromQuery, createdAtToQuery]);

  // Fetch commission summary
  const {
    data: commissionSummary,
    isLoading,
    error,
  } = useCommissionSummary(
    debouncedSearch || undefined,
    createdAtFrom || undefined,
    createdAtTo || undefined
  );

  // Navigate to detail page
  const handleViewDetails = useCallback(
    (summary: CommissionSummary) => {
      const params = new URLSearchParams();
      if (createdAtFrom) params.set("createdAtFrom", createdAtFrom);
      if (createdAtTo) params.set("createdAtTo", createdAtTo);
      params.set("agentName", summary.agentName);

      const qs = params.toString();
      router.push(`/dashboard/commissions/${summary.agentId}${qs ? `?${qs}` : ""}`);
    },
    [createdAtFrom, createdAtTo, router]
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

  // Show loading state while checking session
  if (status === "loading") {
    return <Loading />;
  }

  // Show unauthorized message if not ADMIN or SUPER_ADMIN
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return <AccessDenied message="You do not have permission to access this page. Only Administrators can view commissions." />;
  }

  // Show loading state
  if (isLoading) {
    return <Loading />;
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load commissions. Please try again.</p>
        </div>
      </div>
    );
  }

  const data = commissionSummary || [];
  const pageSize = table.getState().pagination.pageSize;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
          <p className="text-muted-foreground mt-2">
            View commission summary grouped by sales user
          </p>
        </div>
      </div>

      {/* Filters */}
      <CommissionFilter
        search={searchInput}
        onSearchChange={setSearchInput}
        createdAtFrom={createdAtFrom}
        createdAtTo={createdAtTo}
        onCreatedAtFromChange={(value) => {
          setCreatedAtFrom(value);
          updateSearchParams({ createdAtFrom: value });
        }}
        onCreatedAtToChange={(value) => {
          setCreatedAtTo(value);
          updateSearchParams({ createdAtTo: value });
        }}
        onDateRangeChange={(from, to) => {
          setCreatedAtFrom(from);
          setCreatedAtTo(to);
          updateSearchParams({ createdAtFrom: from, createdAtTo: to });
        }}
      />

      {/* Table */}
      <div className="rounded-md border">
        <DataTable
          table={table}
          columns={columns}
        />
      </div>

      {/* Pagination */}
      {pageCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, data.length)} of{" "}
            {data.length} results
          </div>
          <DataTablePagination table={table} />
        </div>
      )}

      {/* Detail Dialog removed: navigation to /dashboard/commissions/[agentId] */}
    </div>
  );
}
