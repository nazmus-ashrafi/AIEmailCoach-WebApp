"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Data is considered fresh for 30 seconds
                        staleTime: 30 * 1000,
                        // Cache data for 5 minutes
                        gcTime: 5 * 60 * 1000,
                        // Retry failed requests 3 times with exponential backoff
                        retry: 3,
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
                        // Refetch on window focus to keep data fresh
                        refetchOnWindowFocus: true,
                        // Don't refetch on mount if data is still fresh
                        refetchOnMount: false,
                    },
                    mutations: {
                        // Retry mutations once on failure
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* DevTools only in development */}
            {process.env.NODE_ENV === "development" && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </QueryClientProvider>
    );
}
