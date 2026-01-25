"use client";

import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadForm } from "../../_components/lead-form";
import { useLead, useUpdateLead } from "../../hooks/use-leads";
import { Loading } from "@/components/page/loading";

export default function LeadEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: lead, isLoading } = useLead(typeof id === "string" ? id : undefined);
  const updateLeadMutation = useUpdateLead();

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
    if (!id || typeof id !== "string") return;

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

    await updateLeadMutation.mutateAsync({ id, data: payload });
    router.push(`/dashboard/leads`);
    // router.refresh();
  }

  if (isLoading || !lead) {
    return (
      <Loading />
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Lead</h2>
      </div>

      <div className="rounded-md border p-6 bg-card">
        <LeadForm
          mode="edit"
          initialData={lead}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={updateLeadMutation.isPending}
        />
      </div>
    </div>
  );
}


