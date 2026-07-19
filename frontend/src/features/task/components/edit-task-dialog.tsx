"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  updateTaskSchema,
  type TaskDTO,
  type TaskPriority,
  type TaskStatus,
  type UpdateTaskInput,
} from "@/lib/validators/task";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useUpdateTask } from "../hooks/use-update-task";
import { TASK_STATUSES, statusMeta } from "../lib/status";

type EditTaskFormValues = z.input<typeof updateTaskSchema>;

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function toDateString(d: TaskDTO["dueDate"]): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d as unknown as string);
  return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toDateDefault(d: TaskDTO["dueDate"]): Date | undefined {
  if (!d) return undefined;
  const date = d instanceof Date ? d : new Date(d as unknown as string);
  return isNaN(date.getTime()) ? undefined : date;
}

export function EditTaskDialog({
  task,
  projectId,
  open,
  onOpenChange,
}: {
  task: TaskDTO;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: toDateDefault(task.dueDate),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: task.title,
        description: task.description ?? "",
        status: task.status as TaskStatus,
        priority: task.priority as TaskPriority,
        dueDate: toDateDefault(task.dueDate),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task.id]);

  const mutation = useUpdateTask(
    projectId,
    task.id,
    (field, message) => {
      form.setError(field as keyof EditTaskFormValues, { type: "server", message });
    },
    () => onOpenChange(false),
  );

  const onSubmit = form.handleSubmit((v) => mutation.mutate(v as unknown as UpdateTaskInput));

  // projectId is kept in props for future use (query invalidation context)
  void projectId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update the task details.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What needs doing?"
                      disabled={mutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      disabled={mutation.isPending}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={(field.value as string | undefined) ?? ""}
                        disabled={mutation.isPending}
                        className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {statusMeta[s].label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={(field.value as string | undefined) ?? ""}
                        disabled={mutation.isPending}
                        className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={mutation.isPending}
                      value={toDateString(field.value as TaskDTO["dueDate"])}
                      onChange={(e) => {
                        field.onChange(e.target.value ? new Date(e.target.value) : null);
                      }}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {mutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
