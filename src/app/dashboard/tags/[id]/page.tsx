"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import { useTag } from "../hooks/use-tags";
import { TagForm } from "../_components/tag-form";
import Link from "next/link";

export default function TagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: tagId } = use(params);
  const { data: tag, isLoading: isLoadingTag, error: tagError } = useTag(tagId);

  if (isLoadingTag) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading tag...</p>
        </div>
      </div>
    );
  }

  if (tagError || !tag) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Tag not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Tag Details</h2>
        </div>
        <Link href={`/dashboard/tags/${tagId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> Edit Tag
          </Button>
        </Link>
      </div>

      <div className="bg-card rounded-md border p-6">
        <TagForm
          mode="view"
          initialData={{
            name: tag.name || "",
            order: tag.order,
          }}
        />
      </div>
    </div>
  );
}


