"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  taskFormSchema,
  type Task,
  type TaskFormValues,
} from "../hooks/use-task";

interface CustomerTasksProps {
  customerId: string;
}

export function CustomerTasks({ customerId }: CustomerTasksProps) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: undefined as Date | undefined,
      priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
      relatedCustomerId: customerId,
    },
  });

  const { data: tasksResponse, isLoading } = useTasks(page, pageSize, customerId);
  const createTask = useCreateTask(customerId);
  const updateTask = useUpdateTask(customerId);
  const deleteTaskMutation = useDeleteTask(customerId);

  const tasks = useMemo(() => tasksResponse?.data ?? [], [tasksResponse?.data]);
  const total = tasksResponse?.total ?? 0;
  const totalPages = tasksResponse?.totalPages ?? 0;

  const handleAddTask = useCallback(
    (values: TaskFormValues) => {
      createTask.mutate(
        {
          ...values,
          relatedCustomerId: customerId,
        },
        {
          onSuccess: () => {
            form.reset({
              title: "",
              description: "",
              dueDate: undefined,
              priority: "MEDIUM",
              relatedCustomerId: customerId,
            });
          },
        }
      );
    },
    [customerId, createTask, form]
  );

  const handleToggleComplete = useCallback(
    (task: Task) => {
      updateTask.mutate({
        id: task.id,
        isCompleted: !task.isCompleted,
      });
    },
    [updateTask]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm("Are you sure you want to delete this task?")) return;
      deleteTaskMutation.mutate(id);
    },
    [deleteTaskMutation]
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);


  const isLoadingData = isLoading || createTask.isPending || updateTask.isPending || deleteTaskMutation.isPending;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "destructive";
      case "MEDIUM":
        return "default";
      case "LOW":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 border p-4 rounded-md bg-card">
        <h3 className="font-semibold">Add Task</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddTask)} className="flex gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Task title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-[180px] justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd MMM yyyy") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        captionLayout="dropdown"
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoadingData}>
              Add
            </Button>
          </form>
        </Form>
      </div>

      {isLoading && tasks.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">No tasks found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-3 border rounded-md hover:bg-muted/50"
              >
                <Checkbox
                  checked={task.isCompleted}
                  onCheckedChange={() => handleToggleComplete(task)}
                  disabled={isLoadingData}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      task.isCompleted ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {format(new Date(task.dueDate), "PP")}
                  </div>
                </div>
                <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                  {task.priority}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(task.id)}
                  disabled={isLoadingData}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} tasks
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || isLoadingData}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || isLoadingData}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
