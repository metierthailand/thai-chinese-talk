"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Eye, Search, X, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useTrips, type Trip } from "./hooks/use-trips";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Loading } from "@/components/page/loading";

export default function TripsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get pagination and search from URL params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const searchQuery = searchParams.get("search") || "";
  const startDateFromQuery = searchParams.get("startDateFrom") || "";
  const startDateToQuery = searchParams.get("startDateTo") || "";

  // Local state for search input
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 500);

  // Ref to prevent flicker when clearing
  const isClearing = useRef(false);

  // Local state for date range filter
  const [startDateFrom, setStartDateFrom] = useState(startDateFromQuery);
  const [startDateTo, setStartDateTo] = useState(startDateToQuery);

  // Function to update URL params
  const updateSearchParams = useCallback(
    (updates: { page?: number; pageSize?: number; search?: string; startDateFrom?: string; startDateTo?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.page !== undefined) {
        if (updates.page === 1) {
          params.delete("page");
        } else {
          params.set("page", updates.page.toString());
        }
      }

      if (updates.pageSize !== undefined) {
        if (updates.pageSize === 10) {
          params.delete("pageSize");
        } else {
          params.set("pageSize", updates.pageSize.toString());
        }
      }

      if (updates.search !== undefined) {
        if (updates.search === "") {
          params.delete("search");
        } else {
          params.set("search", updates.search);
        }
      }

      if (updates.startDateFrom !== undefined) {
        if (!updates.startDateFrom) {
          params.delete("startDateFrom");
        } else {
          params.set("startDateFrom", updates.startDateFrom);
        }
      }

      if (updates.startDateTo !== undefined) {
        if (!updates.startDateTo) {
          params.delete("startDateTo");
        } else {
          params.set("startDateTo", updates.startDateTo);
        }
      }

      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/dashboard/trips${newUrl}`, { scroll: false });
    },
    [searchParams, router],
  );

  // Sync debounced search to URL (skip if clearing)
  useEffect(() => {
    if (isClearing.current) {
      return;
    }
    if (debouncedSearch !== searchQuery) {
      updateSearchParams({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, searchQuery, updateSearchParams]);

  // Sync URL search & filters to inputs (for back/forward)
  useEffect(() => {
    if (!isClearing.current && searchQuery !== searchInput) {
      setSearchInput(searchQuery);
    }
    if (startDateFromQuery !== startDateFrom) {
      setStartDateFrom(startDateFromQuery);
    }
    if (startDateToQuery !== startDateTo) {
      setStartDateTo(startDateToQuery);
    }
    if (isClearing.current && searchQuery === "") {
      isClearing.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, startDateFromQuery, startDateToQuery]);

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
  } = useTrips(page, pageSize, searchQuery || undefined, startDateFrom || undefined, startDateTo || undefined);

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
      updateSearchParams({ page: newPageIndex + 1 });
    },
    [updateSearchParams],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      updateSearchParams({ pageSize: newPageSize, page: 1 }); // Reset to page 1 when changing page size
    },
    [updateSearchParams],
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
            <Plus className="mr-2 h-4 w-4" /> New Trip
          </Button>
        </Link>
      </div>

      {/* Search form */}
      <div className="flex items-center justify-end gap-4">
        {/* Filter: Trip start date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[260px] justify-start text-left font-normal",
                !startDateFrom && !startDateTo && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDateFrom || startDateTo ? (
                <span className="truncate">
                  {startDateFrom ? format(new Date(startDateFrom), "dd MMM yyyy") : "..."} -{" "}
                  {startDateTo ? format(new Date(startDateTo), "dd MMM yyyy") : "..."}
                </span>
              ) : (
                "Trip start date range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              captionLayout="dropdown"
              mode="range"
              numberOfMonths={2}
              selected={{
                from: startDateFrom ? new Date(startDateFrom) : undefined,
                to: startDateTo ? new Date(startDateTo) : undefined,
              }}
              onSelect={(range) => {
                const from = range?.from ? format(range.from, "yyyy-MM-dd") : "";
                const to = range?.to ? format(range.to, "yyyy-MM-dd") : "";
                setStartDateFrom(from);
                setStartDateTo(to);
                updateSearchParams({
                  startDateFrom: from,
                  startDateTo: to,
                  page: 1,
                });
              }}
              fromYear={2000}
              toYear={2100}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="relative w-80">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search trip name..."
            className="pr-9 pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
              onClick={() => {
                isClearing.current = true;
                setSearchInput("");
                updateSearchParams({ search: "", page: 1 });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
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
    </div>
  );
}
