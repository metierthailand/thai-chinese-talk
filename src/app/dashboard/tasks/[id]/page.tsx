"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTask } from "../hooks/use-tasks";
import { TaskForm } from "../_components/task-form";
import { Loading } from "@/components/page/loading";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TASK_STATUS_LABELS } from "@/lib/constants/task";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: taskId } = use(params);
  const { data: task, isLoading: isLoadingTask, error: taskError } = useTask(taskId);

  if (isLoadingTask) {
    return <Loading />;
  }

  if (taskError || !task) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Task not found</p>
        </div>
      </div>
    );
  }

  const initialData = {
    topic: task.topic,
    description: task.description || "",
    deadline: task.deadline ? new Date(task.deadline) : undefined,
    status: task.status,
    contact: task.contact ?? undefined,
    relatedCustomerId: task.relatedCustomerId ?? undefined,
    userId: task.userId ?? undefined,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Task</h2>
        </div>
        {/* <Link href={`/dashboard/tasks/${taskId}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" /> Edit Task
          </Button>
        </Link> */}
      </div>

      <div className="bg-card rounded-md border p-6">
        <TaskForm
          mode="view"
          initialData={initialData}
        />
      </div>

      <div className="bg-card rounded-md border p-6 space-y-4">
        <h3 className="font-semibold">Additional Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {task.user && (
            <div>
              <span className="text-muted-foreground">Assigned To:</span>
              <div className="mt-1">
                {task.user.firstName} {task.user.lastName}
              </div>
            </div>
          )}
          {task.deadline && (
            <div>
              <span className="text-muted-foreground">Deadline:</span>
              <div className="mt-1">{format(new Date(task.deadline), "dd MMM yyyy hh:mm a")}</div>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Created date:</span>
            <div className="mt-1">{format(new Date(task.createdAt), "dd MMM yyyy hh:mm a")}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Updated date:</span>
            <div className="mt-1">{format(new Date(task.updatedAt), "dd MMM yyyy hh:mm a")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
