"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { useFamily } from "@/app/dashboard/families/hooks/use-families";
import { FamilyForm } from "../_components/family-form";
import { FamilyFormValues } from "../hooks/use-families";
import { Loading } from "@/components/page/loading";
import { format } from "date-fns";

export default function FamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: familyId } = use(params);
  const { data: family, isLoading, error } = useFamily(familyId);

  if (isLoading) {
    return <Loading />;
  }

  if (error || !family) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Family not found</p>
        </div>
      </div>
    );
  }

  const initialData: Partial<FamilyFormValues> = {
    name: family.name || "",
    phoneNumber: family.phoneNumber || "",
    lineId: family.lineId || "",
    email: family.email || "",
    note: family.note || "",
    customerIds: family.customers?.map((c) => c.customer.id) || [],
  };

  const initialCustomers = family.customers?.map((c) => c.customer) || [];

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Family / Group</h2>
        </div>
      </div>

      <div className="bg-card rounded-md border p-6">
        <FamilyForm
          mode="view"
          initialData={initialData}
          initialCustomers={initialCustomers}
        />
      </div>

      {family.customers && family.customers.length > 0 && (
        <div className="bg-card rounded-md border p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Family Members
          </h3>
          <div className="space-y-4">
            {family.customers.map(({ customer }) => (
              <Link
                key={customer.id}
                href={`/dashboard/customers/${customer.id}`}
                className="hover:bg-accent block rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {customer.firstNameTh && customer.lastNameTh
                        ? `${customer.firstNameTh} ${customer.lastNameTh}`
                        : `${customer.firstNameEn} ${customer.lastNameEn}`}
                    </p>
                    {(customer.firstNameEn || customer.lastNameEn) &&
                      (customer.firstNameTh || customer.lastNameTh) && (
                        <p className="text-muted-foreground text-sm">
                          {customer.firstNameTh && customer.lastNameTh
                            ? `${customer.firstNameEn} ${customer.lastNameEn}`
                            : `${customer.firstNameTh} ${customer.lastNameTh}`}
                        </p>
                      )}
                    {customer.tags && customer.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {customer.tags.map(({ tag }) => (
                          <Badge key={tag.id} variant="outline" className="bg-blue-100 text-blue-800">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-md border p-6 space-y-4">
        <h3 className="font-semibold">Additional Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="col-span-2">
            <span className="text-muted-foreground">Members:</span>
            <div className="mt-1">
              {family.customers?.length || 0} {family.customers?.length === 1 ? "member" : "members"}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Created date:</span>
            <div className="mt-1">{format(new Date(family.createdAt), "dd MMM yyyy HH:mm")}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Updated date:</span>
            <div className="mt-1">{format(new Date(family.updatedAt), "dd MMM yyyy HH:mm")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
