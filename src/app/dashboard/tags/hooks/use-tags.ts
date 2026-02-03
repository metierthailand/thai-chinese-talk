import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    customers: number;
  };
}

interface TagsResponse {
  data: Tag[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query key factory
export const tagKeys = {
  all: ["tags"] as const,
  lists: () => [...tagKeys.all, "list"] as const,
  list: (page: number, pageSize: number, search?: string) =>
    [...tagKeys.lists(), page, pageSize, search] as const,
  details: () => [...tagKeys.all, "detail"] as const,
  detail: (id: string) => [...tagKeys.details(), id] as const,
};

// Fetch tags function
async function fetchTags(
  page: number = 1,
  pageSize: number = 10,
  search?: string
): Promise<TagsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (search && search.trim()) {
    params.set("search", search.trim());
  }

  const res = await fetch(`/api/tags?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch tags");
  }
  return res.json();
}

// Fetch single tag function
async function fetchTag(id: string): Promise<Tag> {
  const res = await fetch(`/api/tags/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch tag");
  }
  return res.json();
}

// Fetch all tags for order selection (without pagination)
async function fetchAllTags(): Promise<Pick<Tag, "id" | "name" | "order">[]> {
  const res = await fetch("/api/tags?all=true");
  if (!res.ok) {
    throw new Error("Failed to fetch tags");
  }
  return res.json();
}

// Create tag function
async function createTag(data: { name: string; order?: number }): Promise<Tag> {
  const res = await fetch("/api/tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    const error = new Error(errorData.error || errorData.message || "Failed to create tag") as Error & { field?: string; fields?: { field: string; message: string }[] };
    if (errorData.field) error.field = errorData.field;
    if (errorData.fields) error.fields = errorData.fields;
    throw error;
  }

  return res.json();
}

// Update tag function
async function updateTag({ id, data }: { id: string; data: { name: string; order?: number } }): Promise<Tag> {
  const res = await fetch(`/api/tags/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    const error = new Error(errorData.error || errorData.message || "Failed to update tag") as Error & { field?: string; fields?: { field: string; message: string }[] };
    if (errorData.field) error.field = errorData.field;
    if (errorData.fields) error.fields = errorData.fields;
    throw error;
  }

  return res.json();
}

// Delete tag function
async function deleteTag(id: string): Promise<void> {
  const res = await fetch(`/api/tags/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete tag");
  }
}

// Reorder tags function
async function reorderTags(tags: { id: string; order: number }[]): Promise<void> {
  const res = await fetch("/api/tags/reorder", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) {
    throw new Error("Failed to reorder tags");
  }
}

// Hook to fetch tags with pagination
export function useTags(params: { page: number, pageSize: number, search?: string }) {
  return useQuery({
    queryKey: tagKeys.list(params.page, params.pageSize, params.search),
    queryFn: () => fetchTags(params.page, params.pageSize, params.search),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch a single tag
export function useTag(id: string | undefined) {
  return useQuery({
    queryKey: tagKeys.detail(id!),
    queryFn: () => fetchTag(id!),
    enabled: !!id, // Only fetch if id is provided
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch all tags for order selection
export function useAllTags() {
  return useQuery({
    queryKey: [...tagKeys.all, "all"],
    queryFn: fetchAllTags,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to create a tag
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      // Invalidate all tag queries to refetch
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast.success("Created successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Created unsuccessfully.");
    },
  });
}

// Hook to update a tag
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTag,
    onSuccess: (data, variables) => {
      // Invalidate all tag queries to refetch
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      // Update the specific tag in cache
      queryClient.setQueryData(tagKeys.detail(variables.id), data);
      toast.success("Updated successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Updated unsuccessfully.");
    },
  });
}

// Hook to delete a tag
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      // Invalidate all tag queries to refetch
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast.success("Deleted successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Deleted unsuccessfully.");
    },
  });
}

// Hook to reorder tags
export function useReorderTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderTags,
    onSuccess: () => {
      // Invalidate all tag queries to refetch
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast.success("Reordered successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Reordered unsuccessfully.");
    },
  });
}

