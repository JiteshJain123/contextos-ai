"use client";

import { Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useLogout } from "../hooks/use-logout";

/**
 * Logout button — small client island. Lives in the dashboard topbar.
 */
export function LogoutButton() {
  const { mutate, isPending } = useLogout();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => mutate()}
      disabled={isPending}
      className="gap-1.5 text-muted-foreground hover:text-foreground"
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-3.5" aria-hidden="true" />
      )}
      <span className="text-xs">Sign out</span>
    </Button>
  );
}
