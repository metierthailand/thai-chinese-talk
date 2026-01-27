import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCustomer, CustomerFormValues, useUpdateCustomer } from "@/app/dashboard/customers/hooks/use-customers";
import { useAllTags } from "@/app/dashboard/tags/hooks/use-tags";
import { Loading } from "@/components/page/loading";
import { CustomerForm } from "./customer-form";

interface CustomerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onReCheckedChange?: (checked: boolean) => void;
}

export function CustomerEditDialog({ open, onOpenChange, customerId, onReCheckedChange }: CustomerEditDialogProps) {
  const { data: customer, isLoading, error } = useCustomer(customerId);
  const { data: tags = [] } = useAllTags();
  const updateCustomerMutation = useUpdateCustomer();
  const [isReChecked, setIsReChecked] = useState(false);

  // Transform customer data to form values
  const formattedCustomer = useMemo<Partial<CustomerFormValues> | undefined>(() => {
    if (!customer) return undefined;

    return {
      firstNameTh: customer.firstNameTh ?? "",
      lastNameTh: customer.lastNameTh ?? "",
      firstNameEn: customer.firstNameEn ?? "",
      lastNameEn: customer.lastNameEn ?? "",
      title: customer.title || undefined,
      email: customer.email || "",
      phoneNumber: customer.phoneNumber || "",
      lineId: customer.lineId || "",
      dateOfBirth: customer.dateOfBirth || "",
      note: customer.note || "",
      tagIds: customer.tags.map((t) => t.tag.id),
      addresses: customer.addresses.map((a) => ({
        address: a.address ?? "",
        province: a.province ?? "",
        district: a.district ?? "",
        subDistrict: a.subDistrict ?? "",
        postalCode: a.postalCode ?? "",
      })),
      passports: customer.passports.map((p) => ({
        passportNumber: p.passportNumber ?? "",
        issuingCountry: p.issuingCountry ?? "Thailand",
        issuingDate: p.issuingDate,
        expiryDate: p.expiryDate,
        imageUrl: p.imageUrl,
        isPrimary: p.isPrimary,
      })),
      foodAllergies: customer.foodAllergies.map((f) => ({
        types: f.types,
        note: f.note || undefined,
      })),
    };
  }, [customer]);

  const handleSubmit = async (values: CustomerFormValues) => {
    await updateCustomerMutation.mutateAsync({ id: customerId, data: values });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full! lg:w-[820px]! sm:max-w-7xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl">Edit Customer</DialogTitle>
        </DialogHeader>

        {/* Re-check the customer data checkbox */}
        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="recheck-customer"
            checked={isReChecked}
            onCheckedChange={(checked) => {
              const isChecked = checked === true;
              setIsReChecked(isChecked);
              onReCheckedChange?.(isChecked);
            }}
          />
          <Label
            htmlFor="recheck-customer"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Please check the box if the customer&apos;s information has already been rechecked.
          </Label>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loading />
          </div>
        ) : error || !customer ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-destructive">Failed to load customer. Please try again.</p>
          </div>
        ) : (
          <CustomerForm
            mode="edit"
            initialData={formattedCustomer}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={updateCustomerMutation.isPending}
            availableTags={tags}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
