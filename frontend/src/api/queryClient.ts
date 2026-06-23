import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@api/client';

/** App-wide QueryClient with conservative defaults. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min before refetch on mount
      gcTime: 5 * 60_000, // 5 min cache retention
      // Retry once, but never on 4xx — client errors won't succeed on retry.
      retry: (failureCount, error) =>
        failureCount < 1 &&
        !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
