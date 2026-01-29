// Task status type
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

// Task status display labels mapping
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To-do",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Task status badge variant mapping
export const TASK_STATUS_VARIANTS: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline" | "success" | "info" | "warning"> = {
  TODO: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

// Helper function to get task status label
export function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status as TaskStatus] || status;
}

// Helper function to get task status badge variant
export function getTaskStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "info" | "warning" {
  return TASK_STATUS_VARIANTS[status as TaskStatus] || "default";
}
