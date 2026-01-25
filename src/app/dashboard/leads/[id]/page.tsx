"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLead } from "../hooks/use-leads";
import { LeadForm } from "../_components/lead-form";
import { Loading } from "@/components/page/loading";
import { format } from "date-fns";

// const LEAD_STATUSES = [
//   { value: "INTERESTED", label: "Interested", icon: Circle },
//   { value: "BOOKED", label: "Booked", icon: CheckCircle2 },
//   { value: "COMPLETED", label: "Completed", icon: CheckCircle2 },
//   { value: "CANCELLED", label: "Cancelled", icon: XCircle },
// ] as const;

// const getStatusIndex = (status: string): number => {
//   return LEAD_STATUSES.findIndex((s) => s.value === status);
// };

export default function LeadViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: leadId } = use(params);
  const { data: lead, isLoading, error } = useLead(leadId);

  if (isLoading) {
    return <Loading />;
  }

  if (error || !lead) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load lead.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Lead</h2>
        </div>
      </div>

      {/* Lead Form */}
      <div className="bg-card rounded-md border p-6">
        <LeadForm
          mode="view"
          initialData={lead}
        />
      </div>

      {/* Additional Information */}
      {(lead.createdAt || lead.updatedAt || lead.agent) && (
        <div className="bg-card rounded-md border p-6 space-y-4">
          <h3 className="font-semibold text-xl">Additional Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {lead.agent && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Created by:</span>
                <div className="mt-1">
                  {lead.agent.firstName} {lead.agent.lastName}
                  {lead.agent.email && (
                    <span className="text-muted-foreground ml-2">({lead.agent.email})</span>
                  )}
                </div>
              </div>
            )}
            {lead.createdAt && (
              <div>
                <span className="text-muted-foreground">Created date:</span>
                <div className="mt-1">{format(new Date(lead.createdAt), "dd MMM yyyy HH:mm")}</div>
              </div>
            )}
            {lead.updatedAt && (
              <div>
                <span className="text-muted-foreground">Updated date:</span>
                <div className="mt-1">{format(new Date(lead.updatedAt), "dd MMM yyyy HH:mm")}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Pipeline */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Lead Status</CardTitle>
          <CardDescription>Current progress in the sales pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {LEAD_STATUSES.map((status, index) => {
              const StatusIcon = status.icon;
              const isActive = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const isLast = index === LEAD_STATUSES.length - 1;
              const isCancelled = lead.status === "CANCELLED";

              // Determine colors based on status
              let iconBgColor = "bg-muted text-muted-foreground";
              let lineColor = "bg-muted";

              if (isActive) {
                if (isCurrent) {
                  // Current status
                  if (isCancelled) {
                    iconBgColor = "bg-red-500 text-white";
                  } else {
                    iconBgColor = "bg-primary text-primary-foreground";
                  }
                } else {
                  // Past status - always green (completed)
                  iconBgColor = "bg-green-500 text-white";
                }
              }

              // Line color logic
              if (index < currentStatusIndex) {
                // If the next status is CANCELLED, make the line red
                if (isCancelled && index === currentStatusIndex - 1) {
                  lineColor = "bg-red-500";
                } else {
                  lineColor = "bg-green-500";
                }
              }

              return (
                <div key={status.value} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div className={cn("rounded-full p-3 transition-colors", iconBgColor)}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-center text-xs font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  {!isLast && <div className={cn("mx-2 -mt-8 h-1 flex-1 transition-colors", lineColor)} />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card> */}

    </div>
  );
}
