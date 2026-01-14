"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BookingForm, BookingFormValues } from "../_components/booking-form";
import { useCreateBooking } from "../hooks/use-bookings";

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
        companionCustomerIds: values.companionCustomerIds,
        agentId: values.agentId,
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
    } catch (error) {
      // Error is already handled in the mutation's onError
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">New Booking</h2>
      </div>

      <div className="rounded-md border p-6 bg-card">
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
