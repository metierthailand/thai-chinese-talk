"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BookingForm, BookingFormValues } from "../_components/booking-form";
import { useBooking } from "../hooks/use-bookings";
import { Loading } from "@/components/page/loading";
import { format } from "date-fns";

export default function ViewBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;

  const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useBooking(bookingId);

  // Format initial data for the form
  const initialData: Partial<BookingFormValues> | undefined = booking
    ? {
      customerId: booking.customerId || "",
      tripId: booking.tripId || "",
      salesUserId: booking.salesUserId || "",
      companionCustomerIds: booking.companionCustomers?.map((c) => c.id) || [],
      note: booking.note || "",
      extraPriceForSingleTraveller: booking.extraPriceForSingleTraveller?.toString() || "",
      roomType: (booking.roomType as "DOUBLE_BED" | "TWIN_BED") || "DOUBLE_BED",
      extraPricePerBed: booking.extraPricePerBed?.toString() || "0",
      roomNote: booking.roomNote || "",
      seatType: (booking.seatType as "WINDOW" | "MIDDLE" | "AISLE") ?? "WINDOW",
      seatClass: booking.seatClass ? (booking.seatClass as "FIRST_CLASS" | "BUSINESS_CLASS" | "LONG_LEG") : undefined,
      extraPricePerSeat: booking.extraPricePerSeat?.toString() ?? "",
      seatNote: booking.seatNote || "",
      extraPricePerBag: booking.extraPricePerBag?.toString() || "",
      bagNote: booking.bagNote || "",
      discountPrice: booking.discountPrice?.toString() || "",
      discountNote: booking.discountNote || "",
      paymentStatus:
        (booking.paymentStatus as "DEPOSIT_PENDING" | "DEPOSIT_PAID" | "FULLY_PAID" | "CANCELLED") ??
        "DEPOSIT_PENDING",
      firstPaymentRatio:
        (booking.firstPaymentRatio as "FIRST_PAYMENT_100" | "FIRST_PAYMENT_50" | "FIRST_PAYMENT_30") ??
        "FIRST_PAYMENT_50",
      firstPaymentAmount: booking.firstPayment?.amount.toString() || "",
      firstPaymentProof:
        booking.firstPaymentId && booking.payments
          ? (booking.payments.find((p) => p.id === booking.firstPaymentId)?.proofOfPayment ?? undefined)
          : undefined,
    }
    : undefined;

  if (isLoadingBooking) {
    return <Loading />;
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
          <h2 className="text-3xl font-bold tracking-tight">Booking</h2>
        </div>
        {/* <Link href={`/dashboard/bookings/${bookingId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> Edit Booking
          </Button>
        </Link> */}
      </div>

      <div className="bg-card rounded-md border p-6">
        {initialData && <BookingForm mode="view" initialData={initialData} booking={booking} />}
      </div>

      {/* Additional Information */}
      {booking && (booking.createdAt || booking.updatedAt || booking.agent) && (
        <div className="bg-card rounded-md border p-6 space-y-4">
          <h3 className="font-semibold text-xl">Additional Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {booking.agent && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Created by:</span>
                <div className="mt-1">
                  {booking.agent.firstName} {booking.agent.lastName}
                  {booking.agent.email && (
                    <span className="text-muted-foreground ml-2">({booking.agent.email})</span>
                  )}
                </div>
              </div>
            )}
            {booking.createdAt && (
              <div>
                <span className="text-muted-foreground">Created date:</span>
                <div className="mt-1">{format(new Date(booking.createdAt), "dd MMM yyyy HH:mm")}</div>
              </div>
            )}
            {booking.updatedAt && (
              <div>
                <span className="text-muted-foreground">Updated date:</span>
                <div className="mt-1">{format(new Date(booking.updatedAt), "dd MMM yyyy HH:mm")}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
