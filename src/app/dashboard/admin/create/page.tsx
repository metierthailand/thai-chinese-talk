"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UserForm } from "../_components/user-form";
import { UserFormValues } from "../hooks/use-users";
import { useCreateUser } from "../hooks/use-users-query";

export default function CreateUserPage() {
  const router = useRouter();
  const createUserMutation = useCreateUser();

  async function handleSubmit(values: UserFormValues) {
    try {
      await createUserMutation.mutateAsync(values);
      router.push("/dashboard/admin");
      router.refresh();
    } catch (error) {
      // Error will be handled by form component's handleSubmit
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Staff</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        <UserForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={createUserMutation.isPending}
        />
      </div>
    </div>
  );
}
