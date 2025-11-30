import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";

export const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.date(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  relatedCustomerId: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string; // ISO date string from API
  isCompleted: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
  relatedCustomerId: string | null;
  agentId: string;
  agent: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TasksResponse {
  data: Task[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query keys
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (
    page: number,
    pageSize: number,
    customerId?: string,
    isCompleted?: boolean
  ) =>
    [
      ...taskKeys.lists(),
      page,
      pageSize,
      customerId,
      isCompleted,
    ] as const,
};

// Fetch tasks
async function fetchTasks(
  page: number = 1,
  pageSize: number = 10,
  customerId?: string,
  isCompleted?: boolean
): Promise<TasksResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (customerId) {
    params.set("customerId", customerId);
  }

  if (isCompleted !== undefined) {
    params.set("isCompleted", isCompleted.toString());
  }

  const response = await fetch(`/api/tasks?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return response.json();
}

// Create task
async function createTask(data: TaskFormValues): Promise<Task> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      dueDate: data.dueDate.toISOString().split("T")[0],
      priority: data.priority,
      relatedCustomerId: data.relatedCustomerId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to create task" }));
    throw new Error(error.error || "Failed to create task");
  }

  return response.json();
}

// Update task
async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    dueDate: Date | string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    isCompleted: boolean;
  }>
): Promise<Task> {
  const updateData: {
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    isCompleted?: boolean;
  } = {};
  
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate instanceof Date 
      ? data.dueDate.toISOString().split("T")[0]
      : data.dueDate;
  }
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.isCompleted !== undefined) updateData.isCompleted = data.isCompleted;

  const response = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to update task" }));
    throw new Error(error.error || "Failed to update task");
  }

  return response.json();
}

// Delete task
async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to delete task" }));
    throw new Error(error.error || "Failed to delete task");
  }
}

// Hook for fetching tasks
export function useTasks(
  page: number = 1,
  pageSize: number = 10,
  customerId?: string,
  isCompleted?: boolean
) {
  return useQuery({
    queryKey: taskKeys.list(page, pageSize, customerId, isCompleted),
    queryFn: () => fetchTasks(page, pageSize, customerId, isCompleted),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook for creating task
export function useCreateTask(customerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TaskFormValues) => createTask({ ...data, relatedCustomerId: customerId }),
    onSuccess: () => {
      // Invalidate all task lists for this customer
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.lists(),
          predicate: (query) => {
            const key = query.queryKey;
            return key.includes("tasks") && key.includes("list");
          },
        });
      } else {
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      }
      queryClient.invalidateQueries({ queryKey: ["customers", customerId] });
      toast.success("Task created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });
}

// Hook for updating task
export function useUpdateTask(customerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof updateTask>[1]) =>
      updateTask(id, data),
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.lists(),
          predicate: (query) => {
            const key = query.queryKey;
            return key.includes("tasks") && key.includes("list");
          },
        });
      } else {
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      }
      queryClient.invalidateQueries({ queryKey: ["customers", customerId] });
      toast.success("Task updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });
}

// Hook for deleting task
export function useDeleteTask(customerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.lists(),
          predicate: (query) => {
            const key = query.queryKey;
            return key.includes("tasks") && key.includes("list");
          },
        });
      } else {
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      }
      queryClient.invalidateQueries({ queryKey: ["customers", customerId] });
      toast.success("Task deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete task");
    },
  });
}

