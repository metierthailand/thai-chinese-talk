"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LeadForm, type LeadFormValues } from "../_components/lead-form";
import { useCreateLead } from "../hooks/use-leads";
import { toast } from "sonner";
import { AccessDenied } from "@/components/page/access-denied";
import { Loading } from "@/components/page/loading";

export default function NewLeadPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const createLeadMutation = useCreateLead();

  const canCreateOrEdit = !!session?.user?.role && ["SUPER_ADMIN", "ADMIN", "SALES"].includes(session.user.role);
  if (sessionStatus === "loading") return <Loading />;
  if (!session || !canCreateOrEdit) return <AccessDenied />;

  async function handleSubmit(values: LeadFormValues) {
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
