"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Eye, Download } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useTrips, useExportTrips, type Trip } from "./hooks/use-trips";
import { Loading } from "@/components/page/loading";
import { TripFilter } from "./_components/trip-filter";

export default function TripsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get pagination and search from URL params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const searchQuery = searchParams.get("search") || "";
  const selectedDateQuery = searchParams.get("selectedDate") || "";
  const typeQuery = searchParams.get("type") || "ALL";
  const statusQuery = searchParams.get("status") || "ALL";

  const columns: ColumnDef<Trip>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Trip code",
        cell: ({ row }) => <div className="font-mono font-medium">{row.original.code}</div>,
      },
      {
        accessorKey: "name",
        header: "Trip name",
        cell: ({ row }) => <div className="font-medium max-w-40 truncate">{row.original.name}</div>,
      },
      {
        accessorKey: "airlineAndAirport",
        header: "IATA code",
        cell: ({ row }) => <div>{row.original.airlineAndAirport.code}</div>,
      },
      {
        accessorKey: "pax",
        header: "PAX",
        cell: ({ row }) => <div>{row.original.pax}</div>,
      },
      {
        accessorKey: "fox",
        header: "FOC",
        cell: ({ row }) => <div>{row.original.foc}</div>,
      },
      {
        accessorKey: "dates",
        header: "Trip date",
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
        accessorKey: "price",
        header: "Standard price",
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
        accessorKey: "extraPricePerPerson",
        header: "Single price",
        cell: ({ row }) => {
          const extraPricePerPerson = row.original.extraPricePerPerson;
          return extraPricePerPerson
            ? new Intl.NumberFormat("th-TH", {
              style: "currency",
              currency: "THB",
            }).format(parseFloat(extraPricePerPerson))
            : "-";
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <div>{row.original.type === "GROUP_TOUR" ? "Group Tour" : "Private Tour"}</div>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const getStatusColor = (status: string) => {
            switch (status) {
              case "UPCOMING":
                return "bg-blue-500";
              case "SOLD_OUT":
                return "bg-orange-500";
              case "COMPLETED":
                return "bg-green-500";
              case "ON_TRIP":
                return "bg-purple-500";
              case "CANCELLED":
                return "bg-red-500";
              default:
                return "bg-gray-500";
            }
          };
          const getStatusLabel = (status: string) => {
            switch (status) {
              case "UPCOMING":
                return "Upcoming";
              case "SOLD_OUT":
                return "Sold out";
              case "COMPLETED":
                return "Completed";
              case "ON_TRIP":
                return "On trip";
              case "CANCELLED":
                return "Cancelled";
              default:
                return status;
            }
          };
          return (
            <Badge className={getStatusColor(status)}>
              {getStatusLabel(status)}
            </Badge>
          );
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
  } = useTrips(
    page,
    pageSize,
    searchQuery || undefined,
    selectedDateQuery || undefined,
    typeQuery !== "ALL" ? typeQuery : undefined,
    statusQuery !== "ALL" ? statusQuery : undefined
  );

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

  const exportTrips = useExportTrips();
  const handleExport = useCallback(() => {
    exportTrips(
      searchQuery || undefined,
      selectedDateQuery || undefined,
      typeQuery !== "ALL" ? typeQuery : undefined,
      statusQuery !== "ALL" ? statusQuery : undefined,
    );
  }, [exportTrips, searchQuery, selectedDateQuery, typeQuery, statusQuery]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trips</h2>
          <p className="text-muted-foreground">Manage your travel packages and capacity.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Link href="/dashboard/trips/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search form */}
      <TripFilter />

      <div className="relative flex flex-col gap-4 overflow-auto">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <div className="space-y-8 p-8">
            <div className="flex h-64 items-center justify-center">
              <p className="text-destructive">Failed to load trips. Please try again.</p>
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
          </>
        )}
      </div>
    </div>
  );
}
