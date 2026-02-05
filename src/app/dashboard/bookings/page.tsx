"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Eye, Download } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useBookings, useExportBookings, type Booking } from "./hooks/use-bookings";
import { Loading } from "@/components/page/loading";
import { BookingFilter } from "./_components/booking-filter";
import { getPaymentStatusVariant, PAYMENT_STATUS_LABELS } from "@/lib/constants/payment";
import { PaymentStatus } from "@prisma/client";
import { Checkbox } from "@/components/ui/checkbox";

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
  const tripIdQuery = searchParams.get("tripId") || "";

  const paymentStatus = statusQuery || "ALL";

  const [selectedIds, setSelectedIds] = useState<string[]>([]);


  // Calculate total amount and paid amount from booking data
  const calculateBookingAmounts = (booking: Booking) => {
    const basePrice = booking.trip?.standardPrice || 0;
    const extraSingle = booking.extraPriceForSingleTraveller || 0;
    const extraBedPrice = booking.extraPricePerBed || 0;
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
    tripIdQuery || undefined,
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

  const effectiveSelectedIds = useMemo(
    () => selectedIds,
    [selectedIds],
  );

  const columns: ColumnDef<Booking>[] = useMemo(
    () => [
      {
        id: "select",
        header: () => {
          const allIds = bookings.map((b) => b.id);
          const allSelected = effectiveSelectedIds.length > 0 && effectiveSelectedIds.length === allIds.length;
          return (
            <Checkbox
              checked={allSelected}
              aria-label="Select all bookings on this page"
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedIds(allIds);
                } else {
                  setSelectedIds([]);
                }
              }}
            />
          );
        },
        cell: ({ row }) => {
          const id = row.original.id;
          const checked = effectiveSelectedIds.includes(id);
          return (
            <Checkbox
              checked={checked}
              aria-label="Select booking"
              onCheckedChange={(checked) => {
                setSelectedIds((prev) =>
                  checked ? [...prev, id] : prev.filter((existingId) => existingId !== id),
                );
              }}
            />
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "trip",
        header: "Trip code",
        cell: ({ row }) => <div className="font-mono font-medium w-[100px] truncate">{row.original.trip.code}</div>,
      },
      {
        accessorKey: "customer",
        header: "Customer name",
        cell: ({ row }) => (
          <div className="font-medium w-[180px] truncate">
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
          <Badge variant={getPaymentStatusVariant(row.original.paymentStatus)}>
            {PAYMENT_STATUS_LABELS[row.original.paymentStatus as PaymentStatus]}
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
    [bookings, effectiveSelectedIds],
  );

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

  // Keep table pagination state in sync with URL page & pageSize
  useEffect(() => {
    table.setPageSize(pageSize);
    table.setPageIndex(page - 1);
  }, [pageSize, page, table]);

  // Handlers for pagination changes
  const handlePageChange = (newPageIndex: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPageIndex + 1 === 1) {
      params.delete("page");
    } else {
      params.set("page", (newPageIndex + 1).toString());
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.push(`/dashboard/bookings${newUrl}`, { scroll: false });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPageSize === 10) {
      params.delete("pageSize");
    } else {
      params.set("pageSize", newPageSize.toString());
    }
    params.set("page", "1"); // Reset to page 1 when changing page size
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.push(`/dashboard/bookings${newUrl}`, { scroll: false });
  };

  const exportBookings = useExportBookings();
  const handleExportCSV = () => {
    if (!bookings.length) return;
    if (effectiveSelectedIds.length === 0 || effectiveSelectedIds.length === bookings.length) {
      exportBookings(
        searchQuery || undefined,
        paymentStatus !== "ALL" ? paymentStatus : undefined,
        tripStartDateFromQuery || undefined,
        tripStartDateToQuery || undefined,
        tripIdQuery || undefined,
      );
      return;
    }
    exportBookings(
      searchQuery || undefined,
      paymentStatus !== "ALL" ? paymentStatus : undefined,
      tripStartDateFromQuery || undefined,
      tripStartDateToQuery || undefined,
      tripIdQuery || undefined,
      effectiveSelectedIds,
    );
  };

  const handleExportPDF = () => {
    const params = new URLSearchParams();
    if (effectiveSelectedIds.length > 0 && effectiveSelectedIds.length < bookings.length) {
      params.set("bookingIds", effectiveSelectedIds.join(","));
    } else {
      if (searchQuery) params.set("search", searchQuery);
      if (paymentStatus !== "ALL") params.set("status", paymentStatus);
      if (tripStartDateFromQuery) params.set("tripStartDateFrom", tripStartDateFromQuery);
      if (tripStartDateToQuery) params.set("tripStartDateTo", tripStartDateToQuery);
      if (tripIdQuery) params.set("tripId", tripIdQuery);
    }
    const url = `/api/bookings/export-pdf?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">Create and update trip bookings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />{" "}
            {effectiveSelectedIds.length > 0
              ? `Export PDF (${effectiveSelectedIds.length})`
              : "Export PDF"}
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />{" "}
            {effectiveSelectedIds.length > 0
              ? `Export CSV (${effectiveSelectedIds.length})`
              : "Export CSV"}
          </Button>
          <Link href="/dashboard/bookings/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create
            </Button>
          </Link>
        </div>
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
