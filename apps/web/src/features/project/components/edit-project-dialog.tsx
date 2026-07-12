"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
  updateProjectSchema,
  type ProjectDTO,
  type UpdateProjectInput,
} from "@contextos-ai/validators/project";

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

import { useUpdateProject } from "../hooks/use-update-project";

/**
 * Edit-project dialog with an embedded trigger button.
 *
 * After a successful slug change the page navigates to the new URL
 * so the route stays consistent. Name/description-only changes
 * refresh in place via router.refresh().
 */
export function EditProjectDialog({ project }: { project: ProjectDTO }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      slug: project.slug,
      description: project.description ?? "",
    },
  });

  // Re-populate when reopening (e.g. after a save refreshed the page data).
  useEffect(() => {
    if (open) {
      form.reset({
        name: project.name,
        slug: project.slug,
        description: project.description ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project.id]);

  const mutation = useUpdateProject(
    project.id,
    (field, message) => {
      form.setError(field as keyof UpdateProjectInput, { type: "server", message });
    },
    (updated) => {
      setOpen(false);
      if (updated.slug !== project.slug) {
        router.push(`/projects/${updated.slug}` as never);
      } else {
        router.refresh();
      }
    },
  );

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    setOpen(next);
  }

  const onSubmit = form.handleSubmit((v) => mutation.mutate(v));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" aria-hidden="true" />
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Update the project name, slug, or description.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" disabled={mutation.isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" disabled={mutation.isPending} {...field} />
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
                {mutation.isPending && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                {mutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
