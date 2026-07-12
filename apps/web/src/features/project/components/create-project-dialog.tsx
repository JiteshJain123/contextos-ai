"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  createProjectSchema,
  type CreateProjectInput,
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

import { useCreateProject } from "../hooks/use-create-project";

/**
 * Converts project name → URL-safe slug
 */
function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),

    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  const mutation = useCreateProject(form, () => {
    setOpen(false);
    form.reset();
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
    }

    setOpen(next);
  }

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          New project
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a project</DialogTitle>

          <DialogDescription>
            Projects organize your work. You can rename or
            delete them later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-5"
            noValidate
          >
            {/* NAME */}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="My New Project"
                      autoComplete="off"
                      disabled={mutation.isPending}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);

                        if (
                          !form.formState.dirtyFields.slug
                        ) {
                          form.setValue(
                            "slug",
                            toSlug(e.target.value),
                            {
                              shouldValidate: true,
                            }
                          );
                        }
                      }}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SLUG */}

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>

                  <FormControl>
                    <Input
                      placeholder="my-new-project"
                      autoComplete="off"
                      disabled={mutation.isPending}
                      {...field}
                    />
                  </FormControl>

                  <p className="text-xs text-muted-foreground">
                    Used in URLs. Only lowercase letters,
                    numbers, and hyphens.
                  </p>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DESCRIPTION */}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description (optional)
                  </FormLabel>

                  <FormControl>
                    <Textarea
                      placeholder="What is this project about?"
                      rows={3}
                      disabled={mutation.isPending}
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* FOOTER */}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  handleOpenChange(false);
                }}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="gap-2"
              >
                {mutation.isPending && (
                  <Loader2
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}

                {mutation.isPending
                  ? "Creating..."
                  : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}