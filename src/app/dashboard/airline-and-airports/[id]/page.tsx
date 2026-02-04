"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAirlineAndAirport } from "@/app/dashboard/airline-and-airports/hooks/use-airline-and-airports";
import { AirlineAndAirportForm } from "../_components/airline-and-airport-form";
import { Loading } from "@/components/page/loading";
import { format } from "date-fns";

export default function AirlineAndAirportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: airlineAndAirportId } = use(params);
  const { data: airlineAndAirport, isLoading: isLoadingAirlineAndAirport, error: airlineAndAirportError } = useAirlineAndAirport(airlineAndAirportId);

  if (isLoadingAirlineAndAirport) {
    return <Loading />;
  }

  if (airlineAndAirportError || !airlineAndAirport) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">IATA code not found</p>
        </div>
      </div>
    );
  }

  const initialData = {
    code: airlineAndAirport.code || "",
    name: airlineAndAirport.name || "",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">IATA Code</h2>
        </div>
        {/* <Link href={`/dashboard/airline-and-airports/${airlineAndAirportId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> Edit IATA Code
          </Button>
        </Link> */}
      </div>

      <div className="bg-card rounded-md border p-6">
        <AirlineAndAirportForm
          mode="view"
          initialData={initialData}
        />
      </div>

      {airlineAndAirport._count && (
        <div className="bg-card rounded-md border p-6 space-y-4">
          <h3 className="font-semibold text-xl">Additional Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2">
              <span className="text-muted-foreground">Used in trips:</span>
              <div className="mt-1">
                {airlineAndAirport._count.trips} {airlineAndAirport._count.trips === 1 ? "trip" : "trips"}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Created date:</span>
              <div className="mt-1">{format(new Date(airlineAndAirport.createdAt), "dd MMM yyyy hh:mm a")}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Updated date:</span>
              <div className="mt-1">{format(new Date(airlineAndAirport.updatedAt), "dd MMM yyyy hh:mm a")}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
