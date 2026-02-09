"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { FamilyForm } from "../_components/family-form";
import { FamilyFormValues } from "../hooks/use-families";
import { useCreateFamily } from "../hooks/use-families";
import { toast } from "sonner";
import { AccessDenied } from "@/components/page/access-denied";
import { Loading } from "@/components/page/loading";

export default function NewFamilyPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const createFamilyMutation = useCreateFamily();

  const canCreateOrEdit = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "SALES";
  if (sessionStatus === "loading") return <Loading />;
  if (!session || !canCreateOrEdit) return <AccessDenied />;

  async function handleSubmit(values: FamilyFormValues) {
    try {
      await createFamilyMutation.mutateAsync(values);
      router.push("/dashboard/families");
      router.refresh();
    } catch {
      toast.error("Created unsuccessfully.");
    }
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
        <FamilyForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={createFamilyMutation.isPending}
        />
      </div>
    </div>
  );
}
