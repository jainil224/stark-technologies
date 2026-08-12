"use client";

import { QueryClient } from "@tanstack/react-query";
import type { ApiError } from "./types";

// Single shared QueryClient. Created once on the client.
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on auth/validation errors — they won't fix themselves.
          const apiError = error as { error?: ApiError };
          const code = apiError?.error?.code;
          if (code === "UNAUTHENTICATED" || code === "FORBIDDEN" || code === "VALIDATION_ERROR") {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserClient: QueryClient | undefined;
export function getQueryClient() {
  if (!browserClient) browserClient = makeQueryClient();
  return browserClient;
}
