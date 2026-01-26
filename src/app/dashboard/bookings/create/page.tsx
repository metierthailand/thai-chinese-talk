"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BookingForm, BookingFormValues } from "../_components/booking-form";
import { useCreateBooking } from "../hooks/use-bookings";
import { toast } from "sonner";

export default function NewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const createBookingMutation = useCreateBooking();

  async function handleSubmit(values: BookingFormValues) {
    setLoading(true);
    try {
      await createBookingMutation.mutateAsync({
        customerId: values.customerId,
        tripId: values.tripId,
        salesUserId: values.salesUserId,
        passportId: values.passportId,
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
        firstPaymentAmount: parseFloat(values.firstPaymentAmount),
        firstPaymentProof: values.firstPaymentProof,
      });
      router.push("/dashboard/bookings");
      router.refresh();
    } catch {
      toast.error("Created unsuccessfully.");
    } finally {
      setLoading(false);
    }
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
        <BookingForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={loading || createBookingMutation.isPending}
        />
      </div>
    </div>
  );
}
