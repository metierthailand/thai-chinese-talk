"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useUser } from "../hooks/use-users-query";
import { UserForm } from "../_components/user-form";
import { UserFormValues } from "../hooks/use-users";
import { Loading } from "@/components/page/loading";
import { format } from "date-fns";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: userId } = use(params);
  const { data: user, isLoading: isLoadingUser, error: userError } = useUser(userId);

  if (isLoadingUser) {
    return <Loading />;
  }

  if (userError || !user) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">User not found</p>
        </div>
      </div>
    );
  }

  const initialData: Partial<UserFormValues> = {
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    role: user.role,
    commissionPerHead: user.commissionPerHead ? user.commissionPerHead.toString() : "",
    isActive: user.isActive,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Staff</h2>
        </div>
        {/* <Link href={`/dashboard/admin/${userId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> Edit User
          </Button>
        </Link> */}
      </div>

      <div className="bg-card rounded-md border p-6">
        <UserForm mode="view" initialData={initialData} />
      </div>

      {(user.createdAt || user.updatedAt) && (
        <div className="bg-card rounded-md border p-6 space-y-4">
          <h3 className="font-semibold text-xl">Additional Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {user.createdAt && (
              <div>
                <span className="text-muted-foreground">Created date:</span>
                <div className="mt-1">{format(new Date(user.createdAt), "dd MMM yyyy HH:mm")}</div>
              </div>
            )}
            {user.updatedAt && (
              <div>
                <span className="text-muted-foreground">Updated date:</span>
                <div className="mt-1">{format(new Date(user.updatedAt), "dd MMM yyyy HH:mm")}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
