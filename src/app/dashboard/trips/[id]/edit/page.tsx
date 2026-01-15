"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTrip, useUpdateTrip, type TripFormValues } from "../../hooks/use-trips";
import { TripForm } from "../../_components/trip-form";
import { Loading } from "@/components/page/loading";

export default function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: tripId } = use(params);
  const { data: trip, isLoading: initialLoading } = useTrip(tripId);
  const updateTripMutation = useUpdateTrip();

  async function handleSubmit(values: TripFormValues) {
    if (!tripId) return;

    try {
      await updateTripMutation.mutateAsync({
        id: tripId,
        data: values,
      });
      router.push("/dashboard/trips");
      router.refresh();
    } catch (error) {
      // Error will be handled by form component's handleSubmit
      throw error;
    }
  }

  if (initialLoading) {
    return <Loading />;
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Trip not found</p>
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
        <h2 className="text-3xl font-bold tracking-tight">Edit Trip Package</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        <TripForm
          mode="edit"
          initialData={{
            type: trip.type,
            code: trip.code,
            name: trip.name,
            startDate: trip.startDate.split("T")[0],
            endDate: trip.endDate.split("T")[0],
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
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={updateTripMutation.isPending}
        />
      </div>
    </div>
  );
}
