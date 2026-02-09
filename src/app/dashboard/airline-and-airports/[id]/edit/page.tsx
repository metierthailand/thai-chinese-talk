"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AirlineAndAirportForm } from "../../_components/airline-and-airport-form";
import { AirlineAndAirportFormValues } from "../../hooks/use-airline-and-airports";
import { useAirlineAndAirport, useUpdateAirlineAndAirport } from "../../hooks/use-airline-and-airports";
import { toast } from "sonner";
import { Loading } from "@/components/page/loading";
import { AccessDenied } from "@/components/page/access-denied";

export default function EditAirlineAndAirportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const resolvedParams = use(params);
  const airlineAndAirportId = resolvedParams.id;

  const { data: airlineAndAirport, isLoading: isLoadingAirlineAndAirport, error: airlineAndAirportError } =
    useAirlineAndAirport(airlineAndAirportId);
  const updateAirlineAndAirportMutation = useUpdateAirlineAndAirport();

  const canCreateOrEdit = session?.user?.role === "SUPER_ADMIN";

  if (sessionStatus === "loading") {
    return <Loading />;
  }

  if (!session || !canCreateOrEdit) {
    return <AccessDenied />;
  }

  // Format initial data for the form
  const initialData: Partial<AirlineAndAirportFormValues> | undefined = airlineAndAirport
    ? {
      code: airlineAndAirport.code || "",
      name: airlineAndAirport.name || "",
    }
    : undefined;

  async function handleSubmit(values: AirlineAndAirportFormValues) {
    try {
      await updateAirlineAndAirportMutation.mutateAsync({
        id: airlineAndAirportId,
        data: values,
      });
      router.push(`/dashboard/airline-and-airports`);
      // router.refresh();
    } catch (error) {
      // Error will be handled by form component's handleSubmit
      throw error;
    }
  }

  if (isLoadingAirlineAndAirport) {
    return <Loading />;
  }

  if (airlineAndAirportError) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="text-destructive">Failed to load IATA Code. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">IATA Code</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        {initialData && (
          <AirlineAndAirportForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={updateAirlineAndAirportMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
