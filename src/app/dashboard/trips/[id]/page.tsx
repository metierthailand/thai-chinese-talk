"use client";

import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users } from "lucide-react";
import { useTrip } from "../hooks/use-trips";
import { TripForm } from "../_components/trip-form";
import { useBookings, type Booking } from "@/app/dashboard/bookings/hooks/use-bookings";
import { formatDecimal } from "@/lib/utils";
import { format } from "date-fns";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useMemo, useCallback, useEffect } from "react";
import { Loading } from "@/components/page/loading";
import { getPaymentStatusVariant, PAYMENT_STATUS_LABELS } from "@/lib/constants/payment";
import { PaymentStatus } from "@prisma/client";

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id: tripId } = use(params);
  const { data: trip, isLoading: initialLoading } = useTrip(tripId);

  // Pagination state
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  // Fetch bookings for this trip
  const { data: bookingsResponse, isLoading: bookingsLoading } = useBookings(
    page,
    pageSize,
    undefined, // search
    undefined, // status
    undefined, // visaStatus
    undefined, // tripStartDateFrom
    undefined, // tripStartDateTo
    tripId, // tripId filter
  );

  const bookings = useMemo(() => bookingsResponse?.data ?? [], [bookingsResponse?.data]);
  const total = bookingsResponse?.total ?? 0;
  const totalPages = bookingsResponse?.totalPages ?? 0;

  const updateSearchParams = useCallback(
    (updates: { page?: number; pageSize?: number }) => {
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
        params.set("page", "1"); // Reset to page 1 when changing page size
      }
      router.push(`/dashboard/trips/${tripId}?${params.toString()}`);
    },
    [router, searchParams, tripId],
  );

  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      updateSearchParams({ page: newPageIndex + 1 });
    },
    [updateSearchParams],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      updateSearchParams({ pageSize: newPageSize, page: 1 });
    },
    [updateSearchParams],
  );

  // Define columns for bookings table
  const columns: ColumnDef<Booking>[] = useMemo(
    () => [
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {`${row.original.customer.firstNameTh} ${row.original.customer.lastNameTh}`}
            </div>
            <div className="text-muted-foreground text-sm">{row.original.customer.email}</div>
          </div>
        ),
      },
      {
        accessorKey: "paymentStatus",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={getPaymentStatusVariant(row.original.paymentStatus)}>
            {PAYMENT_STATUS_LABELS[row.original.paymentStatus as PaymentStatus]}
          </Badge>),
      },
      {
        id: "remaining",
        header: "Remaining",
        cell: ({ row }) => {
          const remaining =
            Number(row.original.payments?.reduce((acc, curr) => acc + curr.amount, 0) ?? 0) -
            Number(row.original.payments?.reduce((acc, curr) => acc + curr.amount, 0) ?? 0);
          return remaining > 0 ? (
            <span className="font-medium text-orange-600">{formatDecimal(remaining)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Booked On",
        cell: ({ row }) => format(new Date(row.original.createdAt), "PPp"),
      },
    ],
    [],
  );

  const table = useDataTableInstance({
    data: bookings,
    columns,
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
      pageCount: totalPages,
      data: bookings,
    }));
  }, [totalPages, bookings, table]);

  if (initialLoading) {
    return <Loading />;
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Trip not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Trip</h2>
        </div>
        {/* <Link href={`/dashboard/trips/${tripId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> Edit Trip
          </Button>
        </Link> */}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Trip Information</CardTitle>
          </CardHeader>
          <CardContent>
            <TripForm
              mode="view"
              initialData={{
                type: trip.type,
                code: trip.code,
                name: trip.name,
                startDate: format(new Date(trip.startDate), "yyyy-MM-dd"),
                endDate: format(new Date(trip.endDate), "yyyy-MM-dd"),
                pax: trip.pax.toString(),
                foc: trip.foc.toString(),
                tl: trip.tl || "",
                tg: trip.tg || "",
                staff: trip.staff || "",
                standardPrice: trip.standardPrice || "0",
                extraPricePerPerson: trip.extraPricePerPerson || "0",
                note: trip.note || "",
                airlineAndAirportId: trip.airlineAndAirportId,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bookings ({total})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-muted-foreground">Loading bookings...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <DataTable
                  table={table}
                  columns={columns}
                  onRowClick={(row) => router.push(`/dashboard/bookings/${row.id}`)}
                />
                <DataTablePagination
                  table={table}
                  total={total}
                  pageSize={pageSize}
                  pageIndex={page - 1}
                  pageCount={totalPages}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {(trip.createdAt || trip.updatedAt) && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {trip.createdAt && (
                  <div>
                    <span className="text-muted-foreground">Created date:</span>
                    <div className="mt-1">{format(new Date(trip.createdAt), "dd MMM yyyy HH:mm")}</div>
                  </div>
                )}
                {trip.updatedAt && (
                  <div>
                    <span className="text-muted-foreground">Updated date:</span>
                    <div className="mt-1">{format(new Date(trip.updatedAt), "dd MMM yyyy HH:mm")}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
