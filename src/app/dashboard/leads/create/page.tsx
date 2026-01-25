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
    pax: string | number;
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
      pax: typeof values.pax === "string" ? parseInt(values.pax, 10) || 1 : values.pax || 1,
      leadNote: values.leadNote,
      sourceNote: values.sourceNote,
    };

    try {
      await createLeadMutation.mutateAsync(payload);
      router.push("/dashboard/leads");
      router.refresh();
    } catch (error) {
      // Error will be handled by form component's handleSubmit
      // Only show toast if it's not a field-specific error
      if (error instanceof Error) {
        const fieldError = error as Error & { field?: string; fields?: Array<{ field: string; message: string }> };
        if (!fieldError.field && !fieldError.fields) {
          toast.error("Created unsuccessfully.");
        }
      } else {
        toast.error("Created unsuccessfully.");
      }
      throw error; // Re-throw to let form handle field errors
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
