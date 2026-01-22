import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";

export const taskFormSchema = z.object({
  topic: z.string().min(1, { message: "Please fill in the information." }),
  description: z.string().optional(),
  deadline: z.date().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  contact: z.enum(["CALL", "LINE", "MESSENGER"]).optional().nullable(),
  relatedCustomerId: z.string({ message: "Please select the information." }).min(1, "Please select the information."),
  userId: z.string().optional().nullable(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export interface Task {
  id: string;
  topic: string;
  description: string | null;
  deadline: string | null; // ISO date string from API
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  contact: "CALL" | "LINE" | "MESSENGER" | null;
  relatedCustomerId: string | null;
  userId: string | null;
  relatedCustomer: {
    id: string;
    firstNameTh: string;
    lastNameTh: string;
    firstNameEn: string;
    lastNameEn: string;
  } | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
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
  list: (page: number, pageSize: number, customerId?: string, status?: string, contact?: string, userId?: string, deadlineFrom?: string, deadlineTo?: string, search?: string) =>
    [...taskKeys.lists(), page, pageSize, customerId, status, contact, userId, deadlineFrom, deadlineTo, search] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Fetch tasks
async function fetchTasks(
  page: number = 1,
  pageSize: number = 10,
  customerId?: string,
  status?: string,
  contact?: string,
  userId?: string,
  deadlineFrom?: string,
  deadlineTo?: string,
  search?: string,
): Promise<TasksResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (customerId) {
    params.set("customerId", customerId);
  }
  if (status) {
    params.set("status", status);
  }
  if (contact) {
    params.set("contact", contact);
  }
  if (userId) {
    params.set("userId", userId);
  }
  if (deadlineFrom) {
    params.set("deadlineFrom", deadlineFrom);
  }
  if (deadlineTo) {
    params.set("deadlineTo", deadlineTo);
  }
  if (search) {
    params.set("search", search);
  }

  const response = await fetch(`/api/tasks?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return response.json();
}

// Fetch single task
async function fetchTask(id: string): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch task");
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
      topic: data.topic,
      description: data.description,
      deadline: data.deadline ? data.deadline.toISOString() : null,
      status: data.status || "TODO",
      contact: data.contact,
      relatedCustomerId: data.relatedCustomerId,
      userId: data.userId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to create task" }));
    throw new Error(error.error || "Failed to create task");
  }

  return response.json();
}

// Update task
async function updateTask(id: string, data: Partial<TaskFormValues>): Promise<Task> {
  const updateData: {
    topic?: string;
    description?: string | null;
    deadline?: string | null;
    status?: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    contact?: "CALL" | "LINE" | "MESSENGER" | null;
    relatedCustomerId?: string | null;
    userId?: string | null;
  } = {};

  if (data.topic !== undefined) updateData.topic = data.topic;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.deadline !== undefined) {
    updateData.deadline = data.deadline ? data.deadline.toISOString() : null;
  }
  if (data.status !== undefined) updateData.status = data.status;
  if (data.contact !== undefined) updateData.contact = data.contact;
  if (data.relatedCustomerId !== undefined) updateData.relatedCustomerId = data.relatedCustomerId || null;
  if (data.userId !== undefined) updateData.userId = data.userId || null;

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
  status?: string,
  contact?: string,
  userId?: string,
  deadlineFrom?: string,
  deadlineTo?: string,
  search?: string,
) {
  return useQuery({
    queryKey: taskKeys.list(page, pageSize, customerId, status, contact, userId, deadlineFrom, deadlineTo, search),
    queryFn: () => fetchTasks(page, pageSize, customerId, status, contact, userId, deadlineFrom, deadlineTo, search),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook for fetching single task
export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(id!),
    queryFn: () => fetchTask(id!),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook for creating task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Task created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });
}

// Hook for updating task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<TaskFormValues>) => updateTask(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) });
      toast.success("Task updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });
}

// Hook for deleting task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Task deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete task");
    },
  });
}
