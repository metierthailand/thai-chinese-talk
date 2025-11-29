"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Eye, Search, X, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useBookings, type Booking } from "./hooks/use-bookings";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get pagination and search from URL params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const searchQuery = searchParams.get("search") || "";
  const statusQuery = searchParams.get("status") || "";
  const visaStatusQuery = searchParams.get("visaStatus") || "";
  const tripStartDateFromQuery = searchParams.get("tripStartDateFrom") || "";
  const tripStartDateToQuery = searchParams.get("tripStartDateTo") || "";

  // Local state for search input (for controlled input)
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Debounce search input to avoid too many API calls
  const debouncedSearch = useDebounce(searchInput, 500);

  // Ref to track if we're manually clearing (to prevent race condition)
  const isClearing = useRef(false);

  // Local state for filters
  const [status, setStatus] = useState(statusQuery || "ALL");
  const [visaStatus, setVisaStatus] = useState(visaStatusQuery || "ALL");
  const [tripStartDateFrom, setTripStartDateFrom] = useState(tripStartDateFromQuery);
  const [tripStartDateTo, setTripStartDateTo] = useState(tripStartDateToQuery);

  // Function to update URL params
  const updateSearchParams = useCallback(
    (updates: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      visaStatus?: string;
      tripStartDateFrom?: string;
      tripStartDateTo?: string;
    }) => {
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

      if (updates.status !== undefined) {
        if (updates.status === "ALL" || updates.status === "") {
          params.delete("status");
        } else {
          params.set("status", updates.status);
        }
      }

      if (updates.visaStatus !== undefined) {
        if (updates.visaStatus === "ALL" || updates.visaStatus === "") {
          params.delete("visaStatus");
        } else {
          params.set("visaStatus", updates.visaStatus);
        }
      }

      if (updates.tripStartDateFrom !== undefined) {
        if (!updates.tripStartDateFrom) {
          params.delete("tripStartDateFrom");
        } else {
          params.set("tripStartDateFrom", updates.tripStartDateFrom);
        }
      }

      if (updates.tripStartDateTo !== undefined) {
        if (!updates.tripStartDateTo) {
          params.delete("tripStartDateTo");
        } else {
          params.set("tripStartDateTo", updates.tripStartDateTo);
        }
      }

      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/dashboard/bookings${newUrl}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Sync debounced search to URL (skip if we're clearing)
  useEffect(() => {
    if (isClearing.current) {
      return;
    }
    if (debouncedSearch !== searchQuery) {
      updateSearchParams({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, searchQuery, updateSearchParams]);

  // Sync URL search & filters to inputs (for browser back/forward)
  useEffect(() => {
    if (!isClearing.current && searchQuery !== searchInput) {
      setSearchInput(searchQuery);
    }
    if (statusQuery !== status) {
      setStatus(statusQuery || "ALL");
    }
    if (visaStatusQuery !== visaStatus) {
      setVisaStatus(visaStatusQuery || "ALL");
    }
    if (tripStartDateFromQuery !== tripStartDateFrom) {
      setTripStartDateFrom(tripStartDateFromQuery);
    }
    if (tripStartDateToQuery !== tripStartDateTo) {
      setTripStartDateTo(tripStartDateToQuery);
    }
    if (isClearing.current && searchQuery === "") {
      isClearing.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusQuery, visaStatusQuery, tripStartDateFromQuery, tripStartDateToQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-500";
      case "PENDING":
        return "bg-yellow-500";
      case "CANCELLED":
        return "bg-red-500";
      case "COMPLETED":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getVisaStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "REJECTED":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const columns: ColumnDef<Booking>[] = useMemo(
    () => [
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div className="font-medium">
            {`${row.original.customer.firstNameTh} ${row.original.customer.lastNameTh}`}
          </div>
        ),
      },
      {
        accessorKey: "trip",
        header: "Trip",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.trip.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.trip.destination}</span>
          </div>
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => format(new Date(row.original.trip.startDate), "dd MMM yyyy"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={getStatusColor(row.original.status)}>{row.original.status}</Badge>
        ),
      },
      {
        accessorKey: "visaStatus",
        header: "Visa",
        cell: ({ row }) => (
          <Badge variant="outline" className={getVisaStatusColor(row.original.visaStatus)}>
            {row.original.visaStatus.replace("_", " ")}
          </Badge>
        ),
      },
      {
        accessorKey: "payment",
        header: "Payment",
        cell: ({ row }) => (
          <div className="flex flex-col text-sm">
            <span>Total: {row.original.totalAmount.toLocaleString()}</span>
            <span
              className={
                row.original.paidAmount >= row.original.totalAmount
                  ? "text-green-600"
                  : "text-yellow-600"
              }
            >
              Paid: {row.original.paidAmount.toLocaleString()}
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/bookings/${row.original.id}`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/bookings/${row.original.id}/edit`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  // Use TanStack Query to fetch bookings
  const { data: bookingsResponse, isLoading, error } = useBookings(
    page,
    pageSize,
    searchQuery || undefined,
    status !== "ALL" ? status : undefined,
    visaStatus !== "ALL" ? visaStatus : undefined,
    tripStartDateFrom || undefined,
    tripStartDateTo || undefined
  );

  const bookings = useMemo(() => bookingsResponse?.data ?? [], [bookingsResponse?.data]);
  const total = bookingsResponse?.total ?? 0;

  // Calculate page count
  const pageCount = useMemo(() => {
    if (total > 0 && pageSize > 0) {
      return Math.ceil(total / pageSize);
    }
    return 0;
  }, [total, pageSize]);

  const table = useDataTableInstance({
    data: bookings,
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
      data: bookings,
    }));
  }, [pageCount, bookings, table]);

  // Handlers for pagination changes
  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      updateSearchParams({ page: newPageIndex + 1 });
    },
    [updateSearchParams]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      updateSearchParams({ pageSize: newPageSize, page: 1 }); // Reset to page 1 when changing page size
    },
    [updateSearchParams]
  );

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load bookings. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">Manage trip bookings and visa statuses.</p>
        </div>
        <Link href="/dashboard/bookings/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </Button>
        </Link>
      </div>

      {/* Search form */}
      <div className="flex items-center justify-end gap-4">
        {/* Filter: Status */}
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            updateSearchParams({ status: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: Visa Status */}
        <Select
          value={visaStatus}
          onValueChange={(value) => {
            setVisaStatus(value);
            updateSearchParams({ visaStatus: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter visa status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Visa Status</SelectItem>
            <SelectItem value="NOT_REQUIRED">Not Required</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: Trip start date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[260px] justify-start text-left font-normal",
                !tripStartDateFrom && !tripStartDateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {tripStartDateFrom || tripStartDateTo ? (
                <span className="truncate">
                  {tripStartDateFrom
                    ? format(new Date(tripStartDateFrom), "dd MMM yyyy")
                    : "..."}{" "}
                  -{" "}
                  {tripStartDateTo
                    ? format(new Date(tripStartDateTo), "dd MMM yyyy")
                    : "..."}
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
                from: tripStartDateFrom ? new Date(tripStartDateFrom) : undefined,
                to: tripStartDateTo ? new Date(tripStartDateTo) : undefined,
              }}
              onSelect={(range) => {
                const from = range?.from
                  ? format(range.from, "yyyy-MM-dd")
                  : "";
                const to = range?.to
                  ? format(range.to, "yyyy-MM-dd")
                  : "";
                setTripStartDateFrom(from);
                setTripStartDateTo(to);
                updateSearchParams({
                  tripStartDateFrom: from,
                  tripStartDateTo: to,
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search customer name (TH/EN)..."
            className="pl-9 pr-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
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
          <DataTable
            table={table}
            columns={columns}
            // onRowClick={(row) => router.push(`/dashboard/bookings/${row.id}`)}
          />
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
