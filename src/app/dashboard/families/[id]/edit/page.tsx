"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { FamilyForm } from "../../_components/family-form";
import { FamilyFormValues } from "../../hooks/use-families";
import { useFamily, useUpdateFamily } from "../../hooks/use-families";
import { toast } from "sonner";
import { Loading } from "@/components/page/loading";
import { AccessDenied } from "@/components/page/access-denied";

export default function EditFamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const resolvedParams = use(params);
  const familyId = resolvedParams.id;

  const { data: family, isLoading: isLoadingFamily, error: familyError } = useFamily(familyId);
  const updateFamilyMutation = useUpdateFamily();

  const canCreateOrEdit = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "SALES";
  if (sessionStatus === "loading") return <Loading />;
  if (!session || !canCreateOrEdit) return <AccessDenied />;

  // Format initial data for the form
  const initialData: Partial<FamilyFormValues> | undefined = family
    ? {
      name: family.name || "",
      phoneNumber: family.phoneNumber || "",
      lineId: family.lineId || "",
      email: family.email || "",
      note: family.note || "",
      customerIds: family.customers?.map((c) => c.customer.id) || [],
    }
    : undefined;

  async function handleSubmit(values: FamilyFormValues) {
    try {
      await updateFamilyMutation.mutateAsync({
        id: familyId,
        data: values,
      });
      router.push(`/dashboard/families`);
      router.refresh();
    } catch {
      toast.error("Updated unsuccessfully.");
    }
  }

  if (isLoadingFamily) {
    return (
      <Loading />
    );
  }

  if (familyError) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="text-destructive">Failed to load family. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Family / Group</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        {initialData && (
          <FamilyForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={updateFamilyMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
