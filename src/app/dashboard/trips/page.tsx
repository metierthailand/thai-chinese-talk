"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Eye } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useTrips, type Trip } from "./hooks/use-trips";
import { Loading } from "@/components/page/loading";
import { TripFilter } from "./_components/trip-filter";

export default function TripsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get pagination and search from URL params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const searchQuery = searchParams.get("search") || "";
  const startDateFromQuery = searchParams.get("startDateFrom") || "";
  const startDateToQuery = searchParams.get("startDateTo") || "";

  const columns: ColumnDef<Trip>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => <div className="font-mono font-medium">{row.original.code}</div>,
      },
      {
        accessorKey: "name",
        header: "Trip Name",
        cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.original.type;
          return (
            <Badge variant={type === "GROUP_TOUR" ? "default" : "secondary"}>
              {type === "GROUP_TOUR" ? "Group Tour" : "Private Tour"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "dates",
        header: "Dates",
        cell: ({ row }) => {
          const trip = row.original;
          return (
            <div>
              {format(new Date(trip.startDate), "dd MMM")} - {format(new Date(trip.endDate), "dd MMM yyyy")}
            </div>
          );
        },
      },
      {
        accessorKey: "pax",
        header: "PAX/FOC",
        cell: ({ row }) => {
          const trip = row.original;
          return (
            <div>
              {trip.pax} / {trip.foc}
            </div>
          );
        },
      },
      {
        accessorKey: "airlineAndAirport",
        header: "Airline/Airport",
        cell: ({ row }) => {
          const airlineAndAirport = row.original.airlineAndAirport;
          return airlineAndAirport ? (
            <div>
              <div className="font-mono text-xs">{airlineAndAirport.code}</div>
              <div className="text-muted-foreground text-xs">{airlineAndAirport.name}</div>
            </div>
          ) : (
            "-"
          );
        },
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => {
          const standardPrice = row.original.standardPrice;
          return standardPrice
            ? new Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
              }).format(parseFloat(standardPrice))
            : "-";
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/trips/${row.original.id}`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/trips/${row.original.id}/edit`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  // Use TanStack Query to fetch trips
  const {
    data: tripsResponse,
    isLoading,
    error,
  } = useTrips(page, pageSize, searchQuery || undefined, startDateFromQuery || undefined, startDateToQuery || undefined);

  const trips = useMemo(() => tripsResponse?.data ?? [], [tripsResponse?.data]);
  const total = tripsResponse?.total ?? 0;

  // Calculate page count
  const pageCount = useMemo(() => {
    if (total > 0 && pageSize > 0) {
      return Math.ceil(total / pageSize);
    }
    return 0;
  }, [total, pageSize]);

  const table = useDataTableInstance({
    data: trips,
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
      data: trips,
    }));
  }, [pageCount, trips, table]);

  // Handlers for pagination changes
  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPageIndex + 1 === 1) {
        params.delete("page");
      } else {
        params.set("page", (newPageIndex + 1).toString());
      }
      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/dashboard/trips${newUrl}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPageSize === 10) {
        params.delete("pageSize");
      } else {
        params.set("pageSize", newPageSize.toString());
      }
      params.set("page", "1"); // Reset to page 1 when changing page size
      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/dashboard/trips${newUrl}`, { scroll: false });
    },
    [searchParams, router],
  );

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load trips. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trips</h2>
          <p className="text-muted-foreground">Manage your travel packages and capacity.</p>
        </div>
        <Link href="/dashboard/trips/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      {/* Filter & Search form */}
      <TripFilter />

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
    </div>
  );
}
