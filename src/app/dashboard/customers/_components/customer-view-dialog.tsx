import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMemo } from "react";
import { useCustomer, CustomerFormValues } from "@/app/dashboard/customers/hooks/use-customers";
import { useAllTags } from "@/app/dashboard/tags/hooks/use-tags";
import { Loading } from "@/components/page/loading";
import { CustomerForm } from "./customer-form";

interface CustomerViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}

export function CustomerViewDialog({ open, onOpenChange, customerId }: CustomerViewDialogProps) {
  const { data: customer, isLoading, error } = useCustomer(customerId);
  const { data: tags = [] } = useAllTags();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full! lg:w-[820px]! sm:max-w-7xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl">Customer Details</DialogTitle>
        </DialogHeader>

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
            mode="view"
            initialData={formattedCustomer}
            onSubmit={async () => {}}
            availableTags={tags}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
