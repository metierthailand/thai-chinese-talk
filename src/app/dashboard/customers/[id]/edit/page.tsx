"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { CustomerForm } from "../../_components/customer-form";
import { CustomerFormValues } from "../../hooks/use-customers";
import { useCustomer, useUpdateCustomer } from "../../hooks/use-customers";
import { useAllTags } from "@/app/dashboard/tags/hooks/use-tags";
import { toast } from "sonner";

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const { data: customer, isLoading: isLoadingCustomer, error: customerError } = useCustomer(customerId);
  const updateCustomerMutation = useUpdateCustomer();
  const { data: allTagsResponse } = useAllTags();

  // Transform tags data for CustomerForm
  const tags = allTagsResponse?.map((tag) => ({
    id: tag.id,
    name: tag.name,
  })) || [];

  // Extract tag IDs from customer
  const selectedTagIds = customer?.tags?.map((ct) => ct.tag.id) || [];

  // Format initial data for the form
  const initialData: Partial<CustomerFormValues> | undefined = customer
    ? {
        firstNameTh: customer.firstNameTh || "",
        lastNameTh: customer.lastNameTh || "",
        firstNameEn: customer.firstNameEn || "",
        lastNameEn: customer.lastNameEn || "",
        title: customer.title || undefined,
        email: customer.email || "",
        phone: customer.phone || "",
        lineId: customer.lineId || "",
        dateOfBirth: customer.dateOfBirth
          ? typeof customer.dateOfBirth === "string"
            ? customer.dateOfBirth.includes("T")
              ? format(new Date(customer.dateOfBirth), "yyyy-MM-dd")
              : customer.dateOfBirth
            : format(new Date(customer.dateOfBirth), "yyyy-MM-dd")
          : "",
        note: customer.note || "",
        tagIds: selectedTagIds,
        addresses:
          customer.addresses?.map((addr) => ({
            address: addr.address || "",
            province: addr.province || "",
            district: addr.district || "",
            subDistrict: addr.subDistrict || "",
            postalCode: addr.postalCode || "",
          })) || [],
        passports:
          customer.passports?.map((p) => ({
            passportNumber: p.passportNumber || "",
            issuingCountry: p.issuingCountry || "",
            issuingDate: p.issuingDate ? format(new Date(p.issuingDate), "yyyy-MM-dd") : "",
            expiryDate: p.expiryDate ? format(new Date(p.expiryDate), "yyyy-MM-dd") : "",
            imageUrl: p.imageUrl || null,
            isPrimary: p.isPrimary || false,
          })) || [],
        foodAllergies:
          customer.foodAllergies?.map((fa) => ({
            types: fa.types || [],
            note: fa.note || "",
          })) || [],
      }
    : undefined;

  async function handleSubmit(values: CustomerFormValues) {
    try {
      await updateCustomerMutation.mutateAsync({
        id: customerId,
        data: values,
      });
      router.push(`/dashboard/customers/${customerId}`);
      router.refresh();
    } catch {
      toast.error("Failed to update customer");
    }
  }

  if (isLoadingCustomer) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="text-muted-foreground">Loading customer data...</div>
      </div>
    );
  }

  if (customerError) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="text-destructive">Failed to load customer. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Edit Customer</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        {initialData && (
          <CustomerForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={updateCustomerMutation.isPending}
            availableTags={tags}
            selectedTagIds={selectedTagIds}
          />
        )}
      </div>
    </div>
  );
}

