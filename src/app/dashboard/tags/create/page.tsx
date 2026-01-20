"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useCreateTag, useAllTags } from "../hooks/use-tags";
import { TagForm, type TagFormValues } from "../_components/tag-form";
import { toast } from "sonner";

export default function CreateTagPage() {
  const router = useRouter();
  const createTagMutation = useCreateTag();
  const { data: allTags, isLoading: isLoadingTags } = useAllTags();

  async function handleSubmit(values: TagFormValues) {
    try {
      await createTagMutation.mutateAsync(values);
      router.push("/dashboard/tags");
      router.refresh();
    } catch {
      toast.error("Failed to create tag");
    }
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
