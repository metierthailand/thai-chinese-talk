"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BookingForm, BookingFormValues } from "../../_components/booking-form";
import { useBooking, useUpdateBooking } from "../../hooks/use-bookings";
import { Loading } from "@/components/page/loading";

export default function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;

  const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useBooking(bookingId);
  const updateBookingMutation = useUpdateBooking();

  // Format initial data for the form
  const initialData: Partial<BookingFormValues> | undefined = booking
    ? {
        customerId: booking.customerId || "",
        tripId: booking.tripId || "",
        salesUserId: booking.salesUserId || "",
        passportId: booking.passportId || "",
        companionCustomerIds: booking.companionCustomers?.map((c) => c.customer.id) || [],
        note: booking.note || "",
        extraPriceForSingleTraveller: booking.extraPriceForSingleTraveller?.toString() || "",
        roomType: (booking.roomType as "DOUBLE_BED" | "TWIN_BED") || "DOUBLE_BED",
        extraPricePerBed: booking.extraPricePerBed?.toString() || "",
        roomNote: booking.roomNote || "",
        seatType: (booking.seatType as "WINDOW" | "MIDDLE" | "AISLE") ?? "WINDOW",
        seatClass: booking.seatClass ? (booking.seatClass as "FIRST_CLASS" | "BUSINESS_CLASS" | "LONG_LEG") : undefined,
        extraPricePerSeat: booking.extraPricePerSeat?.toString() ?? "",
        seatNote: booking.seatNote ?? "",
        extraPricePerBag: booking.extraPricePerBag?.toString() ?? "",
        bagNote: booking.bagNote ?? "",
        discountPrice: booking.discountPrice?.toString() ?? "",
        discountNote: booking.discountNote ?? "",
        paymentStatus:
          (booking.paymentStatus as "DEPOSIT_PENDING" | "DEPOSIT_PAID" | "FULLY_PAID" | "CANCELLED") ??
          "DEPOSIT_PENDING",
        firstPaymentRatio:
          (booking.firstPaymentRatio as "FIRST_PAYMENT_100" | "FIRST_PAYMENT_50" | "FIRST_PAYMENT_30") ??
          "FIRST_PAYMENT_50",
        firstPaymentAmount: booking.firstPayment?.amount.toString() || "",
      }
    : undefined;

  async function handleSubmit(values: BookingFormValues) {
    try {
      const updateData = {
        customerId: values.customerId,
        tripId: values.tripId,
        salesUserId: values.salesUserId,
        companionCustomerIds: values.companionCustomerIds,
        note: values.note,
        extraPriceForSingleTraveller: values.extraPriceForSingleTraveller
          ? parseFloat(values.extraPriceForSingleTraveller)
          : undefined,
        roomType: values.roomType,
        extraPricePerBed: values.extraPricePerBed ? parseFloat(values.extraPricePerBed) : undefined,
        roomNote: values.roomNote,
        seatType: values.seatType,
        seatClass: values.seatClass,
        extraPricePerSeat: values.extraPricePerSeat ? parseFloat(values.extraPricePerSeat) : undefined,
        seatNote: values.seatNote,
        extraPricePerBag: values.extraPricePerBag ? parseFloat(values.extraPricePerBag) : undefined,
        bagNote: values.bagNote,
        discountPrice: values.discountPrice ? parseFloat(values.discountPrice) : undefined,
        discountNote: values.discountNote,
        paymentStatus: values.paymentStatus,
        firstPaymentRatio: values.firstPaymentRatio,
      };

      await updateBookingMutation.mutateAsync({
        id: bookingId,
        data: updateData,
      });
      router.push("/dashboard/bookings");
      router.refresh();
    } catch (error) {
      // Error is already handled in the mutation's onError
      console.error(error);
    }
  }

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
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Booking</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        {initialData && (
          <BookingForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={updateBookingMutation.isPending}
            booking={booking}
          />
        )}
      </div>
    </div>
  );
}
