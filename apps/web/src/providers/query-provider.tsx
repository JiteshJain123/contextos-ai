"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api-client";

/**
 * Create QueryClient
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,

        retry: (failureCount, error) => {
          // Don't retry client errors
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            return false;
          }

          // Retry server/network errors twice
          return failureCount < 2;
        },
      },

      mutations: {
        retry: false,
      },
    },
  });
}

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({
  children,
}: QueryProviderProps) {
  /**
   * Important:
   * useState prevents QueryClient recreation
   * on every render in React strict mode.
   */
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* React Query Devtools */}
      <ReactQueryDevtools
        initialIsOpen={false}
      />
    </QueryClientProvider>
  );
}