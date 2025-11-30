"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CustomerForm } from "../_components/customer-form";
import { CustomerFormValues } from "../hooks/use-customers";
import { useCreateCustomer } from "../hooks/use-customers";
import { useAllTags } from "@/app/dashboard/tags/hooks/use-tags";
import { toast } from "sonner";

export default function NewCustomerPage() {
  const router = useRouter();
  const createCustomerMutation = useCreateCustomer();
  const { data: allTagsResponse } = useAllTags();

  // Transform tags data for CustomerForm
  const tags = allTagsResponse?.map((tag) => ({
    id: tag.id,
    name: tag.name,
  })) || [];

  async function handleSubmit(values: CustomerFormValues) {
    try {
      await createCustomerMutation.mutateAsync(values);
      router.push("/dashboard/customers");
      router.refresh();
    } catch {
      toast.error("Failed to create customer");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">New Customer</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        <CustomerForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={createCustomerMutation.isPending}
          availableTags={tags}
        />
      </div>
    </div>
  );
}
