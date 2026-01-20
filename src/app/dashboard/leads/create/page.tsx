"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LeadForm } from "../_components/lead-form";
import { useCreateLead } from "../hooks/use-leads";
import { toast } from "sonner";

export default function NewLeadPage() {
  const router = useRouter();
  const createLeadMutation = useCreateLead();

  async function handleSubmit(values: {
    newCustomer: boolean;
    customerId?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    lineId?: string;
    salesUserId: string;
    source: string;
    status: string;
    tripInterest: string;
    pax: number;
    leadNote?: string;
    sourceNote?: string;
  }) {
    const payload = {
      newCustomer: values.newCustomer,
      customerId: values.customerId,
      firstName: values.firstName,
      lastName: values.lastName,
      phoneNumber: values.phoneNumber,
      email: values.email,
      lineId: values.lineId,
      salesUserId: values.salesUserId,
      source: values.source,
      status: values.status,
      tripInterest: values.tripInterest,
      pax: values.pax,
      leadNote: values.leadNote,
      sourceNote: values.sourceNote,
    };

    try {
      await createLeadMutation.mutateAsync(payload);
      router.push("/dashboard/leads");
      router.refresh();
    } catch {
      toast.error("Failed to create lead");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Lead</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        <LeadForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={createLeadMutation.isPending}
        />
      </div>
    </div>
  );
}
