"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  priority: string;
}

interface CustomerTasksProps {
  customerId: string;
  initialTasks: Task[];
}

export function CustomerTasks({ customerId, initialTasks }: CustomerTasksProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddTask = async () => {
    if (!title || !dueDate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dueDate,
          relatedCustomerId: customerId,
          priority: "MEDIUM",
        }),
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks([...tasks, newTask]);
        setTitle("");
        setDueDate("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 border p-4 rounded-md bg-card">
        <h3 className="font-semibold">Add Task</h3>
        <div className="flex gap-4">
          <Input
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
          />
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-[180px]"
          />
          <Button onClick={handleAddTask} disabled={loading || !title || !dueDate}>
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-4 p-3 border rounded-md hover:bg-muted/50"
          >
            <Checkbox checked={task.isCompleted} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </p>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(task.dueDate), "PP")}
              </div>
            </div>
            <span className="text-xs px-2 py-1 bg-secondary rounded-full">
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
