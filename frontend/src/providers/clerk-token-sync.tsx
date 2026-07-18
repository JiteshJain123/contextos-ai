"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

import { setTokenGetter } from "@/lib/api-client";

/**
 * Bridges Clerk's session token into the api-client so all fetch calls
 * automatically include Authorization: Bearer <token>.
 *
 * Renders nothing — purely a side-effect component.
 * Must be inside <ClerkProvider> and <QueryProvider>.
 */
export function ClerkTokenSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  return null;
}
