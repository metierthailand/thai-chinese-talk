"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useCreateTag, useAllTags } from "../hooks/use-tags";
import { TagForm, type TagFormValues } from "../_components/tag-form";
import { AccessDenied } from "@/components/page/access-denied";
import { Loading } from "@/components/page/loading";

export default function CreateTagPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const createTagMutation = useCreateTag();
  const { data: allTags, isLoading: isLoadingTags } = useAllTags();

  const canCreateOrEdit = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "SALES";

  if (sessionStatus === "loading") {
    return <Loading />;
  }

  if (!session || !canCreateOrEdit) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: TagFormValues) {
    await createTagMutation.mutateAsync(values);
    router.push("/dashboard/tags");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Tag</h2>
      </div>

      <div className="bg-card rounded-md border p-6">
        <TagForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={createTagMutation.isPending || isLoadingTags}
          allTagsForPosition={allTags || []}
        />
      </div>
    </div>
  );
}
