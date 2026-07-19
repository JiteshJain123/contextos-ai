"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  createTaskSchema,
  type CreateTaskInput,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/validators/task";

type CreateTaskFormValues = z.input<typeof createTaskSchema>;

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useCreateTask } from "../hooks/use-create-task";
import { TASK_STATUSES, statusMeta } from "../lib/status";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function CreateTaskDialog({
  projectId,
  defaultStatus = "TODO",
  triggerLabel,
  triggerVariant = "default",
}: {
  projectId: string;
  defaultStatus?: TaskStatus;
  triggerLabel?: string;
  triggerVariant?: "default" | "ghost";
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: defaultStatus,
      priority: "MEDIUM",
    },
  });

  const mutation = useCreateTask(
    projectId,
    (field, message) => {
      form.setError(field as never, { type: "server", message });
    },
    () => {
      setOpen(false);
      form.reset({ title: "", description: "", status: defaultStatus, priority: "MEDIUM" });
    },
  );

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset({ title: "", description: "", status: defaultStatus, priority: "MEDIUM" });
    }
    setOpen(next);
  }

  // Keyboard shortcut: N opens the dialog (ignored while typing or when
  // another dialog/menu is already open).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")
      ) {
        return;
      }
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSubmit = form.handleSubmit((v) => mutation.mutate(v as CreateTaskInput));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerVariant === "ghost" ? "sm" : "default"}>
          <Plus className="size-4" aria-hidden="true" />
          {triggerLabel ?? "New task"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a task</DialogTitle>
          <DialogDescription>Add a new task to this project.</DialogDescription>
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
                    <Textarea rows={3} disabled={mutation.isPending} {...field} />
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
                      value={
                        field.value instanceof Date
                          ? field.value.toISOString().slice(0, 10)
                          : typeof field.value === "string"
                          ? field.value
                          : ""
                      }
                      onChange={(e) => {
                        field.onChange(e.target.value ? new Date(e.target.value) : undefined);
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
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {mutation.isPending ? "Creating…" : "Create task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
