"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTag, useUpdateTag, useAllTags } from "../../hooks/use-tags";
import { TagForm, type TagFormValues } from "../../_components/tag-form";
import { toast } from "sonner";
import { Loading } from "@/components/page/loading";
import { AccessDenied } from "@/components/page/access-denied";

export default function EditTagPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const resolvedParams = use(params);
  const tagId = resolvedParams.id;

  const { data: tag, isLoading: isLoadingTag, error: tagError } = useTag(tagId);
  const updateTagMutation = useUpdateTag();
  const { data: allTags, isLoading: isLoadingTags } = useAllTags();

  const canCreateOrEdit = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "SALES";

  if (sessionStatus === "loading") {
    return <Loading />;
  }

  if (!session || !canCreateOrEdit) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: TagFormValues) {
    await updateTagMutation.mutateAsync({
      id: tagId,
      data: values,
    });
    router.push("/dashboard/tags");
    router.refresh();
  }

  if (isLoadingTag) {
    return <Loading />;
  }

  if (tagError) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load tag. Please try again.</p>
        </div>
      </div>
    );
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
          mode="edit"
          initialData={
            tag
              ? {
                  name: tag.name || "",
                  order: tag.order,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={updateTagMutation.isPending || isLoadingTags}
          allTagsForPosition={allTags || []}
          currentTagId={tagId}
        />
      </div>
    </div>
  );
}
