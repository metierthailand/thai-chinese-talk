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
import { useBookings, type Booking } from "./hooks/use-bookings";
import { Loading } from "@/components/page/loading";
import { BookingFilter } from "./_components/booking-filter";

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get pagination and search from URL params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const searchQuery = searchParams.get("search") || "";
  const statusQuery = searchParams.get("status") || "";
  const tripStartDateFromQuery = searchParams.get("tripStartDateFrom") || "";
  const tripStartDateToQuery = searchParams.get("tripStartDateTo") || "";

  const paymentStatus = statusQuery || "ALL";

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "FULLY_PAID":
        return "bg-green-500";
      case "DEPOSIT_PAID":
        return "bg-blue-500";
      case "DEPOSIT_PENDING":
        return "bg-yellow-500";
      case "CANCELLED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Calculate total amount and paid amount from booking data
  const calculateBookingAmounts = (booking: Booking) => {
    const basePrice = booking.trip?.standardPrice || 0;
    const extraSingle = booking.extraPriceForSingleTraveller || 0;
    const extraBedPrice = booking.extraBed && booking.extraPricePerBed ? booking.extraPricePerBed : 0;
    const extraSeatPrice = booking.extraPricePerSeat || 0;
    const extraBagPrice = booking.extraPricePerBag || 0;
    const discount = booking.discountPrice || 0;
    const totalAmount = basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

    const firstAmount = booking.firstPayment?.amount || 0;
    const secondAmount = booking.secondPayment?.amount || 0;
    const thirdAmount = booking.thirdPayment?.amount || 0;
    const paidAmount = firstAmount + secondAmount + thirdAmount;

    return { totalAmount, paidAmount };
  };

  const columns: ColumnDef<Booking>[] = useMemo(
    () => [
      {
        accessorKey: "trip",
        header: "Trip code",
        cell: ({ row }) => <div className="font-mono font-medium">{row.original.trip.code}</div>,
      },
      {
        accessorKey: "customer",
        header: "Customer name",
        cell: ({ row }) => (
          <div className="font-medium">
            {`${row.original.customer.firstNameEn} ${row.original.customer.lastNameEn}`}
          </div>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Total amount",
        cell: ({ row }) => (
          <div className="font-medium">
            {new Intl.NumberFormat("th-TH", {
              style: "currency",
              currency: "THB",
            }).format(calculateBookingAmounts(row.original)?.totalAmount ?? 0)}
          </div>
        ),
      },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ row }) => {
          const { totalAmount, paidAmount } = calculateBookingAmounts(row.original);
          return (
            <div className="font-medium">
              {new Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
              }).format(totalAmount - paidAmount)}
            </div>
          );
        },
      },
      {
        accessorKey: "salesUser",
        header: "Sales name",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.salesUser ? `${row.original.salesUser.firstName} ${row.original.salesUser.lastName}` : "-"}
          </div>
        ),
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment status",
        cell: ({ row }) => (
          <Badge className={getPaymentStatusColor(row.original.paymentStatus)}>
            {row.original.paymentStatus.replace(/_/g, " ")}
          </Badge>
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
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  // Use TanStack Query to fetch bookings
  const {
    data: bookingsResponse,
    isLoading,
    error,
  } = useBookings(
    page,
    pageSize,
    searchQuery || undefined,
    paymentStatus !== "ALL" ? paymentStatus : undefined,
    undefined, // visaStatus removed
    tripStartDateFromQuery || undefined,
    tripStartDateToQuery || undefined,
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
      const params = new URLSearchParams(searchParams.toString());
      if (newPageIndex + 1 === 1) {
        params.delete("page");
      } else {
        params.set("page", (newPageIndex + 1).toString());
      }
      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/dashboard/bookings${newUrl}`, { scroll: false });
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
      router.push(`/dashboard/bookings${newUrl}`, { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">Manage trip bookings and visa statuses.</p>
        </div>
        <Link href="/dashboard/bookings/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      {/* Filter & Search form */}
      <BookingFilter />

      <div className="relative flex flex-col gap-4 overflow-auto">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <div className="space-y-8 p-8">
            <div className="flex h-64 items-center justify-center">
              <p className="text-destructive">Failed to load bookings. Please try again.</p>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
