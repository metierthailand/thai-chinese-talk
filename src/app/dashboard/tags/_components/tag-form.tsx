"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const tagFormSchema = z.object({
  name: z.string().min(1, {
    message: "Please fill in the information.",
  }),
  order: z.number().int().min(0).optional(),
});

export type TagFormValues = z.infer<typeof tagFormSchema>;

interface PositionTag {
  id: string;
  name: string;
  order: number;
}

interface TagFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<TagFormValues>;
  onSubmit?: (values: TagFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  allTagsForPosition?: PositionTag[]; // For position select (create/edit)
  currentTagId?: string; // For edit mode to exclude current tag from options
}

export function TagForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  allTagsForPosition = [],
  currentTagId,
}: TagFormProps) {
  const readOnly = mode === "view";

  // Calculate default order for create mode (last position + 1)
  const maxOrder = allTagsForPosition.length > 0
    ? Math.max(...allTagsForPosition.map((t) => t.order))
    : -1;
  const defaultOrderForCreate = maxOrder + 1;

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: "",
      order: mode === "create" ? defaultOrderForCreate : undefined,
    },
  });

  // Sync initial data (for edit/view)
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name ?? "",
        order: initialData.order,
      });
    }
  }, [initialData, form]);

  async function handleSubmit(values: TagFormValues) {
    if (!onSubmit || readOnly) return;
    await onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Tag Name</FormLabel>
              <FormControl>
                <Input placeholder="VIP, Corporate, etc." {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode !== "view" && (
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                  ? "Create"
                  : "Update"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
