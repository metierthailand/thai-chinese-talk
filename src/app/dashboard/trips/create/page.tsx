"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useCreateTrip, type TripFormValues } from "../hooks/use-trips";
import { TripForm } from "../_components/trip-form";
import { AccessDenied } from "@/components/page/access-denied";
import { Loading } from "@/components/page/loading";

export default function NewTripPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const createTripMutation = useCreateTrip();

  const canCreateOrEdit = session?.user?.role === "SUPER_ADMIN";
  if (sessionStatus === "loading") return <Loading />;
  if (!session || !canCreateOrEdit) return <AccessDenied />;

  async function handleSubmit(values: TripFormValues) {
    try {
      await createTripMutation.mutateAsync(values);
      router.push("/dashboard/trips");
      router.refresh();
    } catch (error) {
      // Error will be handled by form component's handleSubmit
      throw error;
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Trip</h2>
      </div>

      <div className="rounded-md border p-6 bg-card">
        <TripForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={createTripMutation.isPending}
        />
      </div>
    </div>
  );
}
