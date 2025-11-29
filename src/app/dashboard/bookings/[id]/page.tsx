"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import { BookingForm, BookingFormValues } from "../_components/booking-form";
import { useBooking } from "../hooks/use-bookings";

export default function ViewBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;

  const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useBooking(bookingId);

  // Format initial data for the form
  const initialData: Partial<BookingFormValues> | undefined = booking
    ? {
        customerId: booking.customerId || "",
        tripId: booking.tripId || "",
        totalAmount: booking.totalAmount.toString(),
        paidAmount: booking.paidAmount.toString(),
        status: booking.status || "PENDING",
        visaStatus: booking.visaStatus || "NOT_REQUIRED",
      }
    : undefined;

  if (isLoadingBooking) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading booking data...</p>
        </div>
      </div>
    );
  }

  if (bookingError) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load booking. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Booking Details</h2>
        </div>
        <Link href={`/dashboard/bookings/${bookingId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> Edit Booking
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card p-6">
        {initialData && (
          <BookingForm
            mode="view"
            initialData={initialData}
            booking={booking}
          />
        )}
      </div>
    </div>
  );
}

