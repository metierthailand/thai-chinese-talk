"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UserForm } from "../../_components/user-form";
import { UserFormValues } from "../../hooks/use-users";
import { useUser, useUpdateUser } from "../../hooks/use-users-query";
import { Loading } from "@/components/page/loading";

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const { data: user, isLoading: isLoadingUser, error: userError } = useUser(userId);
  const updateUserMutation = useUpdateUser();

  // Format initial data for the form
  const initialData: Partial<UserFormValues> | undefined = user
    ? {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        role: user.role,
        commissionPerHead: user.commissionPerHead ? user.commissionPerHead.toString() : "",
        isActive: user.isActive,
      }
    : undefined;

  async function handleSubmit(values: UserFormValues) {
    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        data: values,
      });
      router.push("/dashboard/admin");
      router.refresh();
    } catch (error) {
      // Error will be handled by form component's handleSubmit
      throw error;
    }
  }

  if (isLoadingUser) {
    return <Loading />;
  }

  if (userError) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="text-destructive">Failed to load user. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Edit Staff</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        {initialData && (
          <UserForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={updateUserMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
