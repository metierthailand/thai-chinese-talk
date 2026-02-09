"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AirlineAndAirportForm } from "../_components/airline-and-airport-form";
import { AirlineAndAirportFormValues } from "../hooks/use-airline-and-airports";
import { useCreateAirlineAndAirport } from "../hooks/use-airline-and-airports";
import { AccessDenied } from "@/components/page/access-denied";
import { Loading } from "@/components/page/loading";

export default function NewAirlineAndAirportPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const createAirlineAndAirportMutation = useCreateAirlineAndAirport();

  const canCreateOrEdit = session?.user?.role === "SUPER_ADMIN";

  if (sessionStatus === "loading") {
    return <Loading />;
  }

  if (!session || !canCreateOrEdit) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: AirlineAndAirportFormValues) {
    try {
      await createAirlineAndAirportMutation.mutateAsync(values);
      router.push("/dashboard/airline-and-airports");
      router.refresh();
    } catch (error) {
      // Error will be handled by form component's handleSubmit
      throw error;
    }
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
        <AirlineAndAirportForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={createAirlineAndAirportMutation.isPending}
        />
      </div>
    </div>
  );
}
